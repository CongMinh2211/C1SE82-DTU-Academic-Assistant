import { defineConfig, devices } from "@playwright/test";

// E2E chỉ chạy trên bản ứng dụng local với dữ liệu kiểm thử riêng.
const baseURL = process.env.E2E_BASE_URL || "http://127.0.0.1:3000";
if (!["localhost", "127.0.0.1", "[::1]"].includes(new URL(baseURL).hostname)) {
  throw new Error("E2E_BASE_URL phải trỏ tới ứng dụng local.");
}

export default defineConfig({
  testDir: ".",
  testMatch: "*.spec.ts",
  fullyParallel: false,
  workers: 1,
  forbidOnly: true,
  reporter: "list",
  outputDir: "./test-results",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
