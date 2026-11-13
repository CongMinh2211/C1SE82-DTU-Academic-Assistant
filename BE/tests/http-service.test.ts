// Kiểm tra dịch vụ BE thực qua HTTP bằng dữ liệu tạm; không dùng tài khoản thật.
import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

test("Backend độc lập trả cấu hình công khai, giữ cookie và chặn API chưa đăng nhập", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "dtu-http-"));
  const origin = "http://127.0.0.1:18291";
  // Xóa cấu hình cloud khỏi tiến trình con để không mở database của môi trường đang dùng.
  const child = spawn(process.execPath, ["--import", "tsx", "--input-type=module", "-e", "const {getAuth}=await import('./BE/auth.ts'); const {getMigrations}=await import('better-auth/db/migration'); await (await getMigrations(getAuth().options)).runMigrations(); await import('./BE/server.ts');"], { env: { ...process.env, APP_DATA_DIR: directory, DATABASE_URL: "", DATABASE_URL_UNPOOLED: "", VERCEL: "", API_PORT: "18291", BETTER_AUTH_URL: origin, BETTER_AUTH_SECRET: "isolated-test-secret-at-least-32-characters", EMAIL_OTP_ENABLED: "false" }, stdio: "ignore" });
  try {
    let ready = false;
    for (let attempt = 0; attempt < 100; attempt++) {
      try { ready = (await fetch(origin + "/api/public/auth-config")).ok; } catch { /* Máy chủ có thể đang nạp module lần đầu. */ }
      if (ready) break;
      if (child.exitCode !== null) throw new Error("Backend dừng trước khi sẵn sàng.");
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    assert.ok(ready, "Backend phải khởi động được");
    const config = await (await fetch(origin + "/api/public/auth-config")).json();
    assert.deepEqual(Object.keys(config).sort(), ["googleEnabled", "otpEnabled"]);
    assert.equal((await fetch(origin + "/api/app/me")).status, 401);
    assert.equal((await fetch(origin + "/api/public/shares/invalid")).status, 200);
    assert.equal((await fetch(origin + "/api/public/shares/invalid")).headers.get("content-type")?.includes("json"), true);
    // Đăng ký thật trên database tạm để phát hiện lỗi chuyển Set-Cookie giữa Node và Web API.
    const signup = await fetch(origin + "/api/auth/sign-up/email", { method: "POST", headers: { "content-type": "application/json", origin }, body: JSON.stringify({ name: "HTTP Test", email: "transport@example.test", password: "temporary-test-password-123" }) });
    assert.equal(signup.status, 200);
    const cookie = signup.headers.getSetCookie().map(value => value.split(";")[0]).join("; ");
    assert.ok(cookie);
    const session = await (await fetch(origin + "/api/auth/get-session", { headers: { cookie } })).json();
    assert.equal(session.user.email, "transport@example.test");
    assert.equal((await fetch(origin + "/api/app/admin/users", { headers: { cookie } })).status, 403);
  } finally {
    // Dừng tiến trình con kể cả khi assertion thất bại để không giữ cổng kiểm thử.
    child.kill("SIGTERM");
  }
});
