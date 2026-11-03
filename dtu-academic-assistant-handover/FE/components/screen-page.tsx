// Mục đích file: Cung cấp khung trang dùng chung cho các màn hình ứng dụng.
import "server-only";
import { Suspense, type ReactNode } from "react";
import { redirect } from "next/navigation";
import { routes, type Screen } from "@/lib/routes";
import { pageSession } from "@/lib/server-api";
import { AppShell } from "./app-shell";

const publicScreens = new Set<Screen>(["login", "register", "resetPassword"]);

export async function ScreenPage({
  screen,
  children,
}: {
  screen: Screen;
  children: ReactNode;
}) {
  const current = await pageSession();
  const isPublic = publicScreens.has(screen);
  if (!isPublic && !current) redirect(routes.login);
  if (routes[screen].startsWith("/quan-tri") && current?.user.role !== "admin")
    redirect(routes.home);
  if (screen === "login" && current)
    redirect(current.user.role === "admin" ? routes.dashboard : routes.home);

  const content = (
    <Suspense fallback={<p role="status">Đang mở màn hình…</p>}>
      {children}
    </Suspense>
  );
  return isPublic ? content : <AppShell screen={screen}>{content}</AppShell>;
}
