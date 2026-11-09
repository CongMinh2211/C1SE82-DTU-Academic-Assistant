/** Tìm FAQ không phân biệt dấu, chữ hoa và thứ tự từ. */
export function faqMatches(
  query: string,
  ...fields: (string | null | undefined)[]
) {
  const fold = (value: string) =>
    // Chuẩn hóa Unicode và chữ đ/Đ để tìm được khi người dùng bỏ dấu.
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[đĐ]/g, "d")
      .toLowerCase();
  const terms = fold(query).trim().split(/\s+/).filter(Boolean);
  // Gộp các trường có nội dung; mỗi từ tìm phải xuất hiện ở ít nhất một trường.
  const text = fold(fields.filter(Boolean).join(" "));
  return terms.every((term) => text.includes(term));
}
