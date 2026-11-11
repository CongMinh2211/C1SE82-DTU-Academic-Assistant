// Mục đích file: Lưu và đọc file nguồn qua lớp lưu trữ phù hợp với môi trường local hoặc cloud.
import { createReadStream } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { get, put } from "@vercel/blob";
import { dataDir } from "./config";

export const cloudSourceStorage = () => process.env.SOURCE_STORAGE === "blob";

export function sourcePath(relative: string) {
  // Chỉ cho phép tên file và phần mở rộng đã quy định trong thư mục sources.
  if (!/^sources\/[a-zA-Z0-9._-]+\.(pdf|txt|html|docx)$/.test(relative))
    throw new Error("Invalid stored source path");
  // Kiểm tra đường dẫn sau khi chuẩn hóa để tránh truy cập ra ngoài kho dữ liệu.
  const resolved = path.resolve(dataDir, relative);
  if (!resolved.startsWith(path.resolve(dataDir, "sources") + path.sep))
    throw new Error("Invalid stored source path");
  return resolved;
}

export async function writeSource(
  relative: string,
  bytes: Buffer,
  mime: string,
) {
  // Xác thực đường dẫn chung trước khi chọn lưu cloud hoặc local.
  sourcePath(relative);
  if (cloudSourceStorage()) {
    await put(relative, bytes, {
      access: "private",
      contentType: mime,
      addRandomSuffix: false,
      allowOverwrite: false,
    });
    return;
  }
  // Không dùng hệ thống file tạm trên Vercel để thay thế kho lưu trữ bền vững.
  if (process.env.VERCEL)
    throw new Error("Vercel requires durable source storage");
  await mkdir(path.join(dataDir, "sources"), { recursive: true, mode: 0o700 });
  await writeFile(sourcePath(relative), bytes, { mode: 0o600 });
}

export async function openSource(relative: string) {
  // Trả luồng đọc để có thể mở tài liệu mà không phải tải toàn bộ file vào bộ nhớ.
  sourcePath(relative);
  if (cloudSourceStorage()) {
    const result = await get(relative, { access: "private", useCache: false });
    if (!result || result.statusCode !== 200)
      throw new Error("Stored source not found");
    return result.stream;
  }
  if (process.env.VERCEL)
    throw new Error("Vercel requires durable source storage");
  return Readable.toWeb(
    createReadStream(sourcePath(relative)),
  ) as ReadableStream<Uint8Array>;
}

export async function readSource(relative: string) {
  // Khi cần toàn bộ nội dung để lập chỉ mục, đọc file local hoặc gom luồng cloud thành buffer.
  if (!cloudSourceStorage()) {
    if (process.env.VERCEL)
      throw new Error("Vercel requires durable source storage");
    return readFile(sourcePath(relative));
  }
  return Buffer.from(
    await new Response(await openSource(relative)).arrayBuffer(),
  );
}
