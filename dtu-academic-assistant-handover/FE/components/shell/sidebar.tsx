// Mục đích file: Hiển thị thanh điều hướng theo vai trò và trạng thái menu.
import Link from "next/link";

import { routes } from "@/lib/routes";
import { Icon, IconTile, Logo, ButtonLink } from "@/components/ui";

import type { ShellNavigation } from "@/components/shell/use-shell-navigation";
export function ShellSidebar({
  sidebar,
  menuOpen,
  admin,
  active,
  nav,
  user,
  setMenuOpen,
  setUserOpen,
  userOpen,
}: Pick<
  ShellNavigation,
  | "sidebar"
  | "menuOpen"
  | "admin"
  | "active"
  | "nav"
  | "user"
  | "setMenuOpen"
  | "setUserOpen"
  | "userOpen"
>) {
  // Danh sách nav và mục active do hook điều hướng xác định theo vai trò và màn hình.
  return (
    <aside
      ref={sidebar}
      id="main-navigation"
      className={`sidebar ${menuOpen ? "sidebar-open" : ""}`}
      aria-label={admin ? "Điều hướng quản trị" : "Điều hướng sinh viên"}
    >
      <Link
        href={admin ? routes.dashboard : routes.home}
        className="brand"
        onClick={() => setMenuOpen(false)}
      >
        <Logo />
        <span>{admin ? "ADMIN WORKSPACE" : "ACADEMIC ASSISTANT"}</span>
      </Link>
      <nav className="side-navigation">
        {nav.map((item) => (
          <Link
            key={item.screen}
            href={routes[item.screen]}
            title={item.label}
            aria-label={item.label}
            aria-current={active === item.screen ? "page" : undefined}
            className={`nav-item ${active === item.screen ? "nav-active" : ""}`}
            onClick={() => setMenuOpen(false)}
          >
            <Icon
              name={item.icon}
              size={20}
              tone={active === item.screen ? "blue" : "muted"}
            />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
      <div className="side-spacer" />
      <section className="side-help">
        <IconTile name="help" size={36} />
        <strong>
          {admin ? "Cùng giữ nguồn tin đúng" : "Cần thêm trợ giúp?"}
        </strong>
        <p>
          {admin
            ? "Kiểm tra nội dung và phiên bản trước khi xuất bản."
            : "Trợ lý giúp bạn tìm đúng thông tin học vụ."}
        </p>
        <ButtonLink href={admin ? routes.documents : routes.chat}>
          {admin ? "Xem nguồn" : "Hỏi trợ lý"}
        </ButtonLink>
      </section>
      <button
        type="button"
        className="side-profile"
        onClick={() => {
          setMenuOpen(false);
          setUserOpen(!userOpen);
        }}
        aria-label="Mở menu tài khoản"
      >
        <IconTile name="user" tone="muted" />
        <span>
          <strong>{user?.name}</strong>
          <small>{admin ? "C1SE.82 • Admin" : "Sinh viên DTU"}</small>
        </span>
      </button>
    </aside>
  );
}
