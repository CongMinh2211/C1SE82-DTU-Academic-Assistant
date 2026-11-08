# C1SE.82 DTU Academic Assistant — fullstack structure

This branch is a **project skeleton with a small backend/RAG-safety preview**, not a completed academic-advice service. It keeps the existing `member/lam` demo untouched. The screen inventory follows the team's Figma Student/Admin designs; real DTU content, login, vector retrieval, Vietnamese LLM and database migrations will be added in later tasks.

## Layout

- `apps/web`: Next.js/TypeScript student and admin web UI.
- `apps/api`: FastAPI backend, separated into API, services, repositories and RAG adapters.
- `database`: PostgreSQL/pgvector migration and seed locations.
- `docs`: API contracts, Figma screen map and file ownership.
- `infra`: local deployment configuration.

See [TASKS.md](docs/TASKS.md) before picking a file. One owner starts a feature; another member reviews it. Do not push unfinished work directly to `main`.

## Quick start (structure check only)

```powershell
cd apps/web
npm install
npm run dev
```

```powershell
cd apps/api
python -m venv .venv
.venv\Scripts\python -m pip install -e ".[dev]"
.venv\Scripts\python -m uvicorn app.main:app --reload
```

The web app is at `http://localhost:3000`; the API health check is at `http://localhost:8000/api/v1/health`. Copy `.env.example` files to local `.env` files when integrating services. No passwords or API keys belong in Git.

API tests: `cd apps/api; .venv\Scripts\python -m pytest -q`. The provisional `POST /api/v1/chat/ask` route is disabled by default. See [AI/RAG integration notes](docs/AI_RAG_SUPPORT.md) before connecting the database or enabling it.

## Kiểm tra trước PR (C1SE82-41)

Từ `apps/api`, cài `pip install -e ".[dev]" ruff==0.11.13`, sau đó chạy `python -m ruff check --select E9,F63,F7,F82 app tests` và `python -m pytest -q`; API smoke test chạy `python -m pytest -q tests/test_health.py`. Từ `apps/web`, chạy `npm ci`, `npx --yes @biomejs/biome@1.9.4 lint src --diagnostic-level=error --skip=lint/a11y/noLabelWithoutControl`, `npm run typecheck` và `npm run build`.

Ngoại lệ lint `noLabelWithoutControl` chỉ để ghi nhận hai lỗi có sẵn ở giao diện đăng nhập scaffold; chủ sở hữu FE cần sửa, sau đó bỏ ngoại lệ. Backend Ruff hiện chỉ bật nhóm lỗi cú pháp và lỗi tên chọn lọc, chưa phải toàn bộ quy tắc style. Workflow quét secrets và từ chối file `.env` được theo dõi; không công bố secrets hoặc nội dung phát hiện trong log. CI và checklist không thay thế branch protection hoặc review; hai cấu hình này phải được xác nhận trên GitHub.
