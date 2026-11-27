# Cập nhật Jira và bàn giao review - 28/10/2026

## Kết quả đã thực hiện

| Mục | Trạng thái đã xác nhận | Evidence |
| --- | --- | --- |
| [C1SE82-53](https://tranminh6464aimbot.atlassian.net/browse/C1SE82-53) | In Progress, giữ hạn 24/10/2026 | 281 pytest pass, 4 probe live, ảnh chat/fallback/PDF trang 7, Postman; ZIP và ảnh đính kèm Jira |
| [C1SE82-3](https://tranminh6464aimbot.atlassian.net/browse/C1SE82-3) | In Progress, giữ hạn 25/09/2026 | Ma trận công nghệ/Responsible AI, checksum và review markers tài liệu; MD đính kèm Jira |
| [PR #2](https://github.com/CongMinh2211/C1SE82-DTU-Academic-Assistant/pull/2) | Open, base main, head member/minh | Sau khi thu hẹp phạm vi Git, commit `b6aa2e6` chỉ thêm test cổng bằng chứng và bộ evidence S3; bản FE/BE đầy đủ vẫn ở máy phát triển, chưa nằm trong PR. Scaffold trên Git: 11 test pass trong Docker; cần chờ CI chạy lại trên lịch sử mới. Reviewers: duyen0509, TRANBAXUANLAM. |
| Sprint 3 (35), board 34 | Active dù mốc 19-24/10 đã hết | Chỉ ghi nhận, không thay deadline hoặc đóng sprint của cả nhóm |

Comment báo cáo đã tạo:

- [C1SE82-53 - comment 10105](https://tranminh6464aimbot.atlassian.net/browse/C1SE82-53?focusedCommentId=10105): checklist, kết quả thực tế, hạn chế, link CI/PR/evidence và mention Duyên/Tài/Lãm.
- [C1SE82-3 - comment 10106](https://tranminh6464aimbot.atlassian.net/browse/C1SE82-3?focusedCommentId=10106): ma trận tóm tắt, trạng thái phê duyệt tài liệu và mention Tài/Duyên.

Đã đối chiếu hash của 171 file `BE/app/*.py`: source API trong container demo khớp working tree **cục bộ**, chuẩn hóa CRLF/LF. Alembic runtime ở `0007 (head)`. Đây là bằng chứng của bản cục bộ ngày 28/10, không chứng minh scaffold `apps/api` trên Git đã chạy luồng tích hợp tương tự. Không đổi credential, không đưa dotenv/DB/volume/cookie vào Git. Các container test PostgreSQL/pytest riêng được dọn sau khi giữ report; không dừng bản Docker demo.

## Điều kiện còn lại trước Done

1. Duyên xác nhận actual result và độ đúng nghĩa của citation, fallback, lỗi provider; marker hợp lệ không chứng minh câu trả lời đủ ý.
2. Lãm/Duyên kiểm thao tác gửi mới bằng Enter/nút Gửi và mở citation trên Student Web. Trong phiên automation này, thao tác gửi mới chưa xác nhận thành công; không đánh dấu browser E2E pass.
3. Tài review DB/provider/provenance, mapping ERD với 18 bảng hiện hành và tài liệu demo được phép sử dụng.
4. Đối chiếu bản nộp Architecture/AI Disclosure/Code Standards với review thực tế. Architecture local v1.2 còn Pending mentor review; Code Standards local Revised v3 còn NOT YET APPROVED dù C1SE82-30 đang Done. Không tự sửa chữ ký/phê duyệt hoặc đóng Epic chỉ vì task con Done.
5. Đưa mã BE/FE đầy đủ lên Git qua các PR theo đúng người phụ trách rồi chạy lại kiểm thử tích hợp từ source trên Git. Reviewer phê duyệt PR của Minh; Minh tổng hợp và sửa feedback. Chưa merge PR, chưa đóng hai issue.

Tình trạng native: Windows Application Control chặn DLL SQLAlchemy. Đợt nghiệm thu này chạy Docker local (3100/8100), không tuyên bố native 3000/8001 đã pass. Corpus và dữ liệu runtime không đóng gói trong repo; reviewer dùng tài liệu được phép và chạy indexing/approval trước khi hỏi live trên máy mới.
