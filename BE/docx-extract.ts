import { fromBuffer } from "yauzl";

// Đọc metadata ZIP trước khi giải nén để giới hạn kích thước và tránh tệp nén gây cạn bộ nhớ.
export async function extractDocx(bytes: Buffer): Promise<string> {
  await new Promise<void>((resolve, reject) => {
    fromBuffer(bytes, { lazyEntries: true }, (error, zip) => {
      if (error || !zip) return reject(new Error("DOCX không hợp lệ."));
      let total = 0,
        count = 0,
        documentFound = false;
      zip.on("error", reject);
      zip.on("entry", (entry) => {
        total += entry.uncompressedSize;
        count++;
        if (entry.fileName === "word/document.xml") documentFound = true;
        if (entry.isEncrypted() || count > 5000 || total > 64 * 1024 * 1024) {
          zip.close();
          reject(new Error("DOCX mã hóa hoặc vượt giới hạn giải nén."));
          return;
        }
        zip.readEntry();
      });
      zip.on("end", () =>
        documentFound
          ? resolve()
          : reject(new Error("DOCX thiếu nội dung văn bản.")),
      );
      zip.readEntry();
    });
  });
  const mammoth = await import("mammoth");
  const text = (await mammoth.extractRawText({ buffer: bytes })).value.trim();
  if (text.length < 25 || text.length > 2_000_000)
    throw new Error("DOCX không có đủ văn bản hoặc vượt giới hạn xử lý.");
  return text;
}
