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
