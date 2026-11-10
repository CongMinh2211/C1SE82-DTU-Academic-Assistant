// Mục đích file: Tiếp nhận, lập chỉ mục, xuất bản và quản lý các phiên bản tài liệu học vụ.
import { createHash } from "node:crypto";
import path from "node:path";
import { pdfParser } from "./pdf";
import { maxUploadBytes } from "./config";
import { readSource, writeSource } from "./source-storage";
export { sourcePath } from "./source-storage";
import { db, row, rows, now, id, audit } from "./db";
import { chunkPages, type SourcePage } from "./rag/parser";
import { embedTexts } from "./rag/embeddings";
import { vectors, vectorIndex } from "./rag/vectors";
import { HttpError } from "./http";
import { readableHtml } from "./official-web";
import { docxMime } from "./document-format";
import { extractDocx } from "./docx-extract";
export type Revision = {
  id: string;
  document_id: string;
  version: number;
  raw_path: string;
  mime: string;
  status: string;
  pages_json: string | null;
  title: string;
  scope: string;
  source_kind: string;
};
export { documentList } from "./queries/documents";
// Lưu phiên bản tài liệu mới để xử lý; chưa thay thế nội dung đang phục vụ sinh viên.
export async function saveRevision(
  input: {
    initialId?: string;
    documentId?: string;
    title: string;
    topic: string;
    scope: string;
    kind: string;
    url?: string;
    filename: string;
    mime: string;
    bytes: Buffer;
    pages?: SourcePage[];
  },
  actor: string,
) {
  // Kiểm tra kích thước và xác định tài liệu đích trước khi ghi dữ liệu.
  if (!input.bytes.length || input.bytes.length > maxUploadBytes)
    throw new HttpError(400, "Tài liệu trống hoặc lớn hơn 20 MB.");
  const docId = input.documentId || input.initialId || id(),
    revisionId = id();
  if (
    input.documentId &&
    !(await row(
      "SELECT id FROM documents WHERE id=? AND deleted_at IS NULL",
      docId,
    ))
  )
    throw new HttpError(404, "Không tìm thấy tài liệu.");
  // Hash nội dung để phát hiện phiên bản trùng trong cùng tài liệu.
  const hash = createHash("sha256").update(input.bytes).digest("hex");
  const duplicate = await row<{
    id: string;
  }>(
    "SELECT id FROM revisions WHERE document_id=? AND sha256=? AND status NOT IN ('failed','superseded')",
    docId,
    hash,
  );
  if (duplicate)
    throw new HttpError(
      409,
      "Nội dung này đã có trong tài liệu. Bạn có thể lập chỉ mục lại phiên bản hiện tại.",
    );
  const relative = `sources/${revisionId}${input.mime === "application/pdf" ? ".pdf" : input.mime === "text/html" ? ".html" : input.mime === docxMime ? ".docx" : ".txt"}`;
  // Lưu file gốc, rồi ghi tài liệu, phiên bản và công việc lập chỉ mục trong một giao dịch.
  await writeSource(relative, input.bytes, input.mime);
  await db().transaction(async () => {
    const timestamp = now();
    if (!input.documentId)
      await db()
        .prepare(
          "INSERT INTO documents (id,title,topic,source_kind,source_url,original_name,scope,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)",
        )
        .run(
          docId,
          input.title,
          input.topic,
          input.kind,
          input.url || null,
          path.basename(input.filename),
          input.scope,
          timestamp,
          timestamp,
        );
    else
      await db()
        .prepare(
          "UPDATE documents SET title=?,topic=?,scope=?,source_kind=?,source_url=?,original_name=?,updated_at=? WHERE id=?",
        )
        .run(
          input.title,
          input.topic,
          input.scope,
          input.kind,
          input.url || null,
          path.basename(input.filename),
          timestamp,
          docId,
        );
    // Tăng số phiên bản theo tài liệu; bản đang công bố chưa bị thay thế ở bước này.
    const version =
      ((
        await row<{
          n: number;
        }>("SELECT MAX(version) n FROM revisions WHERE document_id=?", docId)
      )?.n || 0) + 1;
    await db()
      .prepare(
        "INSERT INTO revisions(id,document_id,version,sha256,raw_path,mime,title_snapshot,scope_snapshot,source_url,pages_json,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
      )
      .run(
        revisionId,
        docId,
        version,
        hash,
        relative,
        input.mime,
        input.title,
        input.scope,
        input.url || null,
        input.pages ? JSON.stringify(input.pages) : null,
        timestamp,
      );
    await db()
      .prepare("INSERT INTO jobs(id,revision_id,created_at) VALUES (?,?,?)")
      .run(id(), revisionId, timestamp);
    await audit(actor, "document.revision_created", docId, {
      revisionId,
      version,
      sha256: hash,
    });
  })();
  // Với Vercel, chuyển công việc sang hàng đợi cloud; môi trường local dùng worker riêng.
  if (process.env.INDEXING_MODE === "vercel_queue") {
    const { enqueueRevision } = await import("./cloud-index");
    await enqueueRevision(revisionId);
  }
  return { documentId: docId, revisionId };
}
// Chỉ công bố phiên bản đã lập chỉ mục thành công và ghi nhận người thực hiện.
export async function publishRevision(revisionId: string, actor: string) {
  await db().transaction(async () => {
    const revision = await row<{
      document_id: string;
      status: string;
      version: number;
    }>(
      "SELECT r.* FROM revisions r JOIN documents d ON d.id=r.document_id WHERE r.id=? AND d.deleted_at IS NULL",
      revisionId,
    );
    if (!revision || !["ready", "published"].includes(revision.status))
      throw new HttpError(409, "Tài liệu chưa được lập chỉ mục thành công.");
    await db()
      .prepare(
        "UPDATE revisions SET status='superseded' WHERE document_id=? AND status='published' AND id<>?",
      )
      .run(revision.document_id, revisionId);
    await db()
      .prepare(
        "UPDATE revisions SET status='published',published_at=? WHERE id=?",
      )
      .run(now(), revisionId);
    await db()
      .prepare("UPDATE documents SET active_revision=?,updated_at=? WHERE id=?")
      .run(revisionId, now(), revision.document_id);
    await db()
      .prepare(
        "UPDATE faqs SET status='draft',updated_at=? WHERE status='published' AND source_chunk IN (SELECT id FROM chunks WHERE document_id=? AND revision_id<>?)",
      )
      .run(now(), revision.document_id, revisionId);
    await audit(actor, "document.published", revision.document_id, {
      revisionId,
      version: revision.version,
    });
  })();
}
// Đưa yêu cầu lập chỉ mục lại vào hàng đợi, giữ nguồn cũ trong lúc xử lý.
export async function queueReindex(revisionId: string, actor: string) {
  const newRevision = await db().transaction(async () => {
    const r = await row<Revision>(
      "SELECT r.*,r.title_snapshot title,r.scope_snapshot scope FROM revisions r JOIN documents d ON d.id=r.document_id WHERE r.id=? AND d.deleted_at IS NULL",
      revisionId,
    );
    if (!r) throw new HttpError(404, "Không tìm thấy phiên bản.");
    if (
      await row(
        "SELECT id FROM jobs WHERE revision_id=? AND status IN ('queued','running')",
        revisionId,
      )
    )
      throw new HttpError(409, "Tài liệu đang được xử lý.");
    // A rebuild is a new generation. Existing published chunks remain available until approval.
    const newId = id(),
      version =
        ((
          await row<{
            n: number;
          }>(
            "SELECT MAX(version) n FROM revisions WHERE document_id=?",
            r.document_id,
          )
        )?.n || 0) + 1;
    await db()
      .prepare(
        "INSERT INTO revisions(id,document_id,version,sha256,raw_path,mime,title_snapshot,scope_snapshot,source_url,pages_json,created_at) SELECT ?,document_id,?,sha256,raw_path,mime,title_snapshot,scope_snapshot,source_url,pages_json,? FROM revisions WHERE id=?",
      )
      .run(newId, version, now(), revisionId);
    await db()
      .prepare("INSERT INTO jobs(id,revision_id,created_at) VALUES (?,?,?)")
      .run(id(), newId, now());
    await audit(actor, "document.reindex_queued", r.document_id, {
      revisionId: newId,
    });
    return newId;
  })();
  if (process.env.INDEXING_MODE === "vercel_queue") {
    const { enqueueRevision } = await import("./cloud-index");
    await enqueueRevision(newRevision);
  }
}
// Trích nội dung theo từng trang PDF hoặc đọc văn bản UTF-8 để giữ vị trí dẫn nguồn.
export async function extract(revision: Revision) {
  if (revision.pages_json)
    return JSON.parse(revision.pages_json) as SourcePage[];
  const bytes = await readSource(revision.raw_path);
  if (revision.mime === docxMime) {
    // DOCX không có số trang ổn định: lưu toàn bộ chữ ở vị trí tổng hợp, không giả vờ định vị trang.
    const text = await extractDocx(bytes);
    return [{ page: 1, text }];
  }
  if (revision.mime === "application/pdf") {
    if (!bytes.subarray(0, 5).equals(Buffer.from("%PDF-")))
      throw new Error("Chữ ký PDF không hợp lệ.");
    const parser = await pdfParser(new Uint8Array(bytes));
    try {
      const result = await parser.getText();
      if (result.total > 300)
        throw new Error("Giới hạn 300 trang mỗi tài liệu.");
      if (result.pages.some((p) => p.text.trim().length < 25))
        throw new Error(
          "Có trang không trích xuất được văn bản. Cần OCR và rà soát trước khi đưa vào kho.",
        );
      return result.pages.map((p) => ({ page: p.num, text: p.text }));
    } finally {
      await parser.destroy();
    }
  }
  if (revision.mime === "text/html")
    return [{ page: 1, text: readableHtml(bytes.toString("utf8")).text }];
  return [
    { page: 1, text: new TextDecoder("utf-8", { fatal: true }).decode(bytes) },
  ];
}
// Worker nhận một công việc, chia đoạn và lưu vector; lỗi được ghi lại để quản trị viên kiểm tra.
export async function runNextJob() {
  // Thu hồi các job bị mất liên lạc; sau ba lần gián đoạn thì chuyển sang lỗi.
  const job = await db().transaction(async () => {
    await db()
      .prepare(
        "UPDATE jobs SET status='queued',stage='queued',lease_until=NULL WHERE status='running' AND lease_until<? AND attempts<3",
      )
      .run(Date.now());
    await db()
      .prepare(
        "UPDATE jobs SET status='failed',error='Tiến trình bị gián đoạn quá 3 lần.',finished_at=? WHERE status='running' AND lease_until<? AND attempts>=3",
      )
      .run(now(), Date.now());
    await db()
      .prepare(
        "UPDATE revisions SET status='failed',error='Tiến trình lập chỉ mục bị gián đoạn quá giới hạn.' WHERE status='queued' AND id IN (SELECT revision_id FROM jobs WHERE status='failed')",
      )
      .run();
    // Lấy job chờ cũ nhất và đánh dấu đang chạy trong cùng giao dịch.
    const next = await row<{
      id: string;
      revision_id: string;
    }>(
      "SELECT id,revision_id FROM jobs WHERE status='queued' ORDER BY created_at LIMIT 1",
    );
    if (!next) return null;
    await db()
      .prepare(
        "UPDATE jobs SET status='running',stage='extracting',progress=5,attempts=attempts+1,lease_until=?,started_at=? WHERE id=?",
      )
      .run(Date.now() + 90000, now(), next.id);
    return next;
  })();
  if (!job) return false;
  // Gia hạn quyền xử lý định kỳ để worker khác không nhận nhầm job đang chạy.
  const heartbeat = setInterval(
    async () =>
      await db()
        .prepare(
          "UPDATE jobs SET lease_until=? WHERE id=? AND status='running'",
        )
        .run(Date.now() + 90000, job.id),
    20000,
  );
  const update = async (stage: string, progress: number) =>
    await db()
      .prepare("UPDATE jobs SET stage=?,progress=? WHERE id=?")
      .run(stage, progress, job.id);
  try {
    const revision = (await row<Revision>(
      "SELECT r.*,r.title_snapshot title,r.scope_snapshot scope,d.source_kind FROM revisions r JOIN documents d ON d.id=r.document_id WHERE r.id=?",
      job.revision_id,
    ))!;
    // Trích trang, kiểm tra có đủ chữ rồi mới chia nội dung thành các đoạn có số trang.
    const pages = await extract(revision);
    if (!pages.length || pages.every((p) => p.text.trim().length < 25))
      throw new Error("Không có đủ văn bản để lập chỉ mục.");
    await update("chunking", 15);
    const chunks = await chunkPages(
      pages,
      revision.title,
      revision.scope,
      revision.id,
    );
    const vectorStore = await vectors();
    // ID đoạn ổn định giúp lần xử lý lại cập nhật vector thay vì tạo bản trùng.
    for (let i = 0; i < chunks.length; i += 16) {
      await update("embedding", 20 + Math.round((65 * i) / chunks.length));
      const batch = chunks.slice(i, i + 16);
      const embeddings = await embedTexts(
        batch.map((c) => `${revision.title}\n${c.section}\n${c.text}`),
        "passage",
      );
      // Lưu vector cùng mã phiên bản và số trang để giới hạn kết quả theo nguồn đang duyệt.
      await vectorStore.upsert({
        indexName: vectorIndex,
        ids: batch.map((c) => c.id),
        vectors: embeddings,
        metadata: batch.map((c) => ({
          revisionId: revision.id,
          documentId: revision.document_id,
          page: c.page,
        })),
      });
    }
    await update("saving", 90);
    // Thay chỉ mục văn bản của phiên bản trong giao dịch, sau đó đánh dấu sẵn sàng để duyệt.
    await db().transaction(async () => {
      const old = await rows<{
        id: string;
      }>("SELECT id FROM chunks WHERE revision_id=?", revision.id);
      for (const c of old)
        await db().prepare("DELETE FROM chunks_fts WHERE id=?").run(c.id);
      await db()
        .prepare("DELETE FROM chunks WHERE revision_id=?")
        .run(revision.id);
      for (const c of chunks) {
        await db()
          .prepare("INSERT INTO chunks VALUES (?,?,?,?,?,?,?,?,?)")
          .run(
            c.id,
            revision.id,
            revision.document_id,
            c.page,
            c.pageEnd,
            c.section,
            c.text,
            c.searchText,
            JSON.stringify({ scope: revision.scope }),
          );
        await db()
          .prepare("INSERT INTO chunks_fts(id,text) VALUES (?,?)")
          .run(c.id, c.searchText);
      }
      await db()
        .prepare(
          "UPDATE revisions SET pages_json=?,chunk_count=?,status='ready',error=NULL WHERE id=?",
        )
        .run(JSON.stringify(pages), chunks.length, revision.id);
      await db()
        .prepare(
          "UPDATE jobs SET status='done',stage='ready',progress=100,error=NULL,lease_until=NULL,finished_at=? WHERE id=?",
        )
        .run(now(), job.id);
      await audit(null, "knowledge.indexed", revision.document_id, {
        revisionId: revision.id,
        pages: pages.length,
        chunks: chunks.length,
      });
    })();
  } catch (error) {
    // Lưu thông báo an toàn cho quản trị viên, không trả chi tiết lỗi nội bộ tùy ý.
    const message =
      error instanceof Error &&
      /OCR|PDF|trang|văn bản|UTF-8/.test(error.message)
        ? error.message.slice(0, 300)
        : "Lập chỉ mục thất bại. Kiểm tra tiến trình và thử lập chỉ mục lại.";
    await db()
      .prepare("UPDATE revisions SET status='failed',error=? WHERE id=?")
      .run(message, job.revision_id);
    await db()
      .prepare(
        "UPDATE jobs SET status='failed',error=?,lease_until=NULL,finished_at=? WHERE id=?",
      )
      .run(message, now(), job.id);
    console.error(
      JSON.stringify({
        event: "index_failed",
        job: job.id,
        type: error instanceof Error ? error.name : "unknown",
      }),
    );
  } finally {
    clearInterval(heartbeat);
  }
  return true;
}
