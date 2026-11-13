// Mục đích file: Kiểm thử: Mô hình vector offline và kích thước, tính hợp lệ của vector kết quả.
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import { dataDir } from "../../BE/config";
import { embedTexts } from "../../BE/rag/embeddings";
// Chỉ chạy kiểm thử offline khi đã có đúng phiên bản model trong bộ nhớ đệm.
const cached = existsSync(
  path.join(
    dataDir,
    "models/Xenova/multilingual-e5-small/761b726dd34fb83930e26aab4e9ac3899aa1fa78/onnx/model_quantized.onnx",
  ),
);
test(
  "cached pinned embeddings initialize offline and retain 384 normalized dimensions",
  {
    skip: cached
      ? false
      : "Run setup to download the pinned embedding artifacts first",
  },
  async () => {
    // Chặn fetch để phát hiện việc model bất ngờ yêu cầu tải dữ liệu qua mạng.
    const originalFetch = globalThis.fetch;
    globalThis.fetch = () => {
      throw new Error(
        "Unexpected model network request after cache initialization",
      );
    };
    try {
      const vectors = await embedTexts(
        [
          "Học phí K31 ngành Công nghệ Phần mềm",
          "Maximum registration credit limit",
        ],
        "query",
      );
      // Mỗi đầu vào phải có một vector 384 chiều, hữu hạn và đã chuẩn hóa độ dài.
      assert.equal(vectors.length, 2);
      for (const vector of vectors) {
        assert.equal(vector.length, 384);
        assert.ok(vector.every(Number.isFinite));
        assert.ok(
          Math.abs(vector.reduce((sum, v) => sum + v * v, 0) - 1) < 0.001,
        );
      }
    } finally {
      // Khôi phục fetch ngay cả khi kiểm thử thất bại để không ảnh hưởng test khác.
      globalThis.fetch = originalFetch;
    }
  },
);
