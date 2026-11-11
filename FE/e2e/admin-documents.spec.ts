// Chạy trên ứng dụng local với E2E_ADMIN_EMAIL/PASSWORD và E2E_STUDENT_EMAIL/PASSWORD.
// Chỉ bật E2E_ALLOW_WRITES=1 khi dữ liệu local dành riêng cho kiểm thử.
import { expect, test, type Page } from "@playwright/test";

type DocumentRecord = {
  id: string;
  title: string;
  status: string;
  active_revision: string | null;
};

const admin = {
  email: process.env.E2E_ADMIN_EMAIL || "",
  password: process.env.E2E_ADMIN_PASSWORD || "",
};
const student = {
  email: process.env.E2E_STUDENT_EMAIL || "",
  password: process.env.E2E_STUDENT_PASSWORD || "",
};

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/dang-nhap");
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
}

async function documents(page: Page): Promise<DocumentRecord[]> {
  const response = await page.request.get("/api/app/admin/documents");
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as DocumentRecord[];
}

test("khách chưa đăng nhập được chuyển khỏi các trang Admin", async ({
  page,
}) => {
  for (const path of [
    "/quan-tri",
    "/quan-tri/tai-lieu",
    "/quan-tri/tai-lieu/them",
    "/quan-tri/xu-ly-tai-lieu",
  ]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/dang-nhap(?:\?|$)/);
  }
  expect((await page.request.get("/api/app/admin/documents")).status()).toBe(
    401,
  );
});

test("sinh viên không truy cập trang và API Admin", async ({ page }) => {
  test.skip(
    !student.email || !student.password,
    "Cần tài khoản sinh viên E2E.",
  );
  await signIn(page, student.email, student.password);
  await expect(page).toHaveURL(/\/sinh-vien(?:\/|$)/);
  await page.goto("/quan-tri/tai-lieu");
  await expect(page).toHaveURL(/\/sinh-vien(?:\/|$)/);
  expect((await page.request.get("/api/app/admin/documents")).status()).toBe(
    403,
  );
  expect(
    (
      await page.request.post("/api/app/admin/documents/unknown/publish", {
        data: { revisionId: "00000000-0000-0000-0000-000000000000" },
      })
    ).status(),
  ).toBe(403);
});

test("Admin mở được Dashboard và các màn tài liệu", async ({ page }) => {
  test.skip(!admin.email || !admin.password, "Cần tài khoản Admin E2E.");
  await signIn(page, admin.email, admin.password);
  await expect(page).toHaveURL(/\/quan-tri(?:\/|$)/);
  await expect(
    page.getByRole("heading", { name: "Chào bạn, quản trị viên" }),
  ).toBeVisible();
  await page.goto("/quan-tri/tai-lieu");
  await expect(
    page.getByRole("heading", { name: "Tài liệu & nguồn học vụ" }),
  ).toBeVisible();
  await page.goto("/quan-tri/xu-ly-tai-lieu");
  await expect(
    page.getByRole("heading", { name: "Theo dõi xử lý tài liệu" }),
  ).toBeVisible();
});

test("Admin tải TXT, rà soát và xuất bản sau xác nhận", async ({ page }) => {
  test.skip(!admin.email || !admin.password, "Cần tài khoản Admin E2E.");
  test.skip(
    process.env.E2E_ALLOW_WRITES !== "1",
    "Chỉ chạy mutation trên dữ liệu test riêng.",
  );
  test.setTimeout(360_000);

  const title = `E2E C1SE82-44 ${Date.now()}`;
  let documentId = "";
  await signIn(page, admin.email, admin.password);
  await expect(page).toHaveURL(/\/quan-tri(?:\/|$)/);
  try {
    await page.goto("/quan-tri/tai-lieu/them");
    await page.locator('input[name="title"]').fill(title);
    await page
      .locator('textarea[name="scope"]')
      .fill(
        "Tài liệu kiểm thử E2E nội bộ, chỉ áp dụng cho dữ liệu local riêng.",
      );
    await page.locator('input[name="file"]').setInputFiles({
      name: "c1se82-44-e2e.txt",
      mimeType: "text/plain",
      buffer: Buffer.from(
        Array.from(
          { length: 24 },
          (_, i) =>
            `Đoạn kiểm thử ${i + 1}: nội dung giả để xác minh tải lên, lập chỉ mục, rà soát và xuất bản tài liệu.`,
        ).join("\n\n"),
        "utf8",
      ),
    });
    await page.getByRole("button", { name: "Lưu và lập chỉ mục" }).click();
    await expect(page).toHaveURL(/\/quan-tri\/xu-ly-tai-lieu(?:\?|$)/);

    await expect
      .poll(
        async () => {
          const item = (await documents(page)).find(
            (document) => document.title === title,
          );
          documentId = item?.id || "";
          return item?.status || "missing";
        },
        { timeout: 240_000, intervals: [1_000, 3_000, 5_000] },
      )
      .toBe("ready");

    await page.goto(`/quan-tri/tai-lieu?q=${encodeURIComponent(title)}`);
    const row = page.getByRole("row").filter({ hasText: title });
    await expect(row).toBeVisible();
    await row.getByRole("button", { name: "Xem", exact: true }).click();
    await expect(page.getByRole("dialog")).toContainText(title);
    await page.getByRole("button", { name: "Đóng cửa sổ" }).click();

    await row.getByRole("button", { name: "Xuất bản", exact: true }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Hủy" }).click();
    expect(
      (await documents(page)).find((document) => document.id === documentId)
        ?.active_revision,
    ).toBeNull();

    await row.getByRole("button", { name: "Xuất bản", exact: true }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Xuất bản phiên bản" })
      .click();
    await expect
      .poll(async () => {
        const item = (await documents(page)).find(
          (document) => document.id === documentId,
        );
        return item?.active_revision ? item.status : "not-published";
      })
      .toBe("published");
  } finally {
    // Chỉ gỡ tài liệu do ca này tạo; không đụng tới nguồn có sẵn.
    if (!documentId) {
      documentId =
        (await documents(page)).find((document) => document.title === title)
          ?.id || "";
    }
    if (documentId) {
      const cleanup = await page.request.delete(
        `/api/app/admin/documents/${documentId}`,
      );
      expect(cleanup.ok()).toBeTruthy();
    }
  }
});
