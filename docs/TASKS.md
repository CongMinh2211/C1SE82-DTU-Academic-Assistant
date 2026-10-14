# File ownership and implementation order

This is a **proposed** split for the five team members. Confirm it together before coding. Work on member branches and merge by reviewed pull request; the current structure branch is the common base. `main` and `member/lam` are not changed by this scaffold.

| Person | Primary files / areas | First deliverable |
| --- | --- | --- |
| Lâm — Student FE | `apps/web/src/app/login`, `apps/web/src/app/student/**`, `apps/web/src/features/auth`, `chat`, `history`, `apps/web/public/images` | Figma-matched Student login, home, chat, citation/fallback; responsive and accessible |
| Duy — Admin FE | `apps/web/src/app/admin/**`, `apps/web/src/features/documents`, `faq`, `feedback`, `admin` | Dashboard, document list/add, processing, FAQ/feedback screens |
| Tài — BE architecture, DB, RAG | `apps/api/app/core`, `db`, `models`, `repositories`, `rag`, chat/document/admin services; `database/migrations` | Approved schema + auth guard + document/RAG pipeline with safe fallback |
| Duyên — BA/QA + BE support | `apps/api/app/api/v1/endpoints/faqs.py`, `feedback.py`; matching schemas/services/tests; acceptance tests | FAQ/feedback API, validation, clear errors, pytest/Postman checks, UAT cases |
| Minh — lead/integration | `docs/API_CONTRACT.md`, shared web tokens/components/API client, CI/integration/deployment review | FE–API contract sign-off, integration checklist, review and demo build |

Shared files (`apps/web/src/components/ui`, `apps/web/src/app/globals.css`, `apps/api/app/main.py`, `apps/api/app/api/v1/router.py`) require a short review before modification, since several tasks depend on them. Do not put all UI in one `page.tsx`; move form/state/data handling into each `features/*` folder as it is implemented.

## Recommended sequence

1. Agree DB and API contract; Tài defines model IDs, auth rules and response examples. Minh updates the contract.
2. Lâm and Duy implement visual components from Figma in parallel; use typed mock data until API contracts stabilize. Replace preview links with real role-gated navigation.
3. Tài implements database, login and approved-source ingestion/RAG. Duyên implements FAQ/feedback under those contracts and adds tests.
4. Connect UI to API through `apps/web/src/lib/api`; test loading, empty, validation, server error, citation and safe fallback states.
5. Run end-to-end checks and review before merging to `main`.

## Definition of done per task

- Uses existing tokens/components and matches the Figma screen purpose; mobile behavior and keyboard focus checked.
- Has a valid API contract, loading/empty/error behavior, and no hard-coded secrets or private student data.
- Tests pass and another member reviews the PR. Any academic answer cites an approved versioned source or safely declines.
