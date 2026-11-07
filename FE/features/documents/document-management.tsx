// Mục đích file: Hiển thị kho tài liệu và thao tác quản lý các phiên bản.
"use client";
import { DocumentRow } from "@/features/documents/components/document-row";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { api, useResource } from "@/lib/api-client";
import type { DocumentRecord } from "@/lib/contracts";
import { routes } from "@/lib/routes";
import {
  AdminPagination,
  ConfirmAdminAction,
} from "@/components/admin-controls";
import { useApp } from "@/components/app-provider";
import { topics, ResourceState } from "@/components/live-shared";
import {
  ButtonLink,
  Card,
  EmptyState,
  Heading,
  Notice,
  SearchInput,
  Select,
} from "@/components/ui";

export function DocumentManagement() {
  // Nhận bộ lọc ban đầu từ URL và tải danh sách tài liệu quản trị.
  const params = useSearchParams(),
    r = useResource<DocumentRecord[]>("admin/documents"),
    { notify, showModal } = useApp();
  const [search, setSearch] = useState(params.get("q") || ""),
    [status, setStatus] = useState(params.get("trang-thai") || ""),
    [topic, setTopic] = useState(""),
    [page, setPage] = useState(1),
    [busy, setBusy] = useState("");
  // Tìm theo tên, tên file hoặc URL, đồng thời lọc trạng thái và chủ đề.
  const filtered = (r.data || []).filter(
    (d) =>
      `${d.title} ${d.original_name} ${d.source_url || ""}`
        .toLocaleLowerCase("vi")
        .includes(search.trim().toLocaleLowerCase("vi")) &&
      (!status || d.status === status) &&
      (!topic || d.topic === topic),
  );
  const currentPage = Math.min(
    page,
    Math.max(1, Math.ceil(filtered.length / 10)),
  );
  async function action(
    d: DocumentRecord,
    type: "publish" | "reindex" | "delete",
  ) {
    // Gọi API tương ứng xuất bản, lập chỉ mục lại hoặc xóa mềm tài liệu đang chọn.
    setBusy(d.id);
    try {
      await api(
        `admin/documents/${d.id}${type === "delete" ? "" : `/${type}`}`,
        {
          method: type === "delete" ? "DELETE" : "POST",
          ...(type === "delete"
            ? {}
            : { body: JSON.stringify({ revisionId: d.latest_revision }) }),
        },
      );
      await r.refresh();
      notify(
        type === "publish"
          ? "Đã xuất bản phiên bản mới."
          : type === "delete"
            ? "Đã gỡ tài liệu khỏi kho tra cứu. Lịch sử trích dẫn vẫn được giữ."
            : "Đã tạo tác vụ lập chỉ mục lại.",
      );
    } finally {
      setBusy("");
    }
  }
  function confirm(d: DocumentRecord, type: "publish" | "delete") {
    const label =
      type === "publish" ? "Xuất bản phiên bản" : "Gỡ khỏi kho tra cứu";
    showModal(
      label,
      <ConfirmAdminAction
        confirmLabel={label}
        onConfirm={() => action(d, type)}
      >
        <p>
          <strong>{d.title}</strong>
        </p>
        <p>
          {type === "publish"
            ? `Xuất bản v${d.version} sau khi đã kiểm tra nội dung, nguồn và phạm vi áp dụng. Trợ lý sẽ sử dụng phiên bản này.`
            : "Tài liệu sẽ ngừng phục vụ câu hỏi mới. Các phiên bản và trích dẫn đã có vẫn được giữ để đối chiếu lịch sử."}
        </p>
      </ConfirmAdminAction>,
    );
  }
  return (
    <>
      <Heading
        title="Tài liệu & nguồn học vụ"
        description="Quản lý nguồn, phiên bản và trạng thái xuất bản."
        action={
          <ButtonLink variant="primary" href={routes.addSource}>
            Thêm nguồn mới
          </ButtonLink>
        }
      />
      <Card>
        <div className="filter-row admin-filter-row">
          <SearchInput
            placeholder="Tìm tên tài liệu, file hoặc URL…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <Select
            aria-label="Chủ đề tài liệu"
            value={topic}
            onChange={(e) => {
              setTopic(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Tất cả chủ đề</option>
            {topics.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </Select>
          <Select
            aria-label="Trạng thái tài liệu"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="published">Đã xuất bản</option>
            <option value="ready">Cần rà soát</option>
            <option value="queued">Đang chờ</option>
            <option value="running">Đang xử lý</option>
            <option value="failed">Lỗi xử lý</option>
          </Select>
        </div>
        <ResourceState {...r} retry={r.refresh} />
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Tài liệu</th>
                <th>Chủ đề</th>
                <th>Phiên bản</th>
                <th>Cập nhật</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered
                .slice((currentPage - 1) * 10, currentPage * 10)
                .map((d) => (
                  <DocumentRow
                    key={d.id}
                    document={d}
                    busy={busy}
                    showModal={showModal}
                    confirm={confirm}
                    action={action}
                    notify={notify}
                  />
                ))}
            </tbody>
          </table>
        </div>
        {!r.loading && !filtered.length && (
          <EmptyState>Không có tài liệu phù hợp với bộ lọc.</EmptyState>
        )}
        <AdminPagination
          total={filtered.length}
          page={currentPage}
          onChange={setPage}
        />
      </Card>
      <Notice title="Chỉ xuất bản nguồn đã rà soát">
        Kiểm tra nguyên văn, phiên bản và đối tượng áp dụng trước khi đưa vào
        câu trả lời.
      </Notice>
    </>
  );
}
