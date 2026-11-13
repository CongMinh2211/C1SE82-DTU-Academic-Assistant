import test from "node:test";
import assert from "node:assert/strict";
import { QueryVectorCache } from "../../BE/rag/query-vector-cache";

// Kiểm tra cả thời hạn và bản sao để dữ liệu cache không bị nơi gọi sửa ngoài ý muốn.
test("tái sử dụng vector, trả bản sao và tính lại sau thời hạn", async () => {
  const cache = new QueryVectorCache(2, 100);
  let calls = 0;
  const calculate = async () => {
    calls++;
    return [1, 2];
  };
  const first = await cache.get("học phí", calculate);
  first[0] = 99;
  assert.deepEqual(await cache.get("học phí", calculate), [1, 2]);
  assert.equal(calls, 1);
  await new Promise((resolve) => setTimeout(resolve, 120));
  await cache.get("học phí", calculate);
  assert.equal(calls, 2);
});
// Khi tính thất bại, lần sau phải được thử lại thay vì giữ lỗi cũ trong bộ nhớ.
test("lỗi tính vector không bị cache", async () => {
  const cache = new QueryVectorCache();
  await assert.rejects(
    cache.get("câu hỏi", async () => {
      throw new Error("lỗi");
    }),
  );
  assert.deepEqual(await cache.get("câu hỏi", async () => [3]), [3]);
});
