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

## Pytest regression suite

From apps/api, install the test dependencies and run the API tests:

```sh
python -m pip install -e ".[test]"
python -m pytest -q
```

The tests use in-process ASGI clients with in-memory repositories and a stub principal provider. They do not require a database or external AI/search services.

## Postman regression collection

Import apps/api/postman/DTU-Academic-Assistant-API.postman_collection.json into Postman. Set a local environment with baseUrl (ending in /api/v1), studentToken, adminToken, otherStudentToken, faqId, activeSourceId, and assistantMessageId. Do not commit access tokens or a Postman environment file.

Run the collection only against an isolated QA or staging deployment with the shared authentication and repository adapters configured. The collection creates a draft FAQ and feedback record, publishes and deletes its FAQ, and resolves feedback. The repository intentionally returns 503 when those adapters are absent, so the collection is not a standalone local smoke test.

## RAG, citation and fallback evaluation

Run the offline evaluator from apps/api with a reviewed case file and a matching set of exported RAG traces:

```sh
python -m evaluation.rag_quality --cases evaluation/cases.example.json --traces evaluation/traces.json
```

The evaluator reports retrieval recall, mean reciprocal rank (MRR), exact source-and-locator citation precision/recall, citation-to-retrieval consistency, claim source-reference coverage, and fallback behavior. Thresholds can be set per case. The case file is only a schema example: its source IDs and locators are placeholders and must be replaced with approved DTU test data.

This branch does not currently expose a chat/RAG route or trace-export adapter. The evaluator therefore checks supplied JSON traces offline; it does not exercise a live RAG pipeline or make claims about its production accuracy. Human review is still needed to judge whether cited passages semantically support the answer text.
