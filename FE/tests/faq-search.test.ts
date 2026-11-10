// Mục đích file: Kiểm thử: Tìm FAQ không dấu và không phụ thuộc hoàn toàn thứ tự từ.
import test from "node:test";
import assert from "node:assert/strict";
import { faqMatches } from "../../FE/lib/faq-search";

// Kiểm tra tìm FAQ với từ không dấu và thứ tự từ thay đổi.
test("FAQ tìm không dấu và không phụ thuộc thứ tự từ", () => {
  assert.equal(faqMatches("tốt nghiệp", "Điều kiện xét tốt nghiệp?"), true);
  assert.equal(faqMatches("nghiep   tot", "Điều kiện xét tốt nghiệp?"), true);
  assert.equal(
    faqMatches("hoc phi K31", "Học phí theo khóa", "Sinh viên K31"),
    true,
  );
  assert.equal(
    faqMatches("hoc phi K30", "Học phí theo khóa", "Sinh viên K31"),
    false,
  );
  assert.equal(faqMatches("   ", "FAQ"), true);
});
