// Mục đích file: Theo dõi tiến độ và lỗi lập chỉ mục tài liệu trên giao diện quản trị.
"use client";
import { useState } from "react";
import { api, useResource, dateText } from "@/lib/api-client";
import type { JobRecord } from "@/lib/contracts";
import { routes } from "@/lib/routes";
import { useApp } from "@/components/app-provider";
import { ResourceState, Status } from "@/components/live-shared";
import {
  Button,
  ButtonLink,
  Card,
  EmptyState,
  Heading,
  IconTile,
  Notice,
  Select,
} from "@/components/ui";
import { RevisionPreview } from "@/features/documents/components/revision-preview";

export function IndexingStatus() {
  // Tự tải lại danh sách job và số liệu tổng hợp mỗi ba giây khi màn hình còn mở.
  const r = useResource<
      (JobRecord & {
        active_revision: string | null;
        revision_status: string;
      })[]
    >("admin/jobs", 3000),
    summary = useResource<{
      queued: number;
      running: number;
      failed: number;
      completedToday: number;
    }>("admin/jobs-summary", 3000),
    { notify, showModal } = useApp();
  const [filter, setFilter] = useState(""),
    [busy, setBusy] = useState("");
  // Mỗi phiên bản chỉ hiển thị job đầu tiên trong thứ tự API trả về.
  const jobs = (r.data || []).filter(
      (job, index, all) =>
        all.findIndex((item) => item.revision_id === job.revision_id) === index,
    ),
    filtered = jobs.filter((j) => !filter || j.status === filter);
  // Chuyển mã giai đoạn từ API thành nhãn dễ hiểu trên màn hình.
  const stages: Record<string, string> = {
    queued: "Chờ xử lý",
    extracting: "Đọc và trích xuất",
    chunking: "Chuẩn hóa nội dung",
    embedding: "Lập chỉ mục",
    saving: "Lưu chỉ mục",
    ready: "Sẵn sàng rà soát",
  };
  async function retry(job: JobRecord) {
    // Yêu cầu tạo lượt lập chỉ mục lại cho phiên bản tương ứng; không tự xuất bản.
    setBusy(job.id);
    try {
      await api(`admin/documents/${job.document_id}/reindex`, {
        method: "POST",
        body: JSON.stringify({ revisionId: job.revision_id }),
      });
      await Promise.all([r.refresh(), summary.refresh()]);
      notify("Đã tạo tác vụ mới.");
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  return (
    <>
      <Heading
        title="Theo dõi xử lý tài liệu"
        description="Kiểm tra tiến độ, rà soát nội dung và xử lý lỗi tại đúng nguồn."
        action={
          <ButtonLink href={routes.documents}>Về tài liệu & nguồn</ButtonLink>
        }
      />
      <div className="metrics-grid">
        {[
          ["Trong hàng đợi", summary.data?.queued, "clock"],
          ["Đang xử lý", summary.data?.running, "refresh"],
          ["Hoàn tất hôm nay", summary.data?.completedToday, "check"],
          ["Cần xử lý lỗi", summary.data?.failed, "warning"],
        ].map(([label, value, icon]) => (
          <Card className="metric-card" key={String(label)}>
            <div className="metric-label">
              <IconTile name={String(icon)} />
              <span>{label}</span>
            </div>
            <strong className="metric-value">{value ?? "—"}</strong>
          </Card>
        ))}
      </div>
      <div className="filter-row">
        <label className="field">
          <span>Lọc tác vụ</span>
          <Select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="">Tất cả trạng thái</option>
            <option value="queued">Đang chờ</option>
            <option value="running">Đang xử lý</option>
            <option value="failed">Lỗi xử lý</option>
            <option value="done">Hoàn tất</option>
          </Select>
        </label>
        <small className="muted">
          Hiển thị tác vụ mới nhất của từng phiên bản trong 100 tác vụ gần đây.
        </small>
      </div>
      <ResourceState {...r} retry={r.refresh} />
      <ResourceState
        loading={false}
        error={summary.error}
        retry={summary.refresh}
      />
      {filtered.map((job) => (
        <Card key={job.id} className="job-card">
          <div className="section-heading">
            <div>
              <h2>{job.title}</h2>
              <small>
                Phiên bản {job.version} · {dateText(job.created_at)}
              </small>
            </div>
            <Status value={job.status} />
          </div>
          <ol className="job-stages" aria-label="Các bước xử lý">
            {[
              "Thu thập",
              "Đọc nội dung",
              "Lập chỉ mục",
              job.active_revision === job.revision_id
                ? "Đã xuất bản"
                : "Chờ duyệt",
            ].map((label, i) => (
              <li
                key={label}
                className={
                  job.status === "done" ||
                  i <=
                    (job.stage === "embedding" || job.stage === "saving"
                      ? 2
                      : job.stage === "extracting" || job.stage === "chunking"
                        ? 1
                        : 0)
                    ? "reached"
                    : ""
                }
              >
                <span>0{i + 1}</span>
                {label}
              </li>
            ))}
          </ol>
          <div
            className="progress-track"
            role="progressbar"
            aria-label={`Tiến độ ${job.title}`}
            aria-valuenow={job.progress}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <span style={{ width: `${job.progress}%` }} />
          </div>
          <p>
            {job.active_revision === job.revision_id
              ? "Đã xuất bản, đang phục vụ sinh viên"
              : stages[job.stage] || job.stage}{" "}
            · {job.progress}%
          </p>
          {job.error && (
            <Notice tone="red" title="Tác vụ chưa hoàn tất">
              {job.error}
              <span className="block-note">
                Phiên bản đã được xuất bản trước đó vẫn được giữ.
              </span>
            </Notice>
          )}
          <div className="row">
            {job.status === "failed" && (
              <Button disabled={!!busy} onClick={() => void retry(job)}>
                {busy === job.id ? "Đang tạo lại…" : "Thử lập chỉ mục lại"}
              </Button>
            )}
            {job.status === "done" && (
              <Button
                variant="outline"
                onClick={() =>
                  showModal(
                    "Rà soát nội dung",
                    <RevisionPreview revisionId={job.revision_id} />,
                  )
                }
              >
                Xem nội dung
              </Button>
            )}
            <ButtonLink
              href={`${routes.documents}?q=${encodeURIComponent(job.title)}`}
            >
              Mở tài liệu
            </ButtonLink>
          </div>
        </Card>
      ))}
      {!r.loading && !filtered.length && (
        <EmptyState>Không có tác vụ trong trạng thái này.</EmptyState>
      )}
    </>
  );
}
