// Mục đích file: Hiển thị nội dung phiên bản để quản trị viên xem trước khi duyệt.
"use client";
import { useState } from "react";
import { useResource, dateText } from "@/lib/api-client";
import type { DocumentRecord } from "@/lib/contracts";
import { ResourceState } from "@/components/live-shared";
import { Select } from "@/components/ui";

export function RevisionPreview({ revisionId }: { revisionId: string }) {
  // Lấy văn bản đã trích xuất của phiên bản để quản trị viên đối chiếu theo từng trang.
  const r = useResource<{
    title_snapshot: string;
    pages: { page: number; text: string }[];
  }>(`admin/revision/${revisionId}`);
  return (
    <>
      <ResourceState {...r} retry={r.refresh} />
      <h3>{r.data?.title_snapshot}</h3>
      {r.data?.pages.map((p) => (
        <section key={p.page}>
          <h4>Trang {p.page}</h4>
          <pre className="source-page">{p.text}</pre>
        </section>
      ))}
    </>
  );
}

export function DocumentVersions({ document }: { document: DocumentRecord }) {
  // Lấy toàn bộ phiên bản và mặc định chọn phiên bản mới nhất của tài liệu.
  const r = useResource<{
    revisions: {
      id: string;
      version: number;
      status: string;
      created_at: string;
      published_at: string | null;
    }[];
  }>(`admin/documents/${document.id}`);
  const [selected, setSelected] = useState(document.latest_revision);
  return (
    <div className="stack">
      <p className="muted">{document.scope}</p>
      <ResourceState {...r} retry={r.refresh} />
      <label className="field">
        <span>Phiên bản cần kiểm tra</span>
        <Select value={selected} onChange={(e) => setSelected(e.target.value)}>
          {r.data?.revisions.map((version) => (
            <option key={version.id} value={version.id}>
              v{version.version} ·{" "}
              {version.id === document.active_revision
                ? "Đang phục vụ"
                : version.status === "ready"
                  ? "Chờ duyệt"
                  : version.status}{" "}
              · {dateText(version.created_at)}
            </option>
          ))}
        </Select>
      </label>
      <RevisionPreview key={selected} revisionId={selected} />
    </div>
  );
}
