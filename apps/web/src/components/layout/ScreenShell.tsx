import Link from "next/link";

type ScreenShellProps = {
  area: "student" | "admin";
  title: string;
  description: string;
};

const studentLinks = [
  ["Trang chủ", "/student"], ["Hỏi đáp học vụ", "/student/chat"],
  ["FAQ & thủ tục", "/student/faq"], ["Lịch sử", "/student/history"],
  ["Góp ý", "/student/feedback"],
];
const adminLinks = [
  ["Tổng quan", "/admin"], ["Tài liệu & nguồn", "/admin/documents"],
  ["Xử lý & lập chỉ mục", "/admin/processing"], ["Quản lý FAQ", "/admin/faqs"],
  ["Phản hồi", "/admin/feedback"], ["Lịch sử & nhật ký", "/admin/audit"],
];

export function ScreenShell({ area, title, description }: ScreenShellProps) {
  const links = area === "student" ? studentLinks : adminLinks;
  return <div style={{ display: "grid", gridTemplateColumns: "minmax(210px, 240px) 1fr", minHeight: "100vh" }}>
    <aside style={{ background: "var(--paper)", borderRight: "1px solid var(--line)", padding: 24 }}>
      <strong style={{ color: "var(--dtu-red)" }}>DUY TAN UNIVERSITY</strong>
      <p style={{ color: "var(--muted)", fontSize: 13 }}>ACADEMIC ASSISTANT</p>
      <nav aria-label={area === "student" ? "Student" : "Administrator"} style={{ display: "grid", gap: 14, marginTop: 36 }}>
        {links.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}
      </nav>
    </aside>
    <main style={{ padding: "clamp(24px, 5vw, 64px)", maxWidth: 1300 }}>
      <small style={{ color: "var(--muted)" }}>{area === "student" ? "Student" : "Administrator"} / {title}</small>
      <h1>{title}</h1>
      <p>{description}</p>
      <p style={{ color: "var(--muted)" }}>Khung màn hình đã tạo. Giao diện và dữ liệu thật sẽ được triển khai ở task tương ứng.</p>
    </main>
  </div>;
}
