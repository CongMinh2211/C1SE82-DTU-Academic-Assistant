# Proposed API contract (to confirm with Architecture + DB Design)

Prefix: `/api/v1`. `GET /health` and a **preview** of `POST /chat/ask` are implemented. The other routes below are task boundaries, **not working endpoints yet**.

| Domain | Planned routes | Owner |
| --- | --- | --- |
| Auth | `POST /auth/login`, `GET /auth/me`, `POST /auth/logout` | Tài |
| Chat | `POST /chat/ask`, `GET /conversations`, `GET /conversations/{id}` | Tài, with Duyên testing |
| Citation | `GET /sources/{id}` | Tài |
| Student FAQ | `GET /faqs`, `GET /faqs/{id}` | Duyên |
| Admin FAQ | `POST /faqs`, `PUT /faqs/{id}`, `DELETE /faqs/{id}` | Duyên, under Tài's auth/schema rules |
| Feedback | `POST /feedback`, `GET /admin/feedback`, `PATCH /admin/feedback/{id}` | Duyên |
| Documents | `GET /admin/documents`, `POST /admin/documents`, `GET /admin/documents/{id}`, `POST /admin/documents/{id}/versions` | Tài |
| Ingestion | `POST /admin/documents/{id}/reindex`, `GET /admin/indexing-jobs` | Tài |
| Dashboard/audit | `GET /admin/metrics`, `GET /admin/audit` | Tài |

`POST /chat/ask` currently returns `answer`, `citations[]`, `fallback` and optional `reason`. A citation carries `chunk_id`, `document_version_id`, title, page/section and effective date if known. The endpoint is disabled by default (`ENABLE_CHAT_PREVIEW=false`). Its default provider contains no source, so enabling it without the approved-source adapter produces only a safe fallback. Even with an injected provider, it displays approved excerpts rather than generating a policy answer. It is not yet a production RAG service.

Before release, Tài must connect database-backed retrieval, approved document/version state, student authentication and authorization, and the selected Vietnamese embedding/LLM adapters. Minh's evidence gate must be evaluated on Vietnamese questions before the similarity threshold is fixed. Do not enable the preview on a public deployment without these controls.

Before implementation, confirm authentication method, who can publish FAQ/documents, error schema, page size, retention and exact DB keys. All admin routes need server-side authorization, not merely hidden UI buttons.
