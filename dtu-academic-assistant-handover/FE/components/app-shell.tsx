// Mục đích file: Ghép sidebar, header và nội dung để tạo bố cục ứng dụng.
"use client";
import { useShellNavigation } from "@/components/shell/use-shell-navigation";
import { ShellSidebar } from "@/components/shell/sidebar";
import { ShellHeader } from "@/components/shell/header";
import { AccountMenu } from "@/components/shell/account-menu";

import { type ReactNode } from "react";
import { type Screen } from "@/lib/routes";

export function AppShell({
  screen,
  children,
}: {
  screen: Screen;
  children: ReactNode;
}) {
  // Hook tập trung trạng thái menu và tài khoản để header, sidebar dùng chung.
  const {
    admin,
    menuOpen,
    collapsed,
    toggleCollapsed,
    userOpen,
    signingOut,
    setMenuOpen,
    setUserOpen,
    setSigningOut,
    user,
    showModal,
    notify,
    sidebar,
    menuTrigger,
    userTrigger,
    userPanel,
    router,
    active,
    nav,
  } = useShellNavigation(screen);
  return (
    <div
      className={`app-shell ${admin ? "is-admin" : ""} ${collapsed ? "sidebar-collapsed" : ""}`}
    >
      <a className="skip-link" href="#main-content">
        Đến nội dung chính
      </a>
      {menuOpen && (
        <button
          className="sidebar-backdrop"
          onClick={() => setMenuOpen(false)}
          aria-label="Đóng điều hướng"
        />
      )}
      <ShellSidebar
        sidebar={sidebar}
        menuOpen={menuOpen}
        admin={admin}
        active={active}
        nav={nav}
        user={user}
        setMenuOpen={setMenuOpen}
        setUserOpen={setUserOpen}
        userOpen={userOpen}
      />
      <div className="workspace">
        <ShellHeader
          screen={screen}
          menuTrigger={menuTrigger}
          menuOpen={menuOpen}
          collapsed={collapsed}
          toggleCollapsed={toggleCollapsed}
          setMenuOpen={setMenuOpen}
          showModal={showModal}
          userTrigger={userTrigger}
          admin={admin}
          userOpen={userOpen}
          setUserOpen={setUserOpen}
          user={user}
        />
        {userOpen && (
          <AccountMenu
            userPanel={userPanel}
            user={user}
            setUserOpen={setUserOpen}
            admin={admin}
            signingOut={signingOut}
            setSigningOut={setSigningOut}
            router={router}
            notify={notify}
          />
        )}
        <main
          id="main-content"
          className={`main-content screen-${screen}`}
          tabIndex={-1}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
