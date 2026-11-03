// Mục đích file: Quản lý trạng thái điều hướng, mở và thu gọn menu ứng dụng.
import { useRouter } from "next/navigation";

import { useEffect, useRef, useState } from "react";
import {
  adminNavigation,
  studentNavigation,
  routes,
  type Screen,
} from "@/lib/routes";

import { useApp } from "@/components/app-provider";

export function useShellNavigation(screen: Screen) {
  // Dùng đường dẫn của màn hình để chọn menu sinh viên hoặc quản trị.
  const admin = routes[screen].startsWith("/quan-tri");
  const [menuOpen, setMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  function toggleCollapsed() {
    // Đảo trạng thái hiển thị sidebar trên màn hình rộng.
    setCollapsed((previous) => !previous);
  }
  const [userOpen, setUserOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const { showModal, user, notify } = useApp();
  const sidebar = useRef<HTMLElement>(null),
    menuTrigger = useRef<HTMLButtonElement>(null),
    userTrigger = useRef<HTMLButtonElement>(null),
    userPanel = useRef<HTMLDivElement>(null);
  const router = useRouter();
  // Các màn hình con vẫn tô sáng mục điều hướng cha tương ứng.
  const active: Screen =
    (
      {
        fallback: "chat",
        source: "chat",
        sent: "chat",
        addSource: "documents",
        faqEditor: "adminFaq",
      } as Partial<Record<Screen, Screen>>
    )[screen] ?? screen;
  const nav = admin ? adminNavigation : studentNavigation;
  useEffect(() => {
    // Phím Escape đóng menu và trả tiêu điểm về nút đã mở menu.
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (menuOpen) menuTrigger.current?.focus();
        if (userOpen) userTrigger.current?.focus();
        setMenuOpen(false);
        setUserOpen(false);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen, userOpen]);
  useEffect(() => {
    if (!menuOpen) return;
    // Khi menu di động mở, khóa cuộn nền và đưa tiêu điểm vào liên kết đầu tiên.
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    sidebar.current?.querySelector<HTMLElement>("a")?.focus();
    const resize = () => {
      if (window.innerWidth > 900) setMenuOpen(false);
    };
    // Giữ điều hướng Tab trong menu để người dùng bàn phím không bị lạc tiêu điểm.
    const trap = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const items = [
        ...(sidebar.current?.querySelectorAll<HTMLElement>(
          "a[href],button:not(:disabled)",
        ) || []),
      ];
      if (!items.length) return;
      if (e.shiftKey && document.activeElement === items[0]) {
        e.preventDefault();
        items.at(-1)?.focus();
      } else if (!e.shiftKey && document.activeElement === items.at(-1)) {
        e.preventDefault();
        items[0].focus();
      }
    };
    document.addEventListener("keydown", trap);
    window.addEventListener("resize", resize);
    return () => {
      document.body.style.overflow = before;
      document.removeEventListener("keydown", trap);
      window.removeEventListener("resize", resize);
    };
  }, [menuOpen]);
  useEffect(() => {
    if (!userOpen) return;
    // Đóng menu tài khoản khi bấm ra ngoài, đồng thời không coi nút mở menu là vùng ngoài.
    userPanel.current?.querySelector<HTMLElement>("a")?.focus();
    const outside = (e: PointerEvent) => {
      const target = e.target as Node;
      if (
        !userPanel.current?.contains(target) &&
        !userTrigger.current?.contains(target) &&
        !(target as Element).closest?.(".side-profile")
      )
        setUserOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [userOpen]);
  return {
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
  };
}
export type ShellNavigation = ReturnType<typeof useShellNavigation>;
