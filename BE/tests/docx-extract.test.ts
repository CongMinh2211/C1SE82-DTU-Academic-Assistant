import test from "node:test";
import assert from "node:assert/strict";
import JSZip from "jszip";
import { extractDocx } from "../../BE/docx-extract";

// Tạo DOCX tối thiểu trong bộ nhớ để kiểm tra nội dung và không dùng dữ liệu thật.
test("trích văn bản từ DOCX", async () => {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
  );
  zip.file(
    "_rels/.rels",
    '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
  );
  zip.file(
    "word/document.xml",
    '<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Hướng dẫn học phần cho sinh viên Đại học Duy Tân</w:t></w:r></w:p></w:body></w:document>',
  );
  assert.match(
    await extractDocx(await zip.generateAsync({ type: "nodebuffer" })),
    /Hướng dẫn học phần/,
  );
});
test("từ chối ZIP không chứa văn bản Word", async () => {
  const zip = new JSZip();
  zip.file("other.txt", "Không phải tài liệu Word");
  await assert.rejects(
    extractDocx(await zip.generateAsync({ type: "nodebuffer" })),
    /thiếu nội dung/,
  );
});
