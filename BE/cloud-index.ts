// Mục đích file: Điều phối các bước lập chỉ mục tài liệu khi ứng dụng dùng môi trường cloud.
import { send } from "@vercel/queue";
import { db, row, rows, now, audit } from "./db";
import { extract, type Revision } from "./knowledge";
import { chunkPages } from "./rag/parser";
import { embedTexts } from "./rag/embeddings";
import { vectors, vectorIndex } from "./rag/vectors";

export async function enqueueRevision(revisionId: string) {
  const state = await row<{ cursor: number }>(
    "SELECT cursor FROM cloud_index_runs WHERE revision_id=?",
    revisionId,
  );
  await send(
    "dtu-document-index",
    { revisionId },
    {
      idempotencyKey: `${revisionId}:${state?.cursor || 0}`,
      retentionSeconds: 604800,
    },
  );
}
export async function recoverQueuedJobs() {
  if (process.env.INDEXING_MODE !== "vercel_queue") return;
  const pending = await rows<{ revision_id: string }>(
    "SELECT revision_id FROM jobs WHERE status='queued' OR (status='running' AND lease_until<?) ORDER BY created_at LIMIT 20",
    Date.now(),
  );
  for (const job of pending) await enqueueRevision(job.revision_id);
}

// Each delivery embeds at most 32 chunks. Progress is durable between Functions.
export async function cloudIndexStep(revisionId: string): Promise<boolean> {
  const job = await db().transaction(async () => {
    const found = await row<{
      id: string;
      status: string;
      lease_until: number | null;
      attempts: number;
    }>(
      "SELECT * FROM jobs WHERE revision_id=? ORDER BY created_at DESC LIMIT 1",
      revisionId,
    );
    if (!found || ["done", "failed"].includes(found.status)) return null;
    if (found.status === "running" && (found.lease_until || 0) > Date.now())
      throw new Error("Indexing lease is busy");
    await db()
      .prepare(
        "UPDATE jobs SET status='running',stage='extracting',lease_until=?,started_at=coalesce(started_at,?) WHERE id=?",
      )
      .run(Date.now() + 240000, now(), found.id);
    await db()
      .prepare(
        "INSERT INTO cloud_index_runs(revision_id) VALUES(?) ON CONFLICT(revision_id) DO NOTHING",
      )
      .run(revisionId);
    return found;
  })();
  if (!job) return false;
  try {
    const revision = await row<Revision>(
      "SELECT r.*,r.title_snapshot title,r.scope_snapshot scope,d.source_kind FROM revisions r JOIN documents d ON d.id=r.document_id WHERE r.id=?",
      revisionId,
    );
    if (!revision) throw new Error("Missing revision");
    let state = (await row<{ cursor: number; prepared: boolean }>(
      "SELECT cursor,prepared FROM cloud_index_runs WHERE revision_id=?",
      revisionId,
    ))!;
    if (!state.prepared) {
      const pages = await extract(revision);
      if (!pages.length || pages.every((p) => p.text.trim().length < 25))
        throw new Error("Không có đủ văn bản để lập chỉ mục.");
      const chunks = await chunkPages(
        pages,
        revision.title,
        revision.scope,
        revision.id,
      );
      await db().transaction(async () => {
        for (let i = 0; i < chunks.length; i += 100) {
          const batch = chunks.slice(i, i + 100);
          const values = batch.flatMap((c) => [
            c.id,
            revision.id,
            revision.document_id,
            c.page,
            c.pageEnd,
            c.section,
            c.text,
            c.searchText,
            JSON.stringify({ scope: revision.scope }),
          ]);
          await db()
            .prepare(
              `INSERT INTO chunks(id,revision_id,document_id,page,page_end,section,text,search_text,metadata_json) VALUES ${batch.map(() => "(?,?,?,?,?,?,?,?,?)").join(",")} ON CONFLICT(id) DO NOTHING`,
            )
            .run(...values);
          await db()
            .prepare(
              `INSERT INTO chunks_fts(id,text) VALUES ${batch.map(() => "(?,?)").join(",")} ON CONFLICT(id) DO NOTHING`,
            )
            .run(...batch.flatMap((c) => [c.id, c.searchText]));
        }
        await db()
          .prepare("UPDATE revisions SET pages_json=?,chunk_count=? WHERE id=?")
          .run(JSON.stringify(pages), chunks.length, revisionId);
        await db()
          .prepare(
            "UPDATE cloud_index_runs SET prepared=true WHERE revision_id=?",
          )
          .run(revisionId);
      })();
      state = { ...state, prepared: true };
    }
    const batch = await rows<{
      id: string;
      section: string;
      text: string;
      page: number;
    }>(
      "SELECT id,section,text,page FROM chunks WHERE revision_id=? ORDER BY rowid LIMIT 32 OFFSET ?",
      revisionId,
      state.cursor,
    );
    if (batch.length) {
      const embeddings = await embedTexts(
        batch.map((c) => `${revision.title}\n${c.section}\n${c.text}`),
        "passage",
      );
      const store = await vectors();
      await store.upsert({
        indexName: vectorIndex,
        ids: batch.map((c) => c.id),
        vectors: embeddings,
        metadata: batch.map((c) => ({
          revisionId,
          documentId: revision.document_id,
          page: c.page,
        })),
      });
    }
    const count = (await row<{ n: number }>(
      "SELECT count(*) n FROM chunks WHERE revision_id=?",
      revisionId,
    ))!.n;
    const cursor = state.cursor + batch.length,
      more = cursor < count;
    await db().transaction(async () => {
      await db()
        .prepare("UPDATE cloud_index_runs SET cursor=? WHERE revision_id=?")
        .run(cursor, revisionId);
      await db()
        .prepare(
          "UPDATE jobs SET status=?,stage=?,progress=?,lease_until=NULL,error=NULL,finished_at=? WHERE id=?",
        )
        .run(
          more ? "queued" : "done",
          more ? "embedding" : "ready",
          more ? Math.min(95, 15 + Math.round((cursor / count) * 80)) : 100,
          more ? null : now(),
          job.id,
        );
      if (!more) {
        await db()
          .prepare("UPDATE revisions SET status='ready',error=NULL WHERE id=?")
          .run(revisionId);
        await audit(null, "knowledge.indexed", revision.document_id, {
          revisionId,
          chunks: count,
          mode: "cloud_queue",
        });
      }
    })();
    return more;
  } catch (error) {
    const retry = job.attempts + 1 < 3;
    const message =
      error instanceof Error &&
      /OCR|PDF|trang|văn bản|UTF-8/.test(error.message)
        ? error.message.slice(0, 300)
        : "Lập chỉ mục thất bại. Có thể thử lại từ trang kho AI.";
    await db()
      .prepare(
        "UPDATE jobs SET status=?,error=?,lease_until=NULL,attempts=attempts+1 WHERE id=?",
      )
      .run(retry ? "queued" : "failed", message, job.id);
    if (!retry)
      await db()
        .prepare("UPDATE revisions SET status='failed',error=? WHERE id=?")
        .run(message, revisionId);
    if (retry) throw new Error("Retry indexing step");
    return false;
  }
}
