# Phần BE / DevOps / AI-RAG hỗ trợ của Minh

Đây là lát cắt để kiểm thử hợp đồng API và nguyên tắc **trả lời có nguồn**, chưa phải chatbot dùng được với tài liệu DTU thật.

## Luồng hiện có

1. `POST /api/v1/chat/ask` kiểm tra câu hỏi (5–1000 ký tự) và chỉ mở khi `ENABLE_CHAT_PREVIEW=true`. Mặc định API trả `503` để không lộ một chức năng chưa có xác thực và tài liệu chính thức.
2. `CandidateProvider.search()` là cổng tích hợp. Provider mặc định trả danh sách rỗng; Tài sẽ nối repository PostgreSQL/pgvector và trạng thái duyệt của từng phiên bản tài liệu.
3. `select_evidence()` loại nguồn chưa duyệt, không hoạt động, chưa có hiệu lực, thiếu định danh hoặc dưới ngưỡng. Các chunk trùng được gộp, ưu tiên điểm cao.
4. Nếu không có bằng chứng, API trả `fallback=true`, không tạo câu trả lời giả. Nếu có, API chỉ trích nguyên văn đoạn liên quan và kèm `chunk_id`, `document_version_id`, tiêu đề, trang/mục/ngày hiệu lực.

`RAG_MIN_SIMILARITY=0.72` chỉ là giá trị demo; điểm similarity phụ thuộc embedding model và cách chuẩn hóa. Không coi đây là mức chất lượng đã được duyệt.

## Hợp đồng provider cần Tài xác nhận

`search(question, limit)` nhận câu hỏi đã chuẩn hóa và số kết quả tối đa; trả danh sách `EvidenceCandidate` từ CSDL, không trả model/mapping chưa được kiểm chứng. Mỗi candidate phải giữ đúng `chunk_id`, `document_version_id`, tiêu đề, nguyên văn, điểm cosine trong [-1, 1] và trạng thái `approved`, `active` dạng boolean lấy từ nguồn tin cậy. Ngày hiệu lực là `date` hoặc `None`, trang là số nguyên dương hoặc `None`. Ngày thiếu **không chứng minh nguồn còn hiệu lực**; quy trình duyệt phải xử lý metadata thiếu trước khi cho dùng chính thức. Provider không được tự xác nhận tài liệu đã duyệt dựa vào nội dung.

Ngưỡng cấu hình sai hoặc provider lỗi trả HTTP 503, không tiết lộ chi tiết và không giả vờ là không tìm thấy nguồn. Không có candidate hợp lệ trả HTTP 200 với `fallback=true` và không có citation. API preview chưa có xác thực và vẫn mặc định tắt; adapter, phân quyền và nguồn chính thức cần Tài xác nhận trước khi tích hợp.

## Kế hoạch đánh giá tiếng Việt và citation/fallback

1. Minh và Tài chọn nguồn DTU đã duyệt, lưu phiên bản/đường dẫn và xác nhận phạm vi, ngày hiệu lực; Duyên đối chiếu ground truth độc lập. Không đưa dữ liệu cá nhân vào bộ đánh giá.
2. Tạo tập câu hỏi gồm: học phí theo ngành/khóa; điều kiện tốt nghiệp theo đợt; lịch học và đăng ký học phần; cách diễn đạt không dấu/viết tắt; câu hỏi năm cũ; câu ngoài phạm vi; tài liệu hết hiệu lực hoặc chưa duyệt. Các câu có nguồn cần gắn `document_version_id`, chunk/trang và câu trả lời mong đợi theo tài liệu đã duyệt; câu thiếu nguồn đánh dấu kỳ vọng fallback. Không tự đặt đáp án khi chưa kiểm tra nguồn.
3. Chia tập hiệu chỉnh và tập kiểm tra riêng; thử các embedding hỗ trợ tiếng Việt, ngưỡng cosine và top-k trên cùng nguồn/cùng tập. Ghi model, phiên bản, ngày chạy, truy vấn, nguồn mong đợi và thực tế, điểm similarity, lý do fallback. Không chọn ngưỡng dựa vào một câu hay mặc định 0.72.
4. Duyên đánh giá tỷ lệ tìm đúng đoạn nguồn (recall@k), tỷ lệ citation đúng phiên bản/trang và tỷ lệ fallback đúng với câu thiếu nguồn; ghi cả trường hợp sai có thể gây trả lời không căn cứ. Minh và Tài thống nhất tiêu chí đạt trước khi công bố kết quả, điều tra từng lỗi và chạy lại tập kiểm tra giữ riêng.
5. Lưu báo cáo, test log và commit của bản tích hợp; kiểm tra end-to-end với adapter/DB thật và xác thực trước khi trình review. Kế hoạch này chưa phải kết quả benchmark hay phê duyệt.

## Phần chưa hoàn thành / người nối tiếp

- Tài: schema và migration, tài liệu/phiên bản đã duyệt, truy xuất pgvector, authentication/authorization và triển khai môi trường.
- Minh + Tài: đánh giá embedding model có hỗ trợ tiếng Việt trên tập câu hỏi học vụ; chọn LLM hỗ trợ tiếng Việt, chỉ cho phép sinh câu trả lời từ nguồn đã qua bộ lọc và kiểm tra trích dẫn.
- Duyên: kiểm thử trường hợp nguồn thiếu, phiên bản chưa duyệt, điểm thấp, lỗi đầu vào; xây dựng FAQ/Feedback API theo schema và quyền do Tài thống nhất.
- Lãm/Duy: tích hợp trạng thái loading, citation, fallback và lỗi của API vào giao diện tương ứng.

Trước khi public, cần chốt ngưỡng bằng đánh giá offline, kiểm tra an toàn đầu ra, phân quyền route, logging không lộ dữ liệu cá nhân, và test end-to-end với tài liệu DTU chính thức. Chạy `python -m pytest -q` trong `apps/api` để kiểm thử lát cắt hiện tại.
