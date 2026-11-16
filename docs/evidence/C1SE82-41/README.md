# C1SE82-41 — CI / PR quality gate — bằng chứng và checklist

Cập nhật đối chiếu: **16/11/2026**. Owner: **Trần Công Minh**. Trạng thái đề xuất: **In Progress**, chưa xác nhận Definition of Done.

## Bằng chứng đã kiểm tra

- [Workflow API checks](../../../../.github/workflows/api-ci.yml) trên nhánh `member/minh`: job `test` chạy Ruff chọn lọc, pytest, API smoke; job `web` chạy Biome, TypeScript và Next.js build; job `secrets` từ chối file dotenv và dùng Gitleaks.
- [CI pull_request thành công ngày 09/11/2026 (giờ VN)](https://github.com/CongMinh2211/C1SE82-DTU-Academic-Assistant/actions/runs/42516895998).
- [CI push thành công cùng đợt](https://github.com/CongMinh2211/C1SE82-DTU-Academic-Assistant/actions/runs/42516892106).
- [PR #3](https://github.com/CongMinh2211/C1SE82-DTU-Academic-Assistant/pull/3) đã merge **vào `member/minh`**, không phải `main`.
- [PR #2](https://github.com/CongMinh2211/C1SE82-DTU-Academic-Assistant/pull/2) còn mở tới `main`; chưa dùng PR này để tuyên bố đã được reviewer duyệt.
- [Mẫu PR](../../../../.github/pull_request_template.md) đã liệt kê Jira, kiểm thử, phạm vi, secrets, citation/fallback và review.

## Ma trận acceptance criteria

| Điều kiện từ Jira | Trạng thái | Cần làm |
| --- | --- | --- |
| Có Git/PR conventions, template, reviewer | Một phần | Đối chiếu DEL-11 chính thức với README; xác nhận người review thực tế |
| Workflow chạy lint, unit/smoke, build | Có bằng chứng cho **scaffold** | Gắn đúng URL CI và đảm bảo status check bắt buộc; chạy lại trên source FE/BE tích hợp |
| Secret scanning, không commit secret | Workflow đã cấu hình | Kiểm tra cảnh báo thực tế và lịch sử Git; không đăng secret/log nhạy cảm |
| Ít nhất 1 PR review + checks | **Chưa đủ** | Cần PR có approval của reviewer và kết quả CI tương ứng |
| Bảo vệ nhánh `main` | **Chưa xác minh** | Owner cấu hình/kiểm tra Settings → Branches/Rulesets: PR required, approvals, checks, hạn chế push trực tiếp |

## Kiểm thử tái hiện tại môi trường scaffold

```bash
cd apps/api
python -m pip install -e ".[dev]"
python -m pip install ruff==0.11.13
python -m ruff check --select E9,F63,F7,F82 app tests
python -m pytest -q

cd ../web
npm ci
npx --yes @biomejs/biome@1.9.4 lint src --diagnostic-level=error --skip=lint/a11y/noLabelWithoutControl
npm run typecheck
npm run build
```

**Giới hạn:** lệnh trên chưa được chạy lại trong phiên cập nhật tài liệu này. Biome hiện có ngoại lệ a11y cho form login cần FE sửa. Repo `apps/api` / `apps/web` là **scaffold FastAPI/Next.js**, không phải toàn bộ bản FE/BE TypeScript handover. Không dùng CI scaffold để nghiệm thu hệ thống handover hoặc production.

## Người xác nhận

- Minh: kiểm tra ruleset, ghép evidence, điều phối review.
- Tài: backend, migration, DB và API smoke.
- Lãm/Duy: FE lint/build + sửa lỗi a11y còn bỏ qua.
- Duyên: testcase, actual pass/fail, bằng chứng QA.

**Chỉ chuyển Done khi** bảo vệ nhánh, PR review, CI của đúng mã nguồn tích hợp và checklist DEL-11 đều có xác nhận thực tế.
