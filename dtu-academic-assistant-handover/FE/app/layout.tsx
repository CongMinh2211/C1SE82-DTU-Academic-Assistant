import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AppProvider } from "@/components/app-provider";
import { pageSession } from "@/lib/server-api";
import "@fortawesome/fontawesome-svg-core/styles.css";
import "./globals.css";
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "vietnamese"],
  display: "swap",
});
export const metadata: Metadata = {
  title: "DTU Academic Assistant",
  description:
    "Tra cứu quy định học vụ với nguồn tài liệu và lịch sử hội thoại dành cho sinh viên Duy Tân.",
};
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const value = await pageSession();
  const user = value
    ? {
        id: value.user.id,
        name: value.user.name,
        email: value.user.email,
        role: value.user.role || "user",
        studentCode: value.user.studentCode,
        cohort: value.user.cohort,
        major: value.user.major,
      }
    : null;
  return (
    <html lang="vi" className={inter.variable}>
      <body>
        <AppProvider user={user}>{children}</AppProvider>
      </body>
    </html>
  );
}
