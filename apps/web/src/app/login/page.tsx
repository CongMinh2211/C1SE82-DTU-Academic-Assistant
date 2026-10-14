import Link from "next/link";

export default function LoginPage() {
  return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
    <section style={{ width: "min(100%, 1080px)", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", background: "white", borderRadius: 18, overflow: "hidden", boxShadow: "0 20px 60px #172d4d1a" }}>
      <div style={{ background: "var(--navy)", color: "white", padding: 48 }}><strong>DUY TAN UNIVERSITY</strong><h1>Học vụ dễ hiểu.<br />Tự tin mỗi ngày.</h1><p>Thông tin từ nguồn được phê duyệt, có dẫn chứng rõ ràng.</p></div>
      <div style={{ padding: 48 }}><h2>Đăng nhập để bắt đầu</h2><p>Form này là vị trí tích hợp xác thực ở task sau; chưa thu thập mật khẩu.</p><label>Email sinh viên</label><input disabled placeholder="Nhập email của bạn" style={{ display: "block", width: "100%", margin: "8px 0 18px", padding: 12 }} /><label>Mật khẩu</label><input disabled type="password" placeholder="Nhập mật khẩu" style={{ display: "block", width: "100%", margin: "8px 0 18px", padding: 12 }} /><Link href="/student">Xem cấu trúc Student</Link><br /><Link href="/admin">Xem cấu trúc Admin</Link></div>
    </section>
  </main>;
}
