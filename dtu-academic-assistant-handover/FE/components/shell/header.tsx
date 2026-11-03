// Mục đích file: Hiển thị thanh đầu trang và các thao tác điều hướng chính.
import { screens, type Screen } from "@/lib/routes";
import { Icon } from "@/components/ui";

import type { ShellNavigation } from "@/components/shell/use-shell-navigation";
export function ShellHeader({
  screen,
  menuTrigger,
  menuOpen,
  collapsed,
  toggleCollapsed,
  setMenuOpen,
  showModal,
  userTrigger,
  admin,
  userOpen,
  setUserOpen,
  user,
}: Pick<
  ShellNavigation,
  | "menuTrigger"
  | "menuOpen"
  | "collapsed"
  | "toggleCollapsed"
  | "setMenuOpen"
  | "showModal"
  | "userTrigger"
  | "admin"
  | "userOpen"
  | "setUserOpen"
  | "user"
> & { screen: Screen }) {
  // Các nút dùng chung trạng thái menu với sidebar và thể hiện màn hình hiện tại.
  return (
    <header className="application-bar">
      <button
        ref={menuTrigger}
        type="button"
        className="mobile-menu icon-button"
        aria-label="Mở điều hướng"
        aria-expanded={menuOpen}
        aria-controls="main-navigation"
        onClick={() => setMenuOpen(!menuOpen)}
      >
        ☰
      </button>
      <button
        type="button"
        className="desktop-menu icon-button"
        aria-label={collapsed ? "Mở rộng menu" : "Thu gọn menu"}
        aria-expanded={!collapsed}
        aria-controls="main-navigation"
        onClick={toggleCollapsed}
      >
        ☰
      </button>
      <p className="header-breadcrumb">
        {screens.find((item) => item.screen === screen)?.breadcrumb}
      </p>
      <span className="header-spacer" />
      <button
        type="button"
        className="icon-button notification-button"
        aria-label="Thông tin trợ lý"
        onClick={() =>
          showModal(
            "Thông tin trợ lý",
            <div className="stack">
              <p>
                Trợ lý tra cứu tài liệu học vụ và tự tìm thông tin liên quan DTU
                trên toàn web.
              </p>
              <p className="muted">
                Ưu tiên nguồn chính thức và ghi rõ nguồn cho thông tin tra cứu.
                Khi chưa xác minh được, trợ lý sẽ nói rõ.
              </p>
            </div>,
          )
        }
      >
        <Icon name="help" tone="muted" />
      </button>
      <button
        ref={userTrigger}
        type="button"
        className="header-user"
        aria-label={admin ? "Mở menu quản trị viên" : "Mở menu sinh viên"}
        aria-expanded={userOpen}
        aria-controls="account-menu"
        onClick={() => setUserOpen(!userOpen)}
      >
        <Icon name="user" />
        <strong>
          {admin
            ? "Quản trị viên"
            : `Chào ${user?.name.split(" ").at(-1) || "bạn"}`}
        </strong>
      </button>
    </header>
  );
}
