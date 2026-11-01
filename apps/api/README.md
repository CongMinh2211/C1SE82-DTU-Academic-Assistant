# FAQ API

The API is mounted under /api/v1:

- GET /faqs lists published FAQs, with optional topic, page (default 1) and page_size (default 20, maximum 100).
- GET /faqs/{id} returns a published FAQ.
- POST /faqs, PUT /faqs/{id} and DELETE /faqs/{id} require an administrator principal.

FAQ requests reject unknown fields, trim surrounding whitespace, and enforce question (5–300 characters), answer (5–5,000 characters), topic (1–80 characters) and source ID (1–100 characters) limits. Publishing requires an existing, active, approved source. Public reads must be backed by repository queries that only return published FAQs with active sources.

## Integration points

The application deliberately fails closed until the shared backend adapters are installed:

- app.state.principal_provider must resolve the authenticated principal. The admin routes require role == "admin".
- app.state.faq_repository must implement the FaqRepository protocol in app/services/faqs.py. Its save operation must check source existence and, when publishing, active/approved status in the same database transaction.

If either adapter is missing, the API returns a structured 503 error. This leaves authentication and database schema decisions with their shared owners.

Errors use {"error":{"code":"...","message":"...","request_id":"...","details":[]}}; X-Request-ID is returned on both successful and failed responses.

## Feedback API

Authenticated users can submit feedback with POST /feedback and view only their own feedback with GET /feedback and GET /feedback/{id}. Administrators can list feedback with GET /admin/feedback and resolve pending items with PATCH /admin/feedback/{id}.

The shared app.state.feedback_repository must implement FeedbackRepository. Its create_for_owner operation must atomically verify that any referenced message is an assistant reply in the submitting user's conversation before inserting. Owner-scoped reads must filter by user_id in storage, and resolve_pending must update only pending feedback atomically. The shared principal_provider is required. Missing adapters return 503.
