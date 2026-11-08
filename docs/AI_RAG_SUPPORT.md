# Phần BE / DevOps / AI-RAG hỗ trợ của Minh

Đây là lát cắt để kiểm thử hợp đồng API và nguyên tắc **trả lời có nguồn**, chưa phải chatbot dùng được với tài liệu DTU thật.

## Luồng hiện có

1. `POST /api/v1/chat/ask` kiểm tra câu hỏi (5–1000 ký tự) và chỉ mở khi `ENABLE_CHAT_PREVIEW=true`. Mặc định API trả `503` để không lộ một chức năng chưa có xác thực và tài liệu chính thức.
2. `CandidateProvider.search()` là cổng tích hợp. Provider mặc định trả danh sách rỗng; Tài sẽ nối repository PostgreSQL/pgvector và trạng thái duyệt của từng phiên bản tài liệu.
3. `select_evidence()` loại nguồn chưa duyệt, không hoạt động, chưa có hiệu lực, thiếu định danh hoặc dưới ngưỡng. Các chunk trùng được gộp, ưu tiên điểm cao.
4. Nếu không có bằng chứng, API trả `fallback=true`, không tạo câu trả lời giả. Nếu có, API chỉ trích nguyên văn đoạn liên quan và kèm `chunk_id`, `document_version_id`, tiêu đề, trang/mục/ngày hiệu lực.

`RAG_MIN_SIMILARITY=0.72` chỉ là giá trị demo; điểm similarity phụ thuộc embedding model và cách chuẩn hóa. Không coi đây là mức chất lượng đã được duyệt.

## Phần chưa hoàn thành / người nối tiếp

- Tài: schema và migration, tài liệu/phiên bản đã duyệt, truy xuất pgvector, authentication/authorization và triển khai môi trường.
- Minh + Tài: đánh giá embedding model có hỗ trợ tiếng Việt trên tập câu hỏi học vụ; chọn LLM hỗ trợ tiếng Việt, chỉ cho phép sinh câu trả lời từ nguồn đã qua bộ lọc và kiểm tra trích dẫn.
- Duyên: kiểm thử trường hợp nguồn thiếu, phiên bản chưa duyệt, điểm thấp, lỗi đầu vào; xây dựng FAQ/Feedback API theo schema và quyền do Tài thống nhất.
- Lãm/Duy: tích hợp trạng thái loading, citation, fallback và lỗi của API vào giao diện tương ứng.

Trước khi public, cần chốt ngưỡng bằng đánh giá offline, kiểm tra an toàn đầu ra, phân quyền route, logging không lộ dữ liệu cá nhân, và test end-to-end với tài liệu DTU chính thức. Chạy `python -m pytest -q` trong `apps/api` để kiểm thử lát cắt hiện tại.
