// Mục đích file: Hiển thị danh sách và thao tác xử lý phản hồi trong khu vực quản trị.
"use client";
import { useState, type FormEvent } from "react";
import { api, useResource, dateText } from "@/lib/api-client";
import type { Citation, FeedbackRecord } from "@/lib/contracts";
import { useApp } from "@/components/app-provider";
import { ResourceState, Status } from "@/components/live-shared";
import { Button, Card, EmptyState, Heading, IconTile } from "@/components/ui";
import { RevisionPreview } from "@/features/documents/components/revision-preview";

export function FeedbackReview() {
  // Lấy phản hồi, lọc theo trạng thái và chọn mục đầu tiên nếu chưa chọn cụ thể.
  const r = useResource<FeedbackRecord[]>("admin/feedback"),
    { notify, showModal } = useApp();
  const [status, setStatus] = useState("pending"),
    [selected, setSelected] = useState(""),
    [busy, setBusy] = useState(false);
  const filtered = r.data?.filter((f) => f.status === status) || [];
  const current = filtered.find((f) => f.id === selected) || filtered[0];
  // Dữ liệu nguồn được lưu dạng JSON; dữ liệu không đọc được trả về danh sách rỗng.
  const citations: Citation[] = (() => {
    try {
      return JSON.parse(current?.answer_citations || "[]");
    } catch {
      return [];
    }
  })();
  async function resolve(e: FormEvent<HTMLFormElement>) {
    // Ghi kết quả xử lý của phản hồi đang chọn rồi làm mới danh sách.
    e.preventDefault();
    if (!current || busy) return;
    setBusy(true);
    try {
      await api(`admin/feedback/${current.id}`, {
        method: "POST",
        body: JSON.stringify({
          resolution: new FormData(e.currentTarget).get("resolution"),
        }),
      });
      await r.refresh();
      notify("Đã lưu kết quả xử lý phản hồi.");
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Heading
        title="Phản hồi từ sinh viên"
        description="Kiểm tra câu trả lời, nguồn trích dẫn và ghi lại kết quả xử lý."
      />
      <div className="tabs">
        <button
          aria-pressed={status === "pending"}
          onClick={() => setStatus("pending")}
        >
          Chờ xử lý ({r.data?.filter((f) => f.status === "pending").length || 0}
          )
        </button>
        <button
          aria-pressed={status === "resolved"}
          onClick={() => setStatus("resolved")}
        >
          Đã xử lý ({r.data?.filter((f) => f.status === "resolved").length || 0}
          )
        </button>
      </div>
      <ResourceState {...r} retry={r.refresh} />
      <div className="equal-columns">
        <Card>
          <h2>Danh sách phản hồi</h2>
          {filtered.map((f) => (
            <button
              className={`record ${current?.id === f.id ? "selected-record" : ""}`}
              key={f.id}
              onClick={() => setSelected(f.id)}
            >
              <IconTile name="heart" />
              <span className="record-copy">
                <strong>{f.content.slice(0, 110)}</strong>
                <small>
                  {f.rating}/5 • {f.user_name} • {dateText(f.created_at)}
                </small>
              </span>
            </button>
          ))}
          {filtered.length === 0 && (
            <EmptyState>Không có phản hồi trong trạng thái này.</EmptyState>
          )}
        </Card>
        <Card>
          <h2>Chi tiết phản hồi</h2>
          {current ? (
            <>
              <Status value={current.status} />
              <p>{current.content}</p>
              {current.question && (
                <blockquote className="source-quote">
                  Câu hỏi: {current.question}
                </blockquote>
              )}
              {current.answer_content && (
                <details className="feedback-answer">
                  <summary>Câu trả lời đã nhận</summary>
                  <p className="answer-text">{current.answer_content}</p>
                  {citations.map((c) => (
                    <div className="feedback-source" key={c.id}>
                      <strong>
                        [{c.id}] {c.title}
                      </strong>
                      <p className="muted">{c.scope}</p>
                      {c.documentId === "web" &&
                      c.url?.startsWith("https://") ? (
                        <a
                          className="btn btn-outline"
                          href={c.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Mở website nguồn
                        </a>
                      ) : c.documentId !== "web" ? (
                        <Button
                          variant="outline"
                          onClick={() =>
                            showModal(
                              "Nguồn của câu trả lời",
                              <RevisionPreview revisionId={c.revisionId} />,
                            )
                          }
                        >
                          Đối chiếu nguồn
                        </Button>
                      ) : null}
                    </div>
                  ))}
                </details>
              )}
              <p>
                {current.rating}/5 sao • {current.category}
              </p>
              {current.status === "pending" ? (
                <form key={current.id} className="stack" onSubmit={resolve}>
                  <label className="field">
                    <span>Kết quả kiểm tra / hướng xử lý</span>
                    <textarea
                      className="input"
                      name="resolution"
                      rows={5}
                      minLength={5}
                      maxLength={2000}
                      required
                    />
                  </label>
                  <Button type="submit" disabled={busy}>
                    {busy ? "Đang lưu…" : "Lưu và đánh dấu đã xử lý"}
                  </Button>
                </form>
              ) : (
                <p className="resolution">{current.resolution}</p>
              )}
            </>
          ) : (
            <EmptyState>Chọn một phản hồi để xem nội dung.</EmptyState>
          )}
        </Card>
      </div>
    </>
  );
}
