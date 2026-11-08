import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DTU Academic Assistant",
  description: "Trợ lý thông tin học vụ Đại học Duy Tân",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="vi"><body>{children}</body></html>;
}
