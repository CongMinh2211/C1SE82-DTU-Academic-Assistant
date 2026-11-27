# C1SE82-48 - Chuẩn bị kiểm chứng Integrated Pilot

## Lần kiểm tra 26/11/2026 — chưa đủ điều kiện nghiệm thu

- Bản handover TypeScript chạy local với FE, BE và SQLite tạm; tài khoản kiểm thử được tạo riêng. Không dùng hoặc sửa CSDL sinh viên đang có.
- `node --import tsx --test --test-concurrency=1 BE/tests/published-evidence.test.ts BE/tests/provenance.test.ts BE/tests/grounding.test.ts`: **12/12 đạt**. Các ca kiểm tra nguồn đã công bố, hiệu lực, provenance và chặn trích dẫn sai; không chứng minh hệ thống online hoặc LLM thật.
- Cypress `npm.cmd run test:e2e:local`: **26/27 đạt, 1 thất bại, 0 bỏ qua**: admin 11/11, auth 5/5, demo 2/2, student 8/8, voice 0/1. Ca voice thất bại vì sau khi chuyển trang kiểm thử thấy `speechSynthesis.cancel` được gọi; cần điều tra xem lỗi thuộc ứng dụng hay test trước khi kết luận. Cypress có tạo ảnh lỗi ở `cypress/screenshots/voice.cy.js/` của bản handover local; không có video. Ca hiển thị câu trả lời/citation dùng API giả lập, không chứng minh tìm nguồn hoặc AI thật. Upload Markdown mới chứng minh yêu cầu được tiếp nhận, chưa chứng minh lập chỉ mục và xuất bản.
- Thử GET `/dang-nhap` trên bản Render công khai: lần đầu hết thời gian sau 25 giây; lần tiếp trả **HTTP 500**. GET `/api/public/auth-config` trực tiếp tới backend hết thời gian sau 45 giây. Log frontend ghi không tải được dữ liệu backend. Log backend ngày 25/11 từng ghi hết JavaScript heap; chưa đủ bằng chứng xác định đó là nguyên nhân lỗi 500 hiện tại.
- [CI scaffold commit 692f56a](https://github.com/CongMinh2211/C1SE82-DTU-Academic-Assistant/actions/runs/45809998442) đạt; không dùng làm bằng chứng CI của bản handover tích hợp.
- Handover chưa có commit Git để xác định toàn bộ phiên bản. Dấu vân tay SHA-256: `BE/rag/retrieve.ts` = `932bf67889cdbdc2b124fab6221a00a78bd2f11a677b0b674b1770ae83ed2096`; `BE/rag/answer.ts` = `b0326aa7e7c051f8119766aef88bc6bf7a27212ed10225255398307af800f3c0`.
- Chưa có video/ảnh demo, kiểm thử AI với nguồn DTU thực trên bản online, biên bản review hoặc quyết định go/no-go. Các Jira C1SE82-43 đến 47 vẫn In Progress; Tài/Duyên và mentor cần xác nhận phần được giao. Không chuyển Done khi chưa có xác nhận.

### Rủi ro cần điều phối

| Phát hiện | Ảnh hưởng quan sát được | Người phối hợp | Tiếp theo |
| --- | --- | --- | --- |
| Render đăng nhập HTTP 500; backend không phản hồi trong 45 giây | Chưa trình diễn được bản online | Tài (BE/DevOps), Minh (điều phối) | Đối chiếu log và sức khỏe backend, khắc phục rồi chạy lại smoke; chưa xác nhận nguyên nhân |
| Cypress voice 1 ca thất bại | Chưa chứng minh phát liên tục khi chuyển trang | Owner tính năng FE và Duyên | Kiểm tra assertion và hành vi thực tế, chạy lại sau khi xử lý |
| Trích dẫn GUI dùng mock; chưa có bản ghi demo/review | Chưa nghiệm thu RAG tích hợp | Minh, Tài, Duyên, mentor | Chạy câu hỏi với nguồn đã duyệt; lưu bằng chứng và biên bản review thực tế |

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
