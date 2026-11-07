// Mục đích file: Hiển thị dữ liệu tổng quan và các lối vào công việc quản trị.
"use client";
import { useResource, dateText } from "@/lib/api-client";
import { routes } from "@/lib/routes";
import { DashboardUsage } from "@/components/admin-usage";
import { ResourceState, Status } from "@/components/live-shared";
import {
  ButtonLink,
  CampusImage,
  Card,
  EmptyState,
  Heading,
  IconTile,
  Notice,
} from "@/components/ui";

type Stats = {
  users: number;
  documents: number;
  published: number;
  questions: number;
  answered: number;
  insufficient: number;
  pendingDocuments: number;
  unanswered: number;
  feedback: number;
  chunks: number;
  workerAlive: boolean;
  webSearch: {
    configured: boolean;
    available: boolean;
    checkedAt: string | null;
    status?: "ready" | "degraded";
    at?: string;
  };
  recent: { question: string; status: string; created_at: string }[];
};

export function AdminDashboard() {
  // Tải thống kê thực từ API và làm mới mỗi mười giây khi trang còn mở.
  const resource = useResource<Stats>("admin/stats", 10000),
    s = resource.data;
  return (
    <>
      <Heading
        title="Chào bạn, quản trị viên"
        description="Giữ nguồn học vụ chính xác, có thể kiểm tra và truy vết."
        action={
          <ButtonLink href={routes.addSource} variant="primary">
            Thêm nguồn mới
          </ButtonLink>
        }
      />
      <ResourceState {...resource} retry={resource.refresh} />
      <section className="admin-banner">
        <div>
          <h2>Cùng xây dựng nguồn học vụ đáng tin cậy</h2>
          <p>
            {s
              ? `${s.published} tài liệu đang xuất bản; ${s.feedback} góp ý đang chờ xử lý.`
              : "Đang tải thông tin kho tri thức…"}
          </p>
        </div>
        <CampusImage variant="admin" />
      </section>
      <div className="metrics-grid overview-metrics">
        {[
          ["Câu hỏi đã tiếp nhận", s?.questions, "chat", "blue"],
          ["Có nguồn", s?.answered, "check", "teal"],
          ["Tài liệu xuất bản", s?.published, "file", "teal"],
          ["Chưa đủ nguồn", s?.insufficient, "help", "amber"],
          ["Phản hồi chờ xử lý", s?.feedback, "heart", "red"],
        ].map(([label, value, icon, tone]) => (
          <Card className="metric-card" key={String(label)}>
            <div className="metric-label">
              <IconTile
                name={String(icon)}
                tone={tone as "blue" | "teal" | "amber" | "red"}
              />
              <span>{label}</span>
            </div>
            <span className="metric-value">{value ?? "—"}</span>
            <small>Dữ liệu thực tế trong hệ thống</small>
          </Card>
        ))}
      </div>
      {s && !s.workerAlive && (
        <Notice tone="amber" title="Tiến trình lập chỉ mục chưa hoạt động">
          Các tác vụ mới sẽ chờ cho tới khi tiến trình xử lý tài liệu được khởi
          động.
        </Notice>
      )}
      <div className="dashboard-insights">
        <DashboardUsage />
        <Card className="priority-card">
          <h2>Ưu tiên hôm nay</h2>
          <ButtonLink href={`${routes.documents}?trang-thai=ready`}>
            Rà soát nguồn mới{" "}
            <span className="count-pill">{s?.pendingDocuments ?? "—"}</span>
          </ButtonLink>
          <ButtonLink href={routes.review}>
            Phản hồi cần xử lý{" "}
            <span className="count-pill">{s?.feedback ?? "—"}</span>
          </ButtonLink>
          <ButtonLink href={routes.indexing} variant="primary">
            Theo dõi xử lý tài liệu
          </ButtonLink>
        </Card>
      </div>
      <div className="equal-columns">
        <Card>
          <h2>Những câu hỏi gần đây</h2>
          {s?.recent.map((q, i) => (
            <div className="record" key={i}>
              <span className="record-copy">
                <strong>{q.question}</strong>
                <small>{dateText(q.created_at)}</small>
              </span>
              <Status value={q.status} />
            </div>
          ))}
          {s?.recent.length === 0 && (
            <EmptyState>Chưa có câu hỏi trong hệ thống.</EmptyState>
          )}
          <ButtonLink href={routes.audit}>Xem nhật ký tra cứu</ButtonLink>
        </Card>
        <Card>
          <h2>Tình trạng kho tri thức</h2>
          <dl className="profile-details">
            <div>
              <dt>Tài khoản</dt>
              <dd>{s?.users ?? "—"}</dd>
            </div>
            <div>
              <dt>Tài liệu đang quản lý</dt>
              <dd>{s?.documents ?? "—"}</dd>
            </div>
            <div>
              <dt>Đoạn nguồn đang phục vụ</dt>
              <dd>{s?.chunks ?? "—"}</dd>
            </div>
            <div>
              <dt>Câu trả lời có nguồn</dt>
              <dd>{s?.answered ?? "—"}</dd>
            </div>
            <div>
              <dt>Tìm kiếm toàn web</dt>
              <dd>
                {!s
                  ? "—"
                  : s.webSearch.available
                    ? "Dịch vụ hoạt động"
                    : s.webSearch.configured
                      ? "Tạm gián đoạn"
                      : "Chưa cấu hình"}
              </dd>
            </div>
            <div>
              <dt>Lập chỉ mục tài liệu</dt>
              <dd>
                {!s ? "—" : s.workerAlive ? "Đang hoạt động" : "Chưa hoạt động"}
              </dd>
            </div>
          </dl>
          {s?.webSearch.status === "degraded" && (
            <p className="form-error">
              Lần tìm web gần nhất bị gián đoạn; trợ lý đang dùng các nguồn còn
              truy cập được.
            </p>
          )}
          <ButtonLink href={routes.documents}>Quản lý tài liệu</ButtonLink>
        </Card>
      </div>
    </>
  );
}
