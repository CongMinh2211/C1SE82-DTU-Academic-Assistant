# C1SE82-53 - S3 RAG acceptance evidence

Ngày thực hiện: 28/10/2026. Assignee: Trần Công Minh. Trạng thái đề nghị: **In Progress - chờ review và Duyên xác nhận**.

## Phạm vi

Lát cắt S3: FastAPI nhận câu hỏi, truy xuất PostgreSQL/pgvector, trả citation hoặc safe fallback, lưu lịch sử và hiển thị trên Student Web. Đây không phải nghiệm thu toàn bộ sản phẩm production.

## Kết quả và bằng chứng

| Mục | Kết quả thực tế | Evidence |
| --- | --- | --- |
| Web/API/DB chạy local | Docker local: Web 3100, API 8100, PostgreSQL 16/pgvector và worker đang chạy | `runtime.json` |
| Câu hỏi có nguồn DTU | HTTP 200, fallback=false, 2 citation thuộc đúng phiên bản; file gốc trả HTTP 200; lịch sử lưu đúng request | `live-results.json`, `01-cited-answer.png` |
| Không có bằng chứng | HTTP 200, fallback=true, reason=insufficient_evidence, không citation | `live-results.json`, `02-safe-fallback.png` |
| Input sai, timeout, nguồn chưa duyệt | 422 cho input sai; timeout embedding/generation không biến thành answer có nguồn; marker [99] bị từ chối; draft/nguồn chưa duyệt bị chặn | `pytest.xml`, `pytest.log`; các test này thuộc bản BE đang làm tại máy Minh |
| Git/PR | PR chỉ chứa bộ kiểm chứng, báo cáo và bằng chứng do Minh phụ trách; bản FE/BE đầy đủ đang ở máy phát triển và cần PR riêng theo từng phần của nhóm | Xem PR liên kết từ Jira |
| Kết quả kiểm thử | 281 passed / 34,57 giây, 0 skipped, PostgreSQL riêng | `pytest.xml` |
| Xác nhận QA | Chưa có xác nhận mới của Duyên | Chờ comment review trên Jira/PR |

Các API probe live sử dụng provider/corpus đang cấu hình thật; không đổi key hoặc sinh vector giả. Automated tests fake tại ranh giới Gemini, không phải đánh giá chất lượng LLM live. Database test chạy trong container riêng, không ghi fixture vào corpus demo. Kết quả 281 test và các ảnh là bằng chứng của **bản ứng dụng đang chạy cục bộ ngày 28/10**, không phải kết quả chạy từ riêng PR này. Git chưa chứa đầy đủ bản ứng dụng đó, nên reviewer cần đối chiếu source và chạy lại sau khi các phần BE/FE liên quan được đưa lên bằng PR riêng.

## Chạy lại demo

1. Mở `RUN_PROJECT.bat`, chọn Docker; truy cập http://localhost:3100. Điền tài khoản ứng dụng đã có, không dùng mật khẩu Google/MyDTU.
2. Student mở tài liệu “Điều kiện xét tốt nghiệp”, chọn hỏi trong tài liệu.
3. Hỏi một ý cụ thể, ví dụ: “Sinh viên còn nợ học phí cần làm gì để được xét tốt nghiệp?”. Kiểm tra marker trỏ đúng đoạn nguồn và mở file gốc tại trang tương ứng.
4. Hỏi câu không có trong cùng tài liệu. Kiểm tra không có đáp án bịa hoặc citation giả.
5. Reload hội thoại, đối chiếu lịch sử đã lưu. Dùng `S3.postman_collection.json` để chạy API riêng.

Repo không chứa database/cookie/key hay volume tài liệu của máy Minh. Reviewer chạy trên máy mới cần tài liệu DTU được phép sử dụng do nhóm cung cấp: Admin upload, đợi indexing hoàn tất rồi approve trước khi hỏi. Không tự approve khi chưa kiểm tra nguồn. File Graduation dùng trong probe hiện có tại volume demo local; source_url của bản import này còn null, nhưng citation trỏ đúng version/file/page trong kho. Tài cần đối chiếu provenance với bản gốc khi review. Các seed công khai ĐTQT/Capstone có hướng dẫn riêng tại `database/seeds/international-capstone/README.md`.

## Automated tests

```powershell
# Đặt TEST_DATABASE_URL riêng, tên database kết thúc bằng _test.
./scripts/test.ps1 -Group backend
```

Lệnh trên áp dụng cho bản BE/FE đầy đủ đang ở máy phát triển, không áp dụng cho scaffold `apps/api` trên Git hiện tại. Đợt kiểm tra này chạy Linux Python 3.12 trong container từ source cục bộ, kết nối PostgreSQL/pgvector test riêng. Windows native hiện chặn DLL SQLAlchemy bằng Application Control; native 3000/8001 không được ghi nhận pass cho ngày 28/10. Không tắt chính sách bảo mật để chạy test. Docker local hoạt động bình thường.

## Những điều reviewer cần xác nhận

- Citation gate chỉ kiểm tra marker có nằm trong evidence hay không; chưa chứng minh tất cả nhận định đều được suy ra đúng về ngữ nghĩa.
- Câu hỏi tốt nghiệp tổng quát trong probe chỉ tổng hợp một phần điều kiện ở trang 6-7, không dùng làm danh sách điều kiện đầy đủ hoặc quyết định tư vấn cá nhân. OCR có ký tự sai/cắt đoạn; cần Duyên rà nội dung với PDF.
- Chưa phải full browser E2E. Ảnh chat cho thấy lịch sử/citation đã render; thao tác gửi mới bằng Enter/nút Gửi trong phiên automation chưa được xác nhận thành công. Duyên/Lãm cần thực hiện case UI trên trình duyệt thực và ghi actual result trước Done.
- Chưa kiểm thử tải lớn, chưa nghiệm thu OAuth/SSO DTU, chưa xác nhận production hardening hoặc model semantic accuracy.
- Deadline Jira 24/10/2026 được giữ nguyên; Sprint 3 vẫn Active dù đã hết mốc kết thúc. Không tự đóng sprint vì còn các task khác của nhóm.

## Phân công review

- Minh: tổng hợp request/response, test log, source và PR.
- Tài: đối chiếu schema/provider, nguồn approved và Docker DB.
- Duyên: xác nhận actual result theo checklist, nguồn/citation/fallback và giới hạn UI.
- Lãm: kiểm tra luồng Student UI, nút gửi/Enter, mở citation và tài liệu.

Không ghi nhận phần review của người khác là đã hoàn thành khi chưa có xác nhận.
