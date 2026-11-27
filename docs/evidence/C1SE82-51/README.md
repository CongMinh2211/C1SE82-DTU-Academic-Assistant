# C1SE82-51 — Hồ sơ kiểm tra trước quyết định phát hành

Đối chiếu ngày 27/11/2026 (Asia/Bangkok). **Chưa đủ bằng chứng đề nghị phát hành; chờ mentor/người có thẩm quyền đưa ra quyết định go/no-go.** Tài liệu này không phải biên bản họp, phê duyệt hay quyết định thay mentor.

Jira ghi hạn task **28/11/2026**, còn phần mô tả dẫn Project Plan ghi gate release **05/12/2026**. Hai mốc có thể thuộc hai cấp khác nhau; cần người phụ trách xác nhận, không tự sửa Jira hoặc coi chúng là một hạn.

## Phiên bản và môi trường đã đối chiếu

| Hạng mục | Kết quả quan sát | Giới hạn |
| --- | --- | --- |
| Kho chính, `member/minh` | `1f9ea58b5e49b125af25aef3aa3cdccb9967b6d5`; [CI pass](https://github.com/CongMinh2211/C1SE82-DTU-Academic-Assistant/actions/runs/45815860320) | Đây là scaffold; CI không nghiệm thu bản FE/BE handover. Commit tài liệu release có thể mới hơn commit này. |
| Repo triển khai, nhánh `main` | `68cc072212eea40e1e1eec13432aa42e82f74cec` | Không suy ra code local đã nằm trên Render. Không tự tạo tag v1.0 hay tuyên bố freeze. |
| Render FE và BE | Hai deploy live lần lượt [FE](https://dashboard.render.com/web/srv-dbute1gm7kps73e3sj00/deploys/dep-dc3fdm5g1s2s73ejs2fg) và [BE](https://dashboard.render.com/web/srv-dbutgrrrjlhs73b486q0/deploys/dep-dc3fdm5g1s2s73ejs2u0), cùng commit `68cc072` | Chỉ xác định version đang chạy, không bảo đảm dữ liệu/corpus hoặc mọi chức năng đúng. |
| Source local `voice-deploy` | HEAD `68cc072`, có thay đổi chưa commit gồm voice, tests và cấu hình | Không ghi đè, không gom các thay đổi chưa review thành bản release; handover cũng là source riêng không có commit định danh đầy đủ. |
| Tag release | Chưa thấy tag trong hai repo khi kiểm tra | Cần thống nhất commit, review và tạo tag sau khi đủ điều kiện. |

## Bằng chứng kiểm thử

| Phạm vi | Kết quả | Giới hạn |
| --- | --- | --- |
| Truy cập online | GET `/dang-nhap` HTTP 200 ngày 27/11 | Không chứng minh đăng nhập thành công hay các chức năng sau đăng nhập. |
| Postman online | 10 request GET, 14/14 assertions pass, exit 0; health, auth config, session ẩn danh và yêu cầu 401 cho endpoint cần đăng nhập | Chỉ một lần chạy; không gồm đăng nhập, hỏi đáp AI thật, ghi/sửa/xóa hay role admin/student. Lần trước từng gặp 429; cần theo dõi độ ổn định. |
| Cypress handover | Lần 26/11: 26/27 pass; chạy lại riêng ca voice sau sửa: 1/1 pass | Chưa chạy lại toàn bộ sau sửa; citation UI dùng mock; không chứng minh giọng thật, AI hoặc source production. |
| RAG handover | 12/12 test chọn lọc kiểm tra provenance, hiệu lực và grounding trên dữ liệu thử | Không thay cho benchmark AI, citation/fallback thực tế theo corpus được duyệt. |
| API scaffold | 38/38 pytest, Ruff và CI scaffold pass tại `1f9ea58` | Provider giả/rỗng, chưa kết nối pgvector của bản tích hợp. |
| UAT / bảo mật / QA | Chưa đối chiếu được report, defect triage và signoff cuối | Jira [C1SE82-50](https://tranminh6464aimbot.atlassian.net/browse/C1SE82-50) In Progress; [C1SE82-46](https://tranminh6464aimbot.atlassian.net/browse/C1SE82-46) In Progress. |

Tái chạy Postman GET-only từ máy đã cài Postman CLI:

```powershell
postman.cmd collection run "D:\documents\Capstone 1\_work\postman-api-check\DTU_API_Anonymous.postman_collection.json" --delay-request 500
```

Collection đang trỏ tới Render và không phải bộ test toàn chức năng. Không ghi token, cookie hoặc dữ liệu cá nhân vào report.

## Checklist quyết định release

- [ ] Duyên hoàn tất UAT Student/Admin, đối chiếu expected/actual, báo cáo và signoff; rà các case citation/fallback với tài liệu đã duyệt ([C1SE82-50](https://tranminh6464aimbot.atlassian.net/browse/C1SE82-50)).
- [ ] Tài hoàn tất tài liệu môi trường, deploy, logs, backup/restore và diễn tập rollback trên môi trường phù hợp ([C1SE82-49](https://tranminh6464aimbot.atlassian.net/browse/C1SE82-49)).
- [ ] Duyên/Lãm/Duy/Tài cung cấp bằng chứng Student/Admin E2E, API, RAG benchmark và security theo [43](https://tranminh6464aimbot.atlassian.net/browse/C1SE82-43), [44](https://tranminh6464aimbot.atlassian.net/browse/C1SE82-44), [45](https://tranminh6464aimbot.atlassian.net/browse/C1SE82-45), [46](https://tranminh6464aimbot.atlassian.net/browse/C1SE82-46), [47](https://tranminh6464aimbot.atlassian.net/browse/C1SE82-47); chưa suy ra hoàn tất từ các ca chọn lọc ở trên.
- [ ] Đối chiếu danh mục nguồn được duyệt, phiên bản/checksum, hiệu lực và khả năng mở citation trong corpus thực tế; xác minh an toàn thông tin và quyền sử dụng.
- [ ] Minh tổng hợp defect thực tế, mức độ, chủ sở hữu, thời hạn xử lý và bằng chứng retest; không giả định không có P0/P1 khi chưa có báo cáo.
- [ ] Thống nhất repo, commit FE/BE, cấu hình và corpus của bản demo; rà thay đổi local, review, freeze và gắn tag theo quy trình nhóm. Không tự merge hoặc tag release khi thiếu điều kiện.
- [ ] Trình diễn Student/Admin, trích nguồn, fallback trên đúng bản freeze; lưu link video/ảnh và báo cáo không lộ dữ liệu thật.
- [ ] Mentor/người có thẩm quyền ghi rõ **go hoặc no-go**, ngày, người tham gia, nhận xét, rủi ro tồn và thời hạn; chỉ sau khi có phê duyệt mới cập nhật release theo quyết định đó.

Jira hiện đánh dấu C1SE82-40, 41 và 48 Done; trạng thái này được ghi nhận nhưng **không tự thay thế** link bằng chứng, UAT hay phê duyệt release. C1SE82-51 tiếp tục In Progress.
