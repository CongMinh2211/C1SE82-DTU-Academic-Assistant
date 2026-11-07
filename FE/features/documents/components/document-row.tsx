// Mục đích file: Hiển thị một dòng tài liệu cùng trạng thái và các thao tác liên quan.
import { dateText } from "@/lib/api-client";
import type { DocumentRecord } from "@/lib/contracts";
import { routes } from "@/lib/routes";

import { useApp } from "@/components/app-provider";
import { Status } from "@/components/live-shared";
import { Badge, Button, ButtonLink } from "@/components/ui";
import { DocumentVersions } from "@/features/documents/components/revision-preview";

export function DocumentRow({
  document: d,
  busy,
  showModal,
  confirm,
  action,
  notify,
}: {
  document: DocumentRecord;
  busy: string;
  showModal: ReturnType<typeof useApp>["showModal"];
  notify: ReturnType<typeof useApp>["notify"];
  confirm: (document: DocumentRecord, type: "publish" | "delete") => void;
  action: (
    document: DocumentRecord,
    type: "publish" | "reindex" | "delete",
  ) => Promise<void>;
}) {
  // Các nút trong dòng phụ thuộc trạng thái phiên bản; kiểm tra quyền và hợp lệ vẫn do BE quyết định.
  return (
    <tr key={d.id}>
      <td>
        <strong>{d.title}</strong>
        <small className="table-subtitle">
          {d.original_name || d.source_url}
        </small>
        <details className="table-scope">
          <summary>Phạm vi áp dụng</summary>
          <p>{d.scope}</p>
        </details>
        {d.active_revision && d.active_revision !== d.latest_revision && (
          <Badge tone="teal">Bản đã duyệt vẫn đang phục vụ</Badge>
        )}
      </td>
      <td>{d.topic}</td>
      <td>
        v{d.version}
        <small className="table-subtitle">{d.chunk_count} đoạn</small>
      </td>
      <td>{dateText(d.updated_at)}</td>
      <td>
        <Status value={d.status} />
        {d.error && <p className="form-error">{d.error}</p>}
      </td>
      <td>
        <div className="table-actions">
          <Button
            variant="outline"
            onClick={() =>
              showModal(
                "Rà soát tài liệu và phiên bản",
                <DocumentVersions document={d} />,
              )
            }
          >
            Xem
          </Button>
          <ButtonLink href={`${routes.addSource}?doc=${d.id}`}>
            Cập nhật
          </ButtonLink>
          {d.status === "ready" && (
            <Button disabled={!!busy} onClick={() => confirm(d, "publish")}>
              Xuất bản
            </Button>
          )}
          {!["queued", "running"].includes(d.status) && (
            <Button
              variant="outline"
              disabled={!!busy}
              onClick={() =>
                void action(d, "reindex").catch((e) =>
                  notify((e as Error).message),
                )
              }
            >
              Lập chỉ mục lại
            </Button>
          )}
          <Button
            variant="outline"
            disabled={!!busy}
            onClick={() => confirm(d, "delete")}
          >
            Gỡ nguồn
          </Button>
        </div>
      </td>
    </tr>
  );
}
