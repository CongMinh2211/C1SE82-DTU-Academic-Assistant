// Mục đích file: Hiển thị menu tài khoản và các thao tác liên quan đến phiên đăng nhập.
import Link from "next/link";

import { authClient } from "@/lib/auth-client";

import { routes } from "@/lib/routes";

import type { ShellNavigation } from "@/components/shell/use-shell-navigation";
export function AccountMenu({
  userPanel,
  user,
  setUserOpen,
  admin,
  signingOut,
  setSigningOut,
  router,
  notify,
}: Pick<
  ShellNavigation,
  | "userPanel"
  | "user"
  | "setUserOpen"
  | "admin"
  | "signingOut"
  | "setSigningOut"
  | "router"
  | "notify"
>) {
  // Liên kết và đăng xuất thao tác qua trạng thái, router và dịch vụ xác thực được truyền từ shell.
  return (
    <div
      className="user-menu"
      id="account-menu"
      ref={userPanel}
      aria-label="Tài khoản"
    >
      <strong>{user?.name}</strong>
      <Link href={routes.profile} onClick={() => setUserOpen(false)}>
        Thông tin tài khoản
      </Link>
      <Link
        href={admin ? routes.adminSettings : routes.settings}
        onClick={() => setUserOpen(false)}
      >
        Cài đặt
      </Link>
      {user?.role === "admin" && (
        <Link
          href={admin ? routes.home : routes.dashboard}
          onClick={() => setUserOpen(false)}
        >
          {admin ? "Xem giao diện sinh viên" : "Xem giao diện quản trị"}
        </Link>
      )}
      <button
        type="button"
        disabled={signingOut}
        onClick={async () => {
          setSigningOut(true);
          try {
            const result = await authClient.signOut();
            if (result.error)
              throw new Error("Không thể đăng xuất. Vui lòng thử lại.");
            setUserOpen(false);
            router.replace(routes.login);
            router.refresh();
          } catch (e) {
            notify(e instanceof Error ? e.message : "Không thể đăng xuất.");
          } finally {
            setSigningOut(false);
          }
        }}
      >
        {signingOut ? "Đang đăng xuất…" : "Đăng xuất"}
      </button>
      <button type="button" onClick={() => setUserOpen(false)}>
        Đóng menu
      </button>
    </div>
  );
}
