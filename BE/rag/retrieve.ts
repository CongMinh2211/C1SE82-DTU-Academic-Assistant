// Mục đích file: Truy xuất bằng chứng từ kho dữ liệu, giữ phạm vi và số trang của đoạn được chọn.
import { row, rows } from "../db";
import { normalize, type SourcePage } from "./parser";
import { embedTexts } from "./embeddings";
import { QueryVectorCache } from "./query-vector-cache";
import { vectors, vectorIndex } from "./vectors";
export type Evidence = {
  id: string;
  chunkId: string;
  documentId: string;
  revisionId: string;
  title: string;
  version: number;
  page: number;
  pageEnd: number;
  section: string;
  text: string;
  scope: string;
  url?: string;
  retrievedAt?: string;
  publishedAt?: string;
  sourceTier?: import("../web-sources").SourceTier;
  assessment?: string;
  discoveredBy?: string;
  score: number;
};
const queryVectors = new QueryVectorCache();
type ChunkRow = {
  id: string;
  document_id: string;
  revision_id: string;
  title: string;
  version: number;
  page: number;
  page_end: number;
  section: string;
  text: string;
  scope: string;
  source_url: string | null;
  search_text: string;
};
const select = `SELECT c.*,r.title_snapshot title,r.scope_snapshot scope,r.source_url,r.version FROM chunks c JOIN documents d ON d.id=c.document_id JOIN revisions r ON r.id=c.revision_id WHERE d.deleted_at IS NULL AND d.active_revision=c.revision_id`;
// Nhận diện câu hỏi về học phí, kể cả cách hỏi giá một tín chỉ.
export function tuitionQuestion(question: string) {
  const text = normalize(question);
  return (
    /hoc phi|tuition|(?:credit|semester) fee|cost per credit/.test(text) ||
    (/\b(?:1|mot|moi)\s+tin(?:\s+chi)?\b/.test(text) &&
      /\b(?:bao nhieu|gia|phi|tien|cost|price)\b/.test(text) &&
      !/\b(?:gio|tiet|hours?)\b/.test(text))
  );
}
export function questionCohort(question: string) {
  return questionCohorts(question)[0];
}
export function questionCohorts(question: string) {
  return [
    ...new Set(
      [
        ...normalize(question).matchAll(/\bk\s*(\d{2})\b|\bkhoa\s*(\d{2})\b/g),
      ].map((match) => match[1] || match[2]),
    ),
  ];
}
export function questionMajorCodes(question: string) {
  return [
    ...new Set(
      [...question.matchAll(/\b\d{3}(?:\s*\([A-Za-z]+\))?(?![\w(])/g)]
        .filter(
          (match) =>
            !/^\s*(?:tin chi|credits?|dong|vnd|ngay|days?|%|hours?)/.test(
              normalize(question.slice((match.index || 0) + match[0].length)),
            ),
        )
        .map((match) => match[0].replace(/\s/g, "").toLowerCase()),
    ),
  ];
}
function expand(question: string) {
  const text = normalize(question);
  const synonyms: [RegExp, string][] = [
    [/tuition|fees?/g, "hoc phi don gia tin chi hoc ky"],
    [/graduat|diploma|degree/g, "tot nghiep dieu kien"],
    [/register|enrol|course/g, "dang ky hoc phan"],
    [/grade|score|gpa/g, "diem trung binh tich luy"],
    [/prerequisite/g, "tien quyet"],
    [/withdraw/g, "rut huy bo dang ky"],
    [/english|ielts|toeic/g, "ngoai ngu chung chi"],
  ];
  return (
    text +
    " " +
    (tuitionQuestion(question) ? "hoc phi don gia tin chi " : "") +
    synonyms
      .filter(([re]) => re.test(text))
      .map(([, words]) => words)
      .join(" ")
  );
}
// Prose clauses often continue across a page or a list. Keep table rows atomic,
// but give the agent whole source pages so a matching heading cannot hide the
// remaining conditions. Citation text is taken verbatim from saved pages.
export function withPageContext(
  anchors: Evidence[],
  pagesByRevision: Map<string, SourcePage[]>,
): Evidence[] {
  const seen = new Set<string>();
  let characters = 0;
  const result: Evidence[] = [];
  for (const anchor of anchors) {
    const tableRow = /^\d+\s*\|/m.test(anchor.text);
    const pages = (pagesByRevision.get(anchor.revisionId) || []).filter(
      (p) => p.page >= anchor.page && p.page <= anchor.pageEnd,
    );
    const text = pages.map((p) => p.text).join("\n\n");
    const expanded =
      !tableRow &&
      text &&
      !pages.some((p) => /^\d+\s*\|/m.test(p.text)) &&
      text.length <= 14000 &&
      characters + text.length <= 60000;
    const key = expanded
      ? `${anchor.revisionId}:${anchor.page}-${anchor.pageEnd}`
      : anchor.chunkId;
    if (seen.has(key)) continue;
    seen.add(key);
    characters += expanded ? text.length : anchor.text.length;
    result.push({ ...anchor, text: expanded ? text : anchor.text });
  }
  return result;
}
// Tìm dòng học phí theo khóa và mã ngành để hạn chế nhầm giữa các chương trình.
export async function exactTuitionEvidence(
  question: string,
): Promise<Evidence[]> {
  const codes = questionMajorCodes(question);
  if (!codes.length) return [];
  const exact = await rows<ChunkRow>(
    `${select} AND (${codes.map(() => "c.text LIKE ?").join(" OR ")}) ORDER BY c.id`,
    ...codes.map((code) => `%| ${code.toUpperCase()} |%`),
  );
  return exact.map((c, i) => ({
    id: `S${i + 1}`,
    chunkId: c.id,
    documentId: c.document_id,
    revisionId: c.revision_id,
    title: c.title,
    version: c.version,
    page: c.page,
    pageEnd: c.page_end,
    section: c.section,
    text: c.text,
    scope: c.scope,
    ...(c.source_url ? { url: c.source_url } : {}),
    score: 1,
  }));
}

// Kết hợp các cách tìm kiếm để lấy những đoạn nguồn liên quan đến câu hỏi.
export async function retrieve(question: string): Promise<Evidence[]> {
  // Chỉ đưa các phiên bản đang hoạt động vào tập tìm kiếm của sinh viên.
  const active = (
    await rows<{
      active_revision: string;
    }>(
      "SELECT active_revision FROM documents WHERE deleted_at IS NULL AND active_revision IS NOT NULL",
    )
  ).map((r) => r.active_revision);
  if (!active.length) return [];
  const query = expand(question),
    cohorts = questionCohorts(question),
    majorCodes = questionMajorCodes(question);
  const terms = [...new Set(query.match(/[a-z0-9]{2,}/g) || [])]
    .filter(
      (t) =>
        ![
          "la",
          "gi",
          "em",
          "toi",
          "the",
          "and",
          "can",
          "what",
          "how",
          "cho",
          "cua",
          "bao",
          "nhieu",
          "xin",
          "minh",
          "duoc",
          "voi",
        ].includes(t),
    )
    .slice(0, 36);
  // Tìm theo từ khóa trước để giữ các thuật ngữ và mã ngành xuất hiện chính xác.
  const scores = new Map<string, number>();
  let lexical: {
    id: string;
  }[] = [];
  if (terms.length)
    lexical = await rows<{
      id: string;
    }>(
      `SELECT id FROM chunks_fts WHERE chunks_fts MATCH ? ORDER BY bm25(chunks_fts) LIMIT 100`,
      terms.map((t) => `"${t}"`).join(" OR "),
    );
  lexical.forEach((r, i) => scores.set(r.id, 1 / (40 + i)));
  // Tìm theo ngữ nghĩa để hỗ trợ cách diễn đạt khác từ ngữ trong tài liệu.
  // Vector của cùng câu hỏi được tái sử dụng ngắn hạn; nguồn vẫn luôn tìm lại từ dữ liệu đang công bố.
  const queryVector = await queryVectors.get(
    question,
    async () => (await embedTexts([question], "query"))[0],
  );
  const vectorStore = await vectors();
  const semantic = await vectorStore.query({
    indexName: vectorIndex,
    queryVector,
    topK: 100,
    filter: { revisionId: { $in: active } },
  });
  semantic.forEach((r, i) => {
    if (r.score >= 0.66)
      scores.set(r.id, (scores.get(r.id) || 0) + 1 / (40 + i));
  });
  const semanticScores = new Map(semantic.map((r) => [r.id, r.score]));
  const candidates: Evidence[] = [];
  // Ghép điểm hai cách tìm, rồi đọc lại các đoạn thuộc phiên bản đang hoạt động.
  const matchedIds = [...scores.keys()];
  const matched = matchedIds.length
    ? await rows<ChunkRow>(
        `${select} AND c.id IN (${matchedIds.map(() => "?").join(",")})`,
        ...matchedIds,
      )
    : [];
  const byId = new Map(matched.map((c) => [c.id, c]));
  // Exact programme rows must not depend on being in a semantic/FTS top-100
  // window. A paraphrased follow-up can otherwise lose a row we actually hold.
  if (tuitionQuestion(question) && majorCodes.length) {
    const exact = await rows<ChunkRow>(
      `${select} AND (${majorCodes.map(() => "c.text LIKE ?").join(" OR ")})`,
      ...majorCodes.map((code) => `%| ${code.toUpperCase()} |%`),
    );
    for (const c of exact) {
      byId.set(c.id, c);
      scores.set(c.id, (scores.get(c.id) || 0) + 0.2);
    }
  }
  for (const [chunkId, score] of scores) {
    const c = byId.get(chunkId);
    if (!c) continue;
    if (
      tuitionQuestion(question) &&
      cohorts.length &&
      /hoc phi/.test(normalize(c.title)) &&
      !cohorts.some((cohort) =>
        new RegExp(`\\bk${cohort}\\b`).test(normalize(c.title)),
      )
    )
      continue;
    const lexicalHits = terms.filter((t) => c.search_text.includes(t)).length;
    if (lexicalHits < 2 && (semanticScores.get(chunkId) || 0) < 0.81) continue;
    const rowCode = c.text
      .split("\n")
      .find((line) => /^\d+\s*\|/.test(line))
      ?.split("|")[2]
      ?.trim();
    if (
      tuitionQuestion(question) &&
      majorCodes.length &&
      rowCode &&
      !majorCodes.includes(rowCode.replace(/\s/g, "").toLowerCase())
    )
      continue;
    const exactBoost =
      rowCode && majorCodes.includes(rowCode.replace(/\s/g, "").toLowerCase())
        ? 0.1
        : 0;
    candidates.push({
      id: "",
      chunkId: c.id,
      documentId: c.document_id,
      revisionId: c.revision_id,
      title: c.title,
      version: c.version,
      page: c.page,
      pageEnd: c.page_end,
      section: c.section,
      text: c.text,
      scope: c.scope,
      ...(c.source_url ? { url: c.source_url } : {}),
      score: score + exactBoost,
    });
  }
  const article = normalize(question).match(
    /\b(?:dieu|article)\s+(\d+)\b/,
  )?.[1];
  if (article) {
    for (const candidate of candidates)
      if (new RegExp(`^dieu ${article}\\.`).test(normalize(candidate.section)))
        candidate.score += 0.15;
  }
  candidates.sort((a, b) => b.score - a.score);
  const chosen = candidates.slice(0, 10);
  // A provision selected near a page boundary needs its continuation, rather
  // than an unrelated globally ranked clause. Only read the same live revision.
  for (const anchor of [...chosen]) {
    if (!anchor.section || /^\d+\s*\|/m.test(anchor.text)) continue;
    const tail = await row<ChunkRow>(
      `${select} AND c.revision_id=? AND c.page=? ORDER BY c.rowid DESC LIMIT 1`,
      anchor.revisionId,
      anchor.pageEnd,
    );
    const next = await row<ChunkRow>(
      `${select} AND c.revision_id=? AND c.page=? ORDER BY c.rowid LIMIT 1`,
      anchor.revisionId,
      anchor.pageEnd + 1,
    );
    const continuation =
      tail?.section && next?.section === tail.section ? next : undefined;
    if (
      continuation &&
      !chosen.some(
        (c) =>
          c.revisionId === continuation.revision_id &&
          c.page === continuation.page,
      )
    )
      chosen.push({
        ...anchor,
        chunkId: continuation.id,
        page: continuation.page,
        pageEnd: continuation.page_end,
        text: continuation.text,
      });
  }
  // Include binding transition provisions alongside the general regulation.
  if (chosen.some((c) => c.title === "Quy chế đào tạo trình độ đại học")) {
    const transition = (
      await rows<ChunkRow>(
        `${select} AND d.title='Quy chế đào tạo trình độ đại học' AND c.page>=23 ORDER BY c.page,c.id`,
      )
    ).filter((c) =>
      /Điều 27|áp dụng đối với khóa|khóa tuyển sinh|chuyển tiếp/.test(c.text),
    );
    for (const c of transition.slice(0, 2))
      if (!chosen.some((x) => x.chunkId === c.id))
        chosen.push({
          id: "",
          chunkId: c.id,
          documentId: c.document_id,
          revisionId: c.revision_id,
          title: c.title,
          version: c.version,
          page: c.page,
          pageEnd: c.page_end,
          section: c.section,
          text: c.text,
          scope: c.scope,
          score: 0,
        });
  }
  const parents = new Map<string, SourcePage[]>();
  for (const revisionId of new Set(chosen.map((c) => c.revisionId))) {
    const revision = await row<{
      pages_json: string;
    }>("SELECT pages_json FROM revisions WHERE id=?", revisionId);
    parents.set(revisionId, JSON.parse(revision?.pages_json || "[]"));
  }
  return withPageContext(chosen, parents).map((c, i) => ({
    ...c,
    id: `S${i + 1}`,
  }));
}
