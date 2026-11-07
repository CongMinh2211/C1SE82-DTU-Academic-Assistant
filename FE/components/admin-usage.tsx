// Mục đích file: Hiển thị thông tin sử dụng trong khu vực quản trị.
"use client";
import Link from "next/link";
import { useState } from "react";
import { routes } from "@/lib/routes";
import { useResource } from "@/lib/api-client";
import { usageTopics, type UsageReport } from "@/lib/usage";
import { ResourceState } from "./live-shared";
import { Card, EmptyState, Heading, Select } from "./ui";

export function UsageChart({ data }: { data: UsageReport }) {
  // Dùng giá trị ít nhất bằng một để tính tỷ lệ cột an toàn khi chưa có lượt hỏi.
  const max = Math.max(1, ...data.daily.map((day) => day.count));
  // Giãn mật độ nhãn theo số ngày để biểu đồ dài không bị chồng chữ.
  const step = data.days > 30 ? 10 : data.days > 7 ? 4 : 1;
  return (
    <>
      <div className="section-heading">
        <h2>Lượt hỏi theo ngày</h2>
        <strong className="usage-total">
          {data.total.toLocaleString("vi-VN")} lượt hỏi
        </strong>
      </div>
      <p className="muted usage-caption">
        {data.from.split("-").reverse().join("/")} –{" "}
        {data.to.split("-").reverse().join("/")} · Giờ Việt Nam
      </p>
      {data.total === 0 ? (
        <EmptyState>
          Chưa có lượt hỏi trong khoảng thời gian và chủ đề này.
        </EmptyState>
      ) : (
        <div className="usage-chart-scroll">
          <div
            className="usage-chart"
            style={{
              gridTemplateColumns: `repeat(${data.daily.length}, minmax(${data.days > 7 ? 14 : 28}px, 1fr))`,
            }}
            role="img"
            aria-label={`${data.total} lượt hỏi trong ${data.days} ngày; xem bảng số liệu chi tiết bên dưới.`}
          >
            {data.daily.map((day, index) => (
              <div
                className="usage-day"
                key={day.date}
                title={`${day.date}: ${day.count} lượt hỏi`}
              >
                <span className="usage-bar-value">
                  {data.days <= 7 ? day.count : ""}
                </span>
                <div className="usage-bar-track">
                  <span
                    className={
                      day.count === max ? "usage-bar peak" : "usage-bar"
                    }
                    style={{ height: `${(day.count / max) * 100}%` }}
                  />
                </div>
                <small>
                  {index % step === 0 || index === data.daily.length - 1
                    ? day.date.slice(8) + "/" + day.date.slice(5, 7)
                    : ""}
                </small>
              </div>
            ))}
          </div>
        </div>
      )}
      <details className="usage-data">
        <summary>Xem số liệu chi tiết</summary>
        <div className="table-scroll">
          <table>
            <caption className="visually-hidden">Lượt hỏi theo ngày</caption>
            <thead>
              <tr>
                <th>Ngày</th>
                <th>Lượt hỏi</th>
              </tr>
            </thead>
            <tbody>
              {data.daily.map((day) => (
                <tr key={day.date}>
                  <td>{day.date.split("-").reverse().join("/")}</td>
                  <td>{day.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </>
  );
}
export function UsageTopics({
  data,
  onSelect,
}: {
  data: UsageReport;
  onSelect?: (topic: string) => void;
}) {
  return (
    <>
      <h2>Chủ đề được quan tâm</h2>
      <p className="muted usage-caption">
        Phân nhóm tự động từ nội dung câu hỏi, gồm cả trò chuyện.
      </p>
      <div className="usage-topics">
        {data.topics
          .filter((topic) => topic.count > 0)
          .map((topic) => (
            <button
              type="button"
              className="usage-topic"
              key={topic.label}
              onClick={() => onSelect?.(topic.label)}
              disabled={!onSelect}
            >
              <span>
                <strong>{topic.label}</strong>
                <small>
                  {topic.count.toLocaleString("vi-VN")} lượt ·{" "}
                  {topic.percentage}%
                </small>
              </span>
              <span className="usage-topic-track">
                <span style={{ width: `${topic.percentage}%` }} />
              </span>
            </button>
          ))}
      </div>
      {data.total === 0 && (
        <EmptyState>Chưa có dữ liệu để phân nhóm chủ đề.</EmptyState>
      )}
    </>
  );
}
export function DashboardUsage() {
  const r = useResource<UsageReport>("admin/analytics?days=7");
  return (
    <Card className="dashboard-chart">
      <ResourceState {...r} retry={r.refresh} />
      {r.data && <UsageChart data={r.data} />}
      <Link className="text-link" href={routes.analytics}>
        Xem thống kê chi tiết →
      </Link>
    </Card>
  );
}
export function UsageAnalytics() {
  const [days, setDays] = useState("7"),
    [topic, setTopic] = useState("");
  const r = useResource<UsageReport>(
    `admin/analytics?days=${days}&topic=${encodeURIComponent(topic)}`,
  );
  return (
    <>
      <Heading
        title="Thống kê sử dụng"
        description="Theo dõi lượt hỏi theo thời gian và nhu cầu của sinh viên."
      />
      <div className="filter-row analytics-filters">
        <label className="field">
          <span>Khoảng thời gian</span>
          <Select value={days} onChange={(e) => setDays(e.target.value)}>
            <option value="7">7 ngày gần nhất</option>
            <option value="30">30 ngày gần nhất</option>
            <option value="90">90 ngày gần nhất</option>
          </Select>
        </label>
        <label className="field">
          <span>Chủ đề</span>
          <Select value={topic} onChange={(e) => setTopic(e.target.value)}>
            <option value="">Tất cả chủ đề</option>
            {usageTopics.map((label) => (
              <option key={label}>{label}</option>
            ))}
          </Select>
        </label>
      </div>
      <ResourceState {...r} retry={r.refresh} />
      {r.data && (
        <div className="analytics-layout">
          <Card>
            <UsageChart data={r.data} />
          </Card>
          <Card>
            <UsageTopics data={r.data} onSelect={setTopic} />
          </Card>
          <Card>
            <h2>Kết quả các lượt hỏi</h2>
            <p className="muted usage-caption">
              Số lượt theo trạng thái xử lý, không phải đánh giá độ chính xác.
            </p>
            {r.data.outcomes.length ? (
              <div className="usage-topics">
                {r.data.outcomes.map((outcome) => (
                  <div className="usage-topic" key={outcome.status}>
                    <span>
                      <strong>
                        {(
                          {
                            answered: "Có nguồn",
                            insufficient: "Chưa đủ nguồn",
                            clarification: "Cần làm rõ",
                            conversation: "Trò chuyện",
                            error: "Lỗi",
                            processing: "Đang xử lý",
                          } as Record<string, string>
                        )[outcome.status] || outcome.status}
                      </strong>
                      <small>
                        {outcome.count} lượt · {outcome.percentage}%
                      </small>
                    </span>
                    <span className="usage-topic-track">
                      <span style={{ width: `${outcome.percentage}%` }} />
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState>Chưa có dữ liệu.</EmptyState>
            )}
          </Card>
        </div>
      )}
    </>
  );
}
