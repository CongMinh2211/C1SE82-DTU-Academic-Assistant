// Biểu mẫu OTP dùng API Better Auth; email và mã chỉ được gửi qua kết nối cùng origin.
"use client";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui";

export function OtpForm({ initialEmail, mode, onBack }: { initialEmail: string; mode: "verify" | "reset"; onBack: () => void }) {
  const [email, setEmail] = useState(initialEmail);
  const [sent, setSent] = useState(Boolean(initialEmail) && mode === "verify");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  async function call(endpoint: string, body: object) {
    const res = await fetch(`/api/auth/${endpoint}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!res.ok) throw new Error("Không thể xử lý yêu cầu. Mã có thể sai, hết hạn hoặc bạn đã thử quá nhiều lần.");
  }
  async function send() {
    setBusy(true); setError("");
    try {
      if (mode === "reset") await call("email-otp/request-password-reset", { email });
      else await call("email-otp/send-verification-otp", { email, type: "email-verification" });
      setSent(true);
      setNotice("Nếu địa chỉ hợp lệ cho yêu cầu này, mã sẽ được gửi. Vui lòng kiểm tra hộp thư và thư rác.");
    } catch { setError("Không thể gửi mã lúc này. Vui lòng chờ rồi thử lại."); }
    finally { setBusy(false); }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!sent) { await send(); return; }
    const data = new FormData(event.currentTarget);
    const otp = String(data.get("otp") || "");
    setBusy(true); setError("");
    try {
      if (mode === "verify") await call("email-otp/verify-email", { email, otp });
      else {
        const password = String(data.get("password") || "");
        if (password !== data.get("confirm")) throw new Error("Mật khẩu xác nhận chưa khớp.");
        await call("email-otp/reset-password", { email, otp, password });
      }
      setNotice(mode === "verify" ? "Đã xác minh email. Bạn có thể quay lại đăng nhập." : "Đã đặt lại mật khẩu. Bạn có thể quay lại đăng nhập.");
      setSent(false);
    } catch (e) { setError(e instanceof Error ? e.message : "Không thể xác minh mã."); }
    finally { setBusy(false); }
  }
  return <form className="login-form" onSubmit={submit}>
    <h2 className="login-title">{mode === "verify" ? "Xác minh email" : "Đặt lại mật khẩu"}</h2>
    <p>Nhập email tài khoản để nhận mã xác minh 6 chữ số. Mã có hiệu lực 5 phút.</p>
    <label className="field"><span>Email</span><input className="input" type="email" value={email} onChange={(e) => { setEmail(e.target.value); setSent(false); }} required maxLength={254} autoComplete="email" /></label>
    {sent && <label className="field"><span>Mã xác minh</span><input className="input" name="otp" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code" required /></label>}
    {sent && mode === "reset" && <><label className="field"><span>Mật khẩu mới</span><input className="input" name="password" type="password" minLength={12} maxLength={128} autoComplete="new-password" required /></label><label className="field"><span>Xác nhận mật khẩu</span><input className="input" name="confirm" type="password" minLength={12} maxLength={128} autoComplete="new-password" required /></label></>}
    {notice && <p role="status">{notice}</p>}{error && <p className="form-error" role="alert">{error}</p>}
    <Button type="submit" disabled={busy}>{busy ? "Đang xử lý…" : sent ? "Xác nhận" : "Gửi mã"}</Button>
    {sent && <Button type="button" variant="outline" disabled={busy || !email} onClick={() => void send()}>Gửi lại mã</Button>}
    <Button type="button" variant="outline" disabled={busy} onClick={onBack}>Quay lại đăng nhập</Button>
  </form>;
}
