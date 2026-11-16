# C1SE82-40 — Đăng ký nguồn DTU, provenance và RAG acceptance

Cập nhật đối chiếu: **16/11/2026**. Owner: **Trần Công Minh**; hỗ trợ ingestion: Tài, QA: Duyên. Trạng thái đề xuất: **In Progress**.

## Danh mục nguồn cần đối chiếu trước khi xuất bản

Các URL sau được nêu trong tài liệu bàn giao, **không phải bằng chứng đã duyệt, đã kiểm tra lại URL ngày 16/11 hay đã nhập vào PostgreSQL production**. Nguồn từ bộ local trước đây phải duyệt lại cho môi trường mới.

| Nguồn / URL | Phạm vi và cảnh báo | Quyết định hiện tại |
| --- | --- | --- |
| [Khoa Đào tạo Quốc tế](https://is.duytan.edu.vn/international-school?page=1) | Danh bạ công khai, nội dung có thể cập nhật | Chờ xác minh phiên bản/đơn vị duyệt |
| [Danh sách mentor Capstone — PDF](https://files01.duytan.edu.vn/svruploads/is-duytan/639054716897522780-dscap1-22026ver6.0student.pdf#page=3) | Chỉ xem trang 3 chứa mentor; PDF có dữ liệu sinh viên trên trang khác, **không thu thập toàn file tự động** | Chờ thẩm định phạm vi công khai và quyền sử dụng |
| [Thông báo học phí HK1 2026–2027](https://files01.duytan.edu.vn/svruploads/banctsv-duytan/639200788897171411-47b1538fbb16bacb46459360fa53eb0d.pdf) | Không suy rộng số tài khoản/kỳ học sang học kỳ khác | Chờ xác minh hiệu lực, chương trình/khóa và phê duyệt |
| [Danh Sách Thi — Ban Đào tạo](https://pdaotao.duytan.edu.vn/EXAM_LIST/Default.aspx?lang=VN) | Liên kết công khai, không suy luận lịch thi riêng của sinh viên | Chỉ dùng để dẫn link; kiểm tra trang theo phiên |
| [myDTU portal](https://mydtu.duytan.edu.vn/) | Portal đăng nhập **không phải URL trực tiếp của PDF hướng dẫn 2021** | Không gắn portal làm citation trực tiếp của file PDF |

Theo `README.md` trong bộ FE/BE handover (báo cáo 28–31/10/2026), một số tài liệu đã nhập và thử trên **Docker local**; các môi trường khác không tự đồng bộ. Tài liệu 2019 và hướng dẫn cũ chưa được xác minh hiệu lực. Không sử dụng dữ liệu tài khoản/hội thoại sinh viên hoặc trang có thông tin riêng tư để tạo corpus công khai.

## Trường dữ liệu bắt buộc cho từng bản nguồn (đề xuất checklist)

- `source_url`, `source_owner`, `title`, quyền sử dụng/phạm vi công khai, thời điểm **kiểm tra lại thực tế**.
- `document_id`, `revision_id`, SHA-256/checksum, loại tệp, thời điểm ingestion và kết quả job.
- `approved_by`, `approved_at`, `is_active`, `effective_from`, `effective_to`, khóa/ngành/năm học.
- `chunk_id`, page/section locator và mapping citation tới **phiên bản đang dùng**.
- Có nhật ký gỡ/duyệt phiên bản; nguồn hết hiệu lực, chưa duyệt, lỗi trích xuất hoặc trùng không được trả làm căn cứ.

## Thực trạng phần code GitHub

- [Thư mục RAG scaffold](https://github.com/CongMinh2211/C1SE82-DTU-Academic-Assistant/tree/member/minh/apps/api/app/rag) có lớp chọn evidence, citation và fallback.
- [PR #3](https://github.com/CongMinh2211/C1SE82-DTU-Academic-Assistant/pull/3) thêm kiểm tra hiệu lực nguồn và CI, đã merge vào nhánh Minh.
- [AI/RAG support](../../AI_RAG_SUPPORT.md) ghi rõ `CandidateProvider` mặc định chưa nối PostgreSQL/pgvector thực. Ngưỡng similarity 0.72 là minh họa, chưa được hiệu chuẩn tiếng Việt.
- [CI scaffold thành công](https://github.com/CongMinh2211/C1SE82-DTU-Academic-Assistant/actions/runs/42516895998); **không** chứng minh ingestion/citation end-to-end trên nguồn DTU đã duyệt.

## Bài kiểm thử trước khi đề nghị Done

1. Tài xác nhận schema, quyền và versioned ingestion; chạy thử nguồn mới + nguồn bị thu hồi/hết hiệu lực + trùng + file lỗi trên DB **test riêng**.
2. Duyên đối chiếu 5–10 câu học vụ, mỗi đáp án với bản gốc/trang và thời kỳ áp dụng; ghi expected/actual, pass/fail và source URL.
3. Minh tổng hợp source register với owner, approved status và ngày kiểm tra thật; loại nội dung riêng tư, xác minh quyền sử dụng; gắn PR, CI, logs, ảnh trace/citation.
4. Khi thiếu nguồn, sai khóa/học kỳ hoặc provider lỗi, xác nhận **safe fallback** không bịa thông tin hay dẫn nguồn chưa duyệt.
5. Đánh giá embedding/độ tương đồng tiếng Việt trên dữ liệu đã được phép và xác nhận luồng API tích hợp với Tài.

**Không tự đánh dấu Done** cho tới khi source register có xác nhận, ingestion end-to-end và QA citation/fallback đạt trên môi trường được nêu rõ.
