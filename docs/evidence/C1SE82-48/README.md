# C1SE82-48 - Chuẩn bị kiểm chứng Integrated Pilot

Đối chiếu 16/11/2026; hạn Jira 21/11/2026. Đây là tài liệu chuẩn bị, **không phải biên bản nghiệm thu hay quyết định go/no-go**.

## Hai phạm vi phải phân biệt

- Nhánh `member/minh` là scaffold Next.js/FastAPI. API hỏi đáp preview mặc định tắt, provider mặc định rỗng; kiểm thử provider giả không chứng minh PostgreSQL/pgvector hoặc nguồn DTU thật.
- `dtu-academic-assistant-handover` là source chạy local riêng, FE/BE TypeScript, không có trong PR này. Kiểm thử chọn lọc được chạy trên CSDL tạm; chưa chứng minh bản triển khai công khai.

## Bằng chứng thực tế

- 16/11: scaffold `python -m pytest -q`: 20/20 đạt; nhóm hợp đồng API/RAG: 19/19 đạt, provider giả; smoke health: 1/1 đạt. Ruff, FE Biome (có ngoại lệ accessibility đã ghi trong README), typecheck và build đạt.
- 16/11: handover chạy 19 ca chọn lọc: lọc nguồn và hiệu lực, citation/fallback, quyền chỉnh metadata, lưu Markdown, voice playback; các ca dùng dữ liệu kiểm thử. Không suy ra kiểm thử E2E hoặc provider thật từ kết quả này.
- [PR #4 vào nhánh Minh](https://github.com/CongMinh2211/C1SE82-DTU-Academic-Assistant/pull/4): đang review; CI cần kiểm tra kết quả thực tế trên PR. Không gán review/sign-off khi chưa có.

## Các bước cần chạy trước buổi demo

1. Xác nhận phiên bản, môi trường demo và tài khoản thử riêng; không dùng dữ liệu sinh viên thật.
2. Admin tải tài liệu có quyền sử dụng, theo dõi indexing, kiểm tra metadata và công bố phiên bản đủ điều kiện.
3. Sinh viên hỏi câu có căn cứ, mở đúng đoạn nguồn/file/trang; thử tài liệu chưa duyệt, hết hiệu lực và câu hỏi thiếu chứng cứ.
4. Kiểm tra đăng nhập, phân quyền Student/Admin, FAQ, lịch sử và phản hồi theo phạm vi buổi demo; ghi expected/actual và lỗi.
5. Thu log/ảnh hoặc video không chứa secret và dữ liệu cá nhân; đối chiếu QA với Duyên và API/DB với Tài.
6. Nhóm và mentor ghi kết quả review, quyết định go/no-go, người xử lý và thời hạn sửa. Không tự đánh dấu Done trước khi có xác nhận.
