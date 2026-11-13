// Mục đích file: Kiểm thử: Giữ ngữ cảnh của đoạn nguồn và tránh trộn dữ liệu giữa các phiên bản.
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { parseConsolidated } from "../../BE/rag/parser";
import { withPageContext, type Evidence } from "../../BE/rag/retrieve";

// Đoạn ngữ cảnh tốt nghiệp phải giữ các điều kiện liên quan trên trang nguồn.
test("graduation context retains every condition on the source page, not only a matching heading", async () => {
  const sources = parseConsolidated(
    await readFile("knowledge/originals/Tailieu_AI_Tong_hop.txt", "utf8"),
  );
  const source = sources.find((s) => s.sourceId === "TL02")!;
  const anchor: Evidence = {
    id: "S1",
    chunkId: "heading",
    documentId: "TL02",
    revisionId: "rev",
    title: source.title,
    version: 1,
    page: 6,
    pageEnd: 6,
    section: "4. XÉT CÔNG NHẬN TỐT NGHIỆP VÀ CẤP BẰNG",
    text: "Sinh viên đủ các điều kiện sau đây thuộc diện xét công nhận tốt nghiệp:",
    scope: source.scope,
    score: 1,
  };
  const [context] = withPageContext(
    [anchor, { ...anchor, chunkId: "another-condition" }],
    new Map([["rev", source.pages]]),
  );
  assert.equal(context.text, source.pages[5].text);
  for (const phrase of [
    "5.5",
    "2.00",
    "giáo dục quốc phòng",
    "giáo dục thể chất",
    "Tiếng Anh và Tin học",
    "Trung bình",
  ])
    assert.ok(context.text.includes(phrase), phrase);
  assert.equal(
    withPageContext([anchor, anchor], new Map([["rev", source.pages]])).length,
    1,
  );
});

// Không ghép dữ liệu học phí từ các dòng hoặc phiên bản tài liệu khác nhau.
test("parent context does not mix tuition rows or revisions", () => {
  const row: Evidence = {
    id: "S1",
    chunkId: "row-102",
    documentId: "TL08",
    revisionId: "active",
    title: "Học phí",
    version: 1,
    page: 2,
    pageEnd: 2,
    section: "I",
    text: "STT | Chuyên ngành | Mã chuyên ngành\n1 | Công nghệ Phần mềm | 102",
    scope: "K31",
    score: 1,
  };
  const result = withPageContext(
    [row],
    new Map([
      ["old", [{ page: 2, text: "Different revision" }]],
      ["active", [{ page: 2, text: "Other programme rows" }]],
    ]),
  );
  assert.equal(result[0].text, row.text);
  assert.equal(result[0].revisionId, "active");
});
