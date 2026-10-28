# C1SE82-3 - Technology Constraints & AI Transparency

Đối soát ngày 28/10/2026. Owner: Trần Công Minh. Reviewers theo Jira: Trần Anh Tài và Phạm Hoàng Duyên Duyên. **In Progress; không phải văn bản phê duyệt thay mentor/nhóm.** Các đường dẫn `BE/`, `FE/` và cấu hình Docker dưới đây mô tả source cục bộ đã được chạy và kiểm tra; PR kèm báo cáo này chỉ đưa phần kiểm chứng/bằng chứng của Minh, chưa đưa toàn bộ source FE/BE lên Git.

## Technology constraints

| Nội dung | Hiện thực và nguồn code | Giới hạn / việc review |
| --- | --- | --- |
| FE | Next.js 15.5.28, React 19, TypeScript; `FE/package.json`, `FE/src/services/client.ts` | Web responsive; không có native mobile app; chưa coi toàn bộ Figma được nghiệm thu |
| API | FastAPI/Pydantic, SQLAlchemy async, route/service/repository, `/api/v1` | `BE/pyproject.toml`, `BE/app/routes/v1` trên máy phát triển; CI của scaffold Git chưa xác nhận bản BE đầy đủ |
| Database | PostgreSQL 16 + pgvector 0.8.7 trong Docker demo; metadata ORM có 18 bảng, bổ sung provider/QA review ngoài ERD ban đầu | `BE/app/models`, `BE/alembic`, `database`; Tài cần duyệt mapping ERD, không khẳng định vẫn đúng 15 bảng |
| LLM | Gemini chat/embedding qua adapter, model và 768 chiều cấu hình; không có model giả khi thiếu key | `BE/app/rag`, `BE/app/services/ai_provider_service.py`; đổi embedding model/dim phải reindex; quota tùy provider |
| Auth | Password ứng dụng, Google adapter kiểm tra token/audience; HttpOnly cookie, RBAC student/admin; email allowlist super-admin cho credential | `BE/app/services/auth_service.py`, `BE/app/core/security.py`; OAuth chưa cấu hình ở runtime demo, DTU SSO chưa tích hợp |
| Deployment | Docker local: postgres/be/worker/fe và volume file; native bị Windows Application Control chặn DLL trong đợt kiểm tra này | `compose.yaml`, `docs/docker-sharing.md`; chưa nghiệm thu production hoặc trên máy vật lý khác |
| Secrets | Key runtime ở dotenv hoặc cấu hình mã hóa, không đưa vào repository; gateway OmniRoute là công cụ riêng | Production cần secret store/ACL/rotation và kiểm tra cấu hình; không coi mã hóa local là Secret Manager |

## AI transparency và kiểm soát

| Kiểm soát | Hiện thực / test | Giới hạn cần công khai |
| --- | --- | --- |
| Citation | `RAGPipeline._citations_are_valid`, citation builder, marker mở đoạn nguồn/file; history lưu AnswerCitation | Kiểm marker không chứng minh semantic entailment; OCR có thể cắt/sai ký tự; QA phải đối chiếu PDF |
| Safe fallback | Evidence gate + reason, không source thì không phát minh quy định; timeout/quota phân biệt lỗi provider | Không được coi provider error là đã xác nhận kho không có thông tin |
| Hallucination | Prompt grounding, chỉ nguồn approved/active/current/effective; test marker ngoài evidence bị từ chối | Câu trả lời rộng có thể thiếu ý; demo tốt nghiệp chỉ xác nhận các ý có evidence, không phải tư vấn đầy đủ |
| Prompt injection | `contains_injection`, test API và regression | Bộ lọc dạng pattern là một lớp kiểm soát, chưa chứng minh chống mọi injection/jailbreak |
| Privacy | Cookie HttpOnly, kiểm quyền lịch sử/feedback/admin; giới hạn log metadata; seed công khai, không dùng điểm/hồ sơ sinh viên thật | Retention, consent, quyền xóa/export và chia sẻ dữ liệu với provider vẫn cần quyết định/chính sách trước triển khai thật |
| Human oversight | Admin approve tài liệu, QA review/feedback; Tài duyệt kiến trúc, Duyên kiểm yêu cầu và testcase | Không tự gán reviewer đã duyệt, không tự đóng Jira/merge PR |
| Token/latency | top-k, giới hạn evidence, 512 output tokens, context câu hỏi ngắn | Không có benchmark tải lớn hoặc số phần trăm tiết kiệm token được kiểm chứng |

