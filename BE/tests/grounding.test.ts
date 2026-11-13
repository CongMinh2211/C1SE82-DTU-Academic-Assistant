// Mục đích file: Kiểm thử: Chặn khẳng định không có nguồn hoặc mã nguồn trích dẫn không hợp lệ.
import test from "node:test";
import assert from "node:assert/strict";
import { validateDraft, draftSchema } from "../../BE/rag/answer";
import { officialUrl, publicAddress, publicWebUrl, isUniversityUrl } from "../../BE/official-web";
import type { Evidence } from "../../BE/rag/retrieve";
const evidence: Evidence[] = [
  {
    id: "S1",
    chunkId: "chunk",
    documentId: "TL03",
    revisionId: "v1",
    title: "Official source",
    version: 1,
    page: 2,
    pageEnd: 2,
    section: "5",
    text: "19 tín chỉ, không tính 01 tín chỉ Giáo dục thể chất.",
    scope: "HKI 2026–2027",
    score: 1,
  },
];
// Từ chối ý trả lời không có nguồn hoặc dùng mã nguồn không tồn tại.
test("invented source IDs and uncited claims are rejected", () => {
  const value = draftSchema.parse({
    status: "answered",
    claims: [{ text: "19 tín chỉ", evidence: [{ sourceId: "invented" }] }],
    followUp: "",
  });
  assert.equal(validateDraft(value, evidence), false);
  value.claims[0].evidence = [];
  assert.equal(validateDraft(value, evidence), false);
  value.claims[0].evidence = [{ sourceId: "S1" }];
  assert.equal(validateDraft(value, evidence), true);
});
// Phản hồi khi thiếu nguồn không được kèm khẳng định hoặc liên kết tự tạo.
test("fallback cannot carry factual answer claims or invented links", () => {
  assert.equal(
    validateDraft(
      {
        status: "insufficient",
        claims: [{ text: "Guess", evidence: [{ sourceId: "S1" }] }],
        followUp: "",
      },
      evidence,
    ),
    false,
  );
  assert.equal(
    validateDraft(
      {
        status: "answered",
        claims: [
          { text: "Go https://evil.example", evidence: [{ sourceId: "S1" }] },
        ],
        followUp: "",
      },
      evidence,
    ),
    false,
  );
});
// Kiểm tra lớp tải nguồn từ chối URL có thông tin đăng nhập hoặc địa chỉ giả, không an toàn.
test("official web fetching rejects credentials, lookalike domains, IPs, ports and insecure URLs", () => {
  for (const url of [
    "http://duytan.edu.vn",
    "https://duytan.edu.vn.evil.example",
    "https://evilduytan.edu.vn",
    "https://localhost",
    "https://127.0.0.1",
    "https://duytan.edu.vn:8443",
    "https://user:pass@duytan.edu.vn",
    "file:///etc/passwd",
  ])
    assert.throws(() => officialUrl(url));
  assert.equal(
    officialUrl("https://courses.duytan.edu.vn/path#x").href,
    "https://courses.duytan.edu.vn/path",
  );
});
// Chặn các địa chỉ mạng nội bộ và địa chỉ dành riêng khi phân giải DNS.
test("DNS guard blocks internal and reserved addresses, including IPv4-mapped IPv6", () => {
  for (const ip of [
    "127.0.0.1",
    "0.0.0.0",
    "10.0.0.2",
    "192.168.1.1",
    "172.16.0.1",
    "169.254.169.254",
    "100.64.0.1",
    "::1",
    "::ffff:127.0.0.1",
    "fc00::1",
    "fe80::1",
    "2001:db8::1",
  ])
    assert.equal(publicAddress(ip), false, ip);
  assert.equal(publicAddress("8.8.8.8"), true);
});
// Nguồn công khai không được giả mạo miền DTU và vẫn phải qua kiểm tra URL.
test("related public articles keep URL protection and cannot impersonate an official DTU domain", () => {
  for (const value of ["http://example.com", "https://localhost", "https://127.0.0.1", "https://[::1]", "https://user:pass@example.com", "https://example.com:8443", "https://service.internal"])
    assert.throws(() => publicWebUrl(value));
  assert.equal(publicWebUrl("https://tuoitre.vn/article.htm#section").href, "https://tuoitre.vn/article.htm");
  assert.equal(isUniversityUrl("https://tuyensinh.duytan.edu.vn/path"), true);
  assert.equal(isUniversityUrl("https://evilduytan.edu.vn/path"), false);
  assert.equal(isUniversityUrl("https://duytan.edu.vn.evil.example/path"), false);
});
