// Mục đích file: Hiển thị nhật ký hoạt động quản trị để theo dõi thay đổi đã thực hiện.
"use client";
import { useEffect, useState } from "react";
import { api, useResource, dateText } from "@/lib/api-client";
import type { Citation } from "@/lib/contracts";
import { AdminPagination } from "@/components/admin-controls";
import { ResourceState, Status } from "@/components/live-shared";
import {
  Card,
  EmptyState,
  Heading,
  SearchInput,
  Select,
} from "@/components/ui";

type Trace = {
  id: string;
  question: string;
  status: string;
  model: string;
  latency_ms: number;
  reason: string;
  created_at: string;
};

type AuditEvent = {
  id: string;
  action: string;
  actor_name: string | null;
  entity_id: string;
  detail: string;
  created_at: string;
};

const auditLabels: Record<string, string> = {
  "document.uploaded": "Thêm tài liệu",
  "document.updated": "Cập nhật tài liệu",
  "document.published": "Xuất bản tài liệu",
  "document.archived": "Gỡ nguồn khỏi kho tra cứu",
  "document.revision_created": "Thêm phiên bản tài liệu",
  "document.reindex_queued": "Yêu cầu lập chỉ mục lại",
  "knowledge.indexed": "Hoàn tất lập chỉ mục",
  "revision.published": "Xuất bản phiên bản",
  "revision.created": "Thêm phiên bản",
  "faq.saved": "Lưu câu hỏi thường gặp",
  "faq.draft": "Lưu bản nháp FAQ",
  "faq.published": "Xuất bản FAQ",
  "faq.unpublished": "Gỡ xuất bản FAQ",
  "faq.review_20261027": "Cập nhật FAQ theo review",
  "faq.deleted": "Xóa FAQ",
  "feedback.resolved": "Xử lý phản hồi",
  "profile.updated": "Cập nhật hồ sơ",
  "conversation.trashed": "Chuyển cuộc trò chuyện vào thùng rác",
  "conversation.restored": "Khôi phục cuộc trò chuyện",
  "conversation.renamed": "Đổi tên cuộc trò chuyện",
  "question.answer_viewed": "Xem câu trả lời của sinh viên",
  "question.source_viewed": "Xem tài liệu nguồn của câu trả lời",
  "user.updated": "Cập nhật tài khoản",
  "user.deleted": "Xóa tài khoản",
};

