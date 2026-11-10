// Mục đích file: Cho phép quản trị viên xem và quản lý danh sách FAQ.
"use client";
import { useState } from "react";
import { api, useResource, dateText } from "@/lib/api-client";
import type { FaqRecord } from "@/lib/contracts";
import { faqMatches } from "@/lib/faq-search";
import { routes } from "@/lib/routes";
import {
  AdminPagination,
  ConfirmAdminAction,
} from "@/components/admin-controls";
import { useApp } from "@/components/app-provider";
import { topics, ResourceState, Status } from "@/components/live-shared";
import {
  Button,
  ButtonLink,
  Card,
  EmptyState,
  Heading,
  Notice,
  SearchInput,
  Select,
} from "@/components/ui";

export function FaqManagement() {
  // Lấy FAQ quản trị và giữ bộ lọc tìm kiếm, chủ đề, trạng thái, trang hiện tại.
  const r = useResource<FaqRecord[]>("admin/faqs"),
    { notify, showModal } = useApp();
  const [search, setSearch] = useState(""),
    [topic, setTopic] = useState(""),
    [status, setStatus] = useState(""),
    [page, setPage] = useState(1);
  // Áp dụng đồng thời các bộ lọc; ô trống nghĩa là không giới hạn theo điều kiện đó.
  const filtered = (r.data || []).filter(
    (f) =>
      faqMatches(search, f.question, f.answer, f.topic, f.source_title) &&
      (!topic || f.topic === topic) &&
      (!status || f.status === status),
  );
  // Nếu số kết quả giảm, đưa trang đang xem về phạm vi hợp lệ.
  const currentPage = Math.min(
    page,
    Math.max(1, Math.ceil(filtered.length / 10)),
  );
  function action(f: FaqRecord, kind: "delete" | "unpublish") {
    // Mở xác nhận trước khi xóa hoặc gỡ xuất bản; sau thao tác thì tải lại danh sách.
    showModal(
      kind === "delete" ? "Xóa FAQ" : "Gỡ xuất bản FAQ",
      <ConfirmAdminAction
        confirmLabel={kind === "delete" ? "Xóa FAQ" : "Gỡ xuất bản"}
        onConfirm={async () => {
          await api(
            `admin/faqs/${f.id}${kind === "unpublish" ? "/unpublish" : ""}`,
            {
              method: kind === "delete" ? "DELETE" : "POST",
              ...(kind === "unpublish" ? { body: "{}" } : {}),
            },
          );
          await r.refresh();
          notify(
            kind === "delete" ? "Đã xóa FAQ." : "Đã chuyển FAQ về bản nháp.",
          );
        }}
      >
        <p>
          <strong>{f.question}</strong>
        </p>
        <p>
          {kind === "delete"
            ? "FAQ này sẽ bị xóa vĩnh viễn. Tài liệu gốc vẫn được giữ."
            : "FAQ sẽ tạm ẩn với sinh viên. Nội dung được giữ lại để bạn biên soạn và xuất bản lại."}
        </p>
      </ConfirmAdminAction>,
    );
  }
  return (
    <>
      <Heading
        title="Câu hỏi thường gặp"
        description="Biên soạn câu trả lời rõ ràng và có nguồn đối chiếu."
        action={
          <ButtonLink variant="primary" href={routes.faqEditor}>
            Thêm FAQ
          </ButtonLink>
        }
      />
      <Card>
        <div className="filter-row admin-filter-row">
          <SearchInput
            placeholder="Tìm câu hỏi hoặc nội dung FAQ…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <Select
            aria-label="Chủ đề FAQ quản trị"
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
            aria-label="Trạng thái FAQ"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="published">Đã xuất bản</option>
            <option value="draft">Bản nháp</option>
          </Select>
        </div>
        <ResourceState {...r} retry={r.refresh} />
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Câu hỏi</th>
                <th>Chủ đề</th>
                <th>Cập nhật</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered
                .slice((currentPage - 1) * 10, currentPage * 10)
                .map((f) => (
                  <tr key={f.id}>
                    <td>
                      <strong>{f.question}</strong>
                      <small className="table-subtitle">
                        {f.source_title
                          ? `${f.source_title} · Trang ${f.page}`
                          : "Chưa chọn nguồn tham khảo"}
                      </small>
                    </td>
                    <td>{f.topic}</td>
                    <td>{dateText(f.updated_at)}</td>
                    <td>
                      <Status value={f.status} />
                      {f.status === "published" && !f.source_active && (
                        <small className="form-error">
                          Nguồn không còn phục vụ; FAQ đang ẩn với sinh viên.
                        </small>
                      )}
                    </td>
                    <td>
                      <div className="table-actions">
                        <ButtonLink href={`${routes.faqEditor}?id=${f.id}`}>
                          Biên soạn
                        </ButtonLink>
                        {f.status === "published" ? (
                          <Button
                            variant="outline"
                            onClick={() => action(f, "unpublish")}
                          >
                            Gỡ xuất bản
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            onClick={() => action(f, "delete")}
                          >
                            Xóa
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        {!r.loading && !filtered.length && (
          <EmptyState>
            Chưa có FAQ phù hợp với bộ lọc. Bạn có thể tạo bản nháp trước khi
            chọn nguồn.
          </EmptyState>
        )}
        <AdminPagination
          total={filtered.length}
          page={currentPage}
          onChange={setPage}
        />
      </Card>
      <Notice title="Một câu trả lời rõ, một nguồn có thể kiểm tra">
        Bản nháp chưa hiển thị với sinh viên. Chọn đoạn nguồn đang xuất bản
        trước khi duyệt nội dung.
      </Notice>
    </>
  );
}
