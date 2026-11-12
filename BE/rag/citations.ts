// Mục đích file: Chuyển đoạn bằng chứng thành cấu trúc trích dẫn có tài liệu, phiên bản và số trang.
import type { Citation } from "@/lib/contracts";
import type { Evidence } from "./retrieve";
export function citationFromEvidence(source: Evidence, id: string): Citation {
  // Giữ ID đoạn, phiên bản và trang; chỉ thêm metadata web khi nguồn cung cấp.
  return {
    id,
    chunkId: source.chunkId,
    documentId: source.documentId,
    revisionId: source.revisionId,
    title: source.title,
    version: source.version,
    page: source.page,
    pageEnd: source.pageEnd,
    section: source.section,
    quote: source.text,
    scope: source.scope,
    ...(source.url ? { url: source.url } : {}),
    ...(source.retrievedAt ? { retrievedAt: source.retrievedAt } : {}),
    ...(source.publishedAt ? { publishedAt: source.publishedAt } : {}),
    ...(source.sourceTier ? { sourceTier: source.sourceTier } : {}),
    ...(source.assessment ? { assessment: source.assessment } : {}),
    ...(source.discoveredBy ? { discoveredBy: source.discoveredBy } : {}),
  };
}