function AnswerReview({ traceId }: { traceId: string }) {
  const [answer, setAnswer] = useState<{
    answer: string;
    citations: Citation[];
  } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  // Chỉ tải nội dung khi quản trị viên chủ động xem và ghi nhận lượt truy cập ở máy chủ.
  async function open() {
    setBusy(true);
    setError("");
    try {
      const result = await api<{ answer: string; citations: Citation[] }>(
        `admin/audit/${encodeURIComponent(traceId)}/answer`,
        { method: "POST" },
      );
      setAnswer(result);
    } catch (e) {
      setError((e as Error).message || "Không thể tải câu trả lời.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="trace-detail">
      {answer === null ? (
        <button type="button" onClick={() => void open()} disabled={busy}>
          {busy ? "Đang tải…" : "Xem câu trả lời"}
        </button>
      ) : (
        <>
          <strong>Câu trả lời</strong>
          <p style={{ whiteSpace: "pre-wrap" }}>
            {answer.answer || "Chưa có nội dung."}
          </p>
          {answer.citations.length > 0 && (
            <section aria-label="Nguồn tham khảo">
              <strong>Nguồn tham khảo</strong>
              {answer.citations.map((source) => (
                <details key={source.id} className="trace-detail">
                  <summary>
                    [{source.id}] {source.title} · trang {source.page}
                  </summary>
                  <p>{source.quote}</p>
                  <p>Phạm vi: {source.scope || "Chưa ghi nhận"}</p>
                  {source.documentId !== "web" && (
                    <a
                      href={`/api/app/admin/audit/${encodeURIComponent(traceId)}/source/${encodeURIComponent(source.id)}#page=${source.page}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Mở tài liệu gốc ↗
                    </a>
                  )}
                  {source.url?.startsWith("https://") && (
                    <p>
                      <a href={source.url} target="_blank" rel="noreferrer">
                        Mở website nguồn ↗
                      </a>
                    </p>
                  )}
                </details>
              ))}
            </section>
          )}
          <button type="button" onClick={() => setAnswer(null)}>
            Ẩn nội dung
          </button>
        </>
      )}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}

export function HistoryAudit() {
  const [view, setView] = useState("questions"),
    [search, setSearch] = useState(""),
    [query, setQuery] = useState(""),
    [status, setStatus] = useState(""),
    [page, setPage] = useState(1);
  // Chờ người dùng ngừng gõ 300 ms trước khi đổi bộ lọc để tránh gọi API mỗi ký tự.
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);
  // Máy chủ phân trang theo loại nhật ký, từ khóa và trạng thái được chọn.
  const r = useResource<{
    events: AuditEvent[];
    traces: Trace[];
    total: number;
    page: number;
    pageSize: number;
  }>(
    `admin/audit?view=${view}&page=${page}&q=${encodeURIComponent(query)}&status=${status}`,
  );
  return (
    <>
      <Heading
        title="Lịch sử & nhật ký hoạt động"
        description="Tìm lại câu hỏi và truy vết những thay đổi trong hệ thống."
      />
      <div className="tabs">
        {[
          ["questions", "Lịch sử hỏi đáp"],
          ["events", "Nhật ký hoạt động"],
        ].map(([id, label]) => (
          <button
            type="button"
            key={id}
            aria-pressed={view === id}
            onClick={() => {
              setView(id);
              setSearch("");
              setQuery("");
              setStatus("");
              setPage(1);
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <Card>
        <div className="filter-row">
          <SearchInput
            placeholder={
              view === "questions"
                ? "Tìm câu hỏi hoặc mã truy vết…"
                : "Tìm hoạt động hoặc mã sự kiện…"
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {view === "questions" && (
            <Select
              aria-label="Kết quả hỏi đáp"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Tất cả kết quả</option>
              <option value="answered">Có nguồn</option>
              <option value="insufficient">Chưa đủ nguồn</option>
              <option value="clarification">Cần làm rõ</option>
              <option value="conversation">Trò chuyện / hỗ trợ</option>
              <option value="error">Lỗi xử lý</option>
              <option value="processing">Đang xử lý</option>
            </Select>
          )}
        </div>
        <ResourceState {...r} retry={r.refresh} />
        <div className="table-scroll">
          <table>
            <thead>
              {view === "questions" ? (
                <tr>
                  <th>Câu hỏi / mã truy vết</th>
                  <th>Kết quả</th>
                  <th>Thời điểm</th>
                  <th>Thời gian xử lý</th>
                  <th>Chi tiết</th>
                </tr>
              ) : (
                <tr>
                  <th>Hoạt động</th>
                  <th>Thực hiện</th>
                  <th>Thời điểm</th>
                  <th>Đối tượng / chi tiết</th>
                </tr>
              )}
            </thead>
            <tbody>
              {view === "questions"
                ? r.data?.traces.map((t) => (
                    <tr key={t.id}>
                      <td>
                        <strong>{t.question}</strong>
                        <small className="table-subtitle">{t.id}</small>
                      </td>
                      <td>
                        <Status value={t.status} />
                      </td>
                      <td>{dateText(t.created_at)}</td>
                      <td>
                        {t.latency_ms == null
                          ? "—"
                          : `${(t.latency_ms / 1000).toFixed(1)} giây`}
                      </td>
                      <td>
                        <details className="trace-detail">
                          <summary>Chi tiết xử lý</summary>
                          <p>Model: {t.model || "—"}</p>
                          <pre>{t.reason || "Chưa có thông tin bổ sung."}</pre>
                        </details>
                        <AnswerReview traceId={t.id} />
                      </td>
                    </tr>
                  ))
                : r.data?.events.map((event) => (
                    <tr key={event.id}>
                      <td>
                        <strong>
                          {auditLabels[event.action] || event.action}
                        </strong>
                      </td>
                      <td>{event.actor_name || "Tiến trình hệ thống"}</td>
                      <td>{dateText(event.created_at)}</td>
                      <td>
                        <small>{event.entity_id || "—"}</small>
                        {event.detail && event.detail !== "{}" && (
                          <details className="trace-detail">
                            <summary>Chi tiết thay đổi</summary>
                            <pre>{event.detail}</pre>
                          </details>
                        )}
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
        {!r.loading && r.data?.total === 0 && (
          <EmptyState>Không có kết quả phù hợp với bộ lọc.</EmptyState>
        )}
        <AdminPagination
          total={r.data?.total || 0}
          page={r.data?.page || page}
          pageSize={20}
          onChange={setPage}
        />
      </Card>
    </>
  );
}
