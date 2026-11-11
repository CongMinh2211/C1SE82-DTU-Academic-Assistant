// Mục đích file: Tạo bộ đọc PDF phục vụ trích văn bản tài liệu theo từng trang.
async function load() {
  // The package's Node worker initializes DOMMatrix before PDF.js is imported.
  const { CanvasFactory } = await import("pdf-parse/worker");
  const { PDFParse } = await import("pdf-parse");
  return { CanvasFactory, PDFParse };
}
let runtime: ReturnType<typeof load> | undefined;
export async function pdfParser(bytes: Uint8Array) {
  runtime ||= load().catch((error) => {
    runtime = undefined;
    throw error;
  });
  const { PDFParse, CanvasFactory } = await runtime;
  return new PDFParse({ data: bytes, CanvasFactory });
}