Evidence thực thi: [S3 acceptance](evidence/C1SE82-53/README.md), 281 test pass với external Gemini fake, bốn probe HTTP live/corpus thật. Không dùng kết quả fake để công bố độ chính xác Gemini.

## Đối chiếu tài liệu gốc

Các file dưới đây được đọc trực tiếp từ `01_DOCUMENTS`, chỉ ghi nhận nội dung kiểm tra; không sửa trạng thái phê duyệt trong Word:

| Tài liệu | Đường dẫn tương đối từ 01_DOCUMENTS | Nhận định |
| --- | --- | --- |
| Architecture Document v1.2 | `5. ARCHITECTURE_DESIGN/_content/DTU_Academic_Assistant_Architecture_Documents.docx` | Version 1.2, 18/09/2026; Document Control ghi **Pending mentor review**. Dòng Approved by trên bìa không đủ chứng minh đã phê duyệt |
| Architecture PDF | `DTU_Academic_Assistant_Architecture Documents.pdf`; bản khác trong `5. ARCHITECHTURE_DOCUMENT/` | Cần đối chiếu bản nộp chính thức với DOCX và xác nhận mentor; không tự coi tên file là cùng version |
| AI Usage Disclosure | `1. PROPOSAL/_content/C1SE.82_DTU_Academic_Assistant_AI_Usage_Disclosure_Statement.docx` | Có disclosure công cụ AI, citation/fallback/privacy/human review. Đề cập Cypress/proposed alternatives là nội dung kế hoạch; đợt này không có kết quả Cypress mới |
| Code Standards v1.0 Revised v3 | `11. CODE_AND_PROJECT_STANDARDS/_content/C1SE.82_Code_and_Project_Standards_DTU_Academic_Assistant_v1.0_Revised_v3.docx` | Ghi **Draft for team / mentor review - NOT YET APPROVED**, signature pending, reviews pending |

Checksum SHA-256 và các đoạn trạng thái được ghi tại `evidence/C1SE82-3/document-fingerprints.json`. Không đính kèm raw chữ ký hoặc tuyên bố phê duyệt thay người ký.

## Jira và review gate

- C1SE82-30 đang Done theo Jira. Điều đó không tự đóng Epic và không chứng minh bản local v3 đã được duyệt. Có thể bản Drive đã mới hơn; cần owner đối chiếu bản nộp cuối với review thực tế.
- Folder nộp Code Standards được Jira cung cấp: https://drive.google.com/drive/u/0/folders/167_4G5jqH0P0tYe1BpT7dkRg-u3suhoL . Không dùng link folder làm chứng cứ nội dung đã ký.
- Minh tổng hợp ma trận này và evidence S3; Tài xác nhận kiến trúc/ERD/deployment/auth; Duyên rà SRS/FR/NFR, các hạn chế AI và testcase. Mentor/team approval cần có comment hoặc tài liệu phê duyệt thực tế.
- Giữ deadline 25/09/2026; không đổi ngày để che quá hạn. Epic chỉ chuyển Done khi scope được review đầy đủ, có evidence và xác nhận của reviewer.

## Điều kiện còn lại trước Done

1. Tài phản hồi mapping tài liệu kiến trúc với source hiện hành, đặc biệt schema bổ sung, ngưỡng retrieval cấu hình và authentication.
2. Duyên xác nhận testcase, coverage transparency/privacy và các limitation trong S3.
3. Owner cung cấp link/bản review cuối cho Architecture, AI Disclosure và Code Standards; xử lý khác biệt giữa trạng thái Jira và trạng thái ghi trong tài liệu.
4. Reviewer duyệt PR; không tự merge hoặc giả lập approval.
