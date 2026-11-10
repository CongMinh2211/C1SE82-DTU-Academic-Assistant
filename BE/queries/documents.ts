// Mục đích file: Truy vấn danh sách tài liệu và trạng thái các phiên bản cho màn hình quản trị.
import { rows } from "../db";

export async function documentList() {
  // Mỗi tài liệu chưa xóa lấy phiên bản có số lớn nhất để hiển thị trạng thái.
  return await rows(`SELECT d.*,r.id latest_revision,r.version,r.status,r.chunk_count,r.error
    FROM documents d JOIN revisions r ON r.document_id=d.id
    WHERE d.deleted_at IS NULL AND r.version=(SELECT MAX(version) FROM revisions WHERE document_id=d.id)
    ORDER BY d.updated_at DESC`);
}
