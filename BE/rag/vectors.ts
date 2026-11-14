// Mục đích file: Quản lý chỉ mục vector phục vụ tìm các đoạn tài liệu gần với câu hỏi.
import { LibSQLVector } from "@mastra/libsql";
import { PgVector } from "@mastra/pg";
import path from "node:path";
import { mkdirSync } from "node:fs";
import { dataDir, embeddingDimension } from "../config";

const globalVector = globalThis as unknown as {
  dtuVectors?: LibSQLVector | PgVector;
  dtuVectorReady?: Promise<void>;
};
export const vectorIndex = "academic_e5_v1";
function verifiedConnection(value: string) {
  // Yêu cầu xác thực chứng chỉ TLS cho kết nối PostgreSQL cloud.
  const url = new URL(value);
  url.searchParams.set("sslmode", "verify-full");
  return url.href;
}
export async function vectors() {
  // Local dùng LibSQL; khi có DATABASE_URL, dùng pgvector qua kết nối TLS.
  if (!process.env.DATABASE_URL)
    mkdirSync(dataDir, { recursive: true, mode: 0o700 });
  if (!globalVector.dtuVectors)
    globalVector.dtuVectors = process.env.DATABASE_URL
      ? new PgVector({
          id: "academic-knowledge",
          connectionString: verifiedConnection(process.env.DATABASE_URL),
          max: 3,
        })
      : new LibSQLVector({
          id: "academic-knowledge",
          url: `file:${path.join(dataDir, "vectors.sqlite")}`,
        });
  // Chia sẻ promise tạo chỉ mục; xóa promise lỗi để lần sau có thể thử lại.
  if (!globalVector.dtuVectorReady)
    globalVector.dtuVectorReady = globalVector.dtuVectors
      .createIndex({
        indexName: vectorIndex,
        dimension: embeddingDimension,
        metric: "cosine",
      })
      .catch((e) => {
        globalVector.dtuVectorReady = undefined;
        throw e;
      });
  await globalVector.dtuVectorReady;
  return globalVector.dtuVectors;
}
