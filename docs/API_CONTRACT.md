# Proposed API contract (to confirm with Architecture + DB Design)

Prefix: `/api/v1`. Currently only `GET /health` is implemented. The routes below are task boundaries, **not working endpoints yet**.

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

`POST /chat/ask` should eventually return `answer`, `citations[]` and `fallback`. A citation needs a stable source/document version identifier plus display title, page or section, and effective date if known. When evidence fails the agreed similarity cutoff, return an explicit fallback; do not manufacture a policy answer.

Before implementation, confirm authentication method, who can publish FAQ/documents, error schema, page size, retention and exact DB keys. All admin routes need server-side authorization, not merely hidden UI buttons.
