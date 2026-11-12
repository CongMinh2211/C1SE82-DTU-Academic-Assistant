// Mục đích file: Chuẩn hóa văn bản, trích trang và chia đoạn tài liệu; cố gắng giữ nguyên cấu trúc bảng.
import { createHash } from "node:crypto";

export type SourcePage = { page: number; text: string };
export type ParsedSource = {
  sourceId: string;
  title: string;
  filename: string;
  scope: string;
  topic: string;
  pages: SourcePage[];
};
export type SourceChunk = {
  id: string;
  text: string;
  section: string;
  page: number;
  pageEnd: number;
  searchText: string;
};
export function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase();
}

export function parseConsolidated(text: string): ParsedSource[] {
  const headers = [
    ...text.matchAll(
      /^(TL\d{2}) - (.+)\r?\nNguồn: Tailieu_AI\/(.+)\r?\nSố trang PDF: (\d+)/gm,
    ),
  ];
  if (!headers.length)
    throw new Error("Không nhận diện được cấu trúc nguồn TLxx.");
  return headers.map((match, index) => {
    const sourceId = match[1],
      title = match[2],
      filename = match[3];
    const section = text.slice(
      match.index! + match[0].length,
      headers[index + 1]?.index ?? text.length,
    );
    const markers = [
      ...section.matchAll(
        new RegExp(`\\[${sourceId} \\| TRANG PDF (\\d+)\\/(\\d+)\\]`, "g"),
      ),
    ];
    const pages = markers.map((marker, i) => ({
      page: Number(marker[1]),
      text: section
        .slice(
          marker.index! + marker[0].length,
          markers[i + 1]?.index ?? section.length,
        )
        .replace(new RegExp(`\\[KẾT THÚC ${sourceId}\\][\\s\\S]*$`), "")
        .trim(),
    }));
    if (
      pages.length !== Number(match[4]) ||
      pages.some((p, i) => p.page !== i + 1 || !p.text)
    )
      throw new Error(`Nguồn ${sourceId}: thiếu hoặc sai trang PDF.`);
    const cohort = title.match(/khóa (K\d+)/i)?.[1];
    const scope =
      sourceId === "TL01"
        ? "Quy chế chung của Bộ GD&ĐT trong tài liệu được cung cấp. Điều 27 (trang PDF 23–24): áp dụng khóa tuyển sinh năm 2026, tổ chức từ năm học 2026–2027; khóa cũ theo quy chế tại thời điểm thông báo tuyển sinh. Không tự coi là quy định nội bộ DTU cho mọi khóa."
        : sourceId === "TL02"
          ? "Chỉ áp dụng kế hoạch tốt nghiệp hệ chính quy đợt tháng 9/2026; không suy rộng sang đợt khác."
          : sourceId === "TL03"
            ? "Đăng ký học phần Học kỳ I năm học 2026–2027, có phân biệt khóa và chương trình."
            : `Học phí ${cohort}, năm học 2026–2027; đơn vị Đồng. Phân biệt mã chuyên ngành, chương trình, đơn giá tín chỉ và mức học phí/học kỳ. Ô trống giữ nguyên. Quyết định chung 2961/QĐ-ĐHDT lưu tại TL04 trang PDF 1.`;
    return {
      sourceId,
      title,
      filename,
      scope,
      topic: cohort
        ? "Học phí"
        : sourceId === "TL02"
          ? "Tốt nghiệp"
          : "Đăng ký học phần",
      pages,
    };
  });
}

export async function chunkPages(
  pages: SourcePage[],
  title: string,
  scope: string,
  revisionId: string,
): Promise<SourceChunk[]> {
  const { MDocument } = await import("@mastra/rag");
  const chunks: SourceChunk[] = [];
  let section = "",
    tableHeader = "";
  const add = (
    text: string,
    page: number,
    pageEnd: number,
    heading = section,
  ) => {
    if (!text.trim()) return;
    const serial = chunks.length;
    chunks.push({
      id: createHash("sha256")
        .update(`${revisionId}:${serial}:${text}`)
        .digest("hex"),
      text: text.trim(),
      section: heading,
      page,
      pageEnd,
      searchText: normalize(`${title}\n${scope}\n${heading}\n${text}`),
    });
  };
  for (const page of pages) {
    let pageEnd = page.page;
    for (const block of page.text.split(/\n\s*\n/)) {
      if (!block.trim()) continue;
      const cross = block.match(
        /\[NGUỒN ĐOẠN: TL\d+, trang PDF (\d+)-(\d+)\/\d+\]/,
      );
      if (cross) pageEnd = Number(cross[2]);
      if (/^(Điều \d+\.|\d+(?:\.\d+)*\. [A-ZĐ]|[IVX]+\. )/.test(block))
        section = block.split("\n")[0];
      if (block.includes("|")) {
        for (const line of block.split("\n")) {
          if (/^(STT|TT)\s*\|/.test(line)) {
            tableHeader = line;
            continue;
          }
          if (line.includes("|"))
            add(`${tableHeader}\n${line}`, page.page, pageEnd);
          else {
            if (/^(?:[IVX]+\.|\[Tiếp theo:)/.test(line)) section = line;
            add(line, page.page, pageEnd);
          }
        }
      } else {
        // Recursive splitting is only for prose. Table rows and their labels stay atomic.
        const pieces = await MDocument.fromText(block).chunk({
          strategy: "recursive",
          maxSize: 1200,
          overlap: 120,
        });
        for (const piece of pieces) add(piece.text, page.page, pageEnd);
      }
      pageEnd = page.page;
    }
  }
  return chunks;
}
