// Mục đích file: Hiển thị lịch sử hội thoại, tìm kiếm và các thao tác quản lý lịch sử.
"use client";
import { ConversationDialog } from "@/features/conversations/components/conversation-dialog";
import Link from "next/link";
import { useEffect, useState } from "react";
import { routes } from "@/lib/routes";
import { api, useResource, dateText } from "@/lib/api-client";
import type { Conversation } from "@/lib/contracts";
import { useApp } from "@/components/app-provider";
import { ResourceState } from "@/components/live-shared";
import { ConfirmAdminAction } from "@/components/admin-controls";
import {
  Button,
  ButtonLink,
  Card,
  EmptyState,
  Heading,
  IconTile,
  Pagination,
  SearchInput,
} from "@/components/ui";

type HistoryPage = {
  items: Conversation[];
  total: number;
  page: number;
  size: number;
};

export function StudentHistory() {
  const { showModal, notify } = useApp();
  const [search, setSearch] = useState(""),
    [query, setQuery] = useState(""),
    [trash, setTrash] = useState(false),
    [page, setPage] = useState(1),
    [restoring, setRestoring] = useState("");
  useEffect(() => {
    // Chờ người dùng ngừng gõ 250 ms trước khi tìm kiếm; tìm mới quay lại trang đầu.
    const timer = setTimeout(() => {
      setQuery(search);
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);
  // Tải lịch sử hoặc thùng rác theo bộ lọc và trang đang chọn.
  const resource = useResource<HistoryPage>(
    `conversations?view=history&trash=${trash ? 1 : 0}&q=${encodeURIComponent(query)}&page=${page}`,
  );
  async function restore(c: Conversation) {
    // Không gửi nhiều yêu cầu khôi phục cùng lúc; sau khi lưu thì tải lại danh sách.
    if (restoring) return;
    setRestoring(c.id);
    try {
      await api(`conversations/${c.id}`, {
        method: "PATCH",
        body: JSON.stringify({ restore: true }),
      });
      await resource.refresh();
      notify("Đã khôi phục hội thoại.");
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setRestoring("");
    }
  }
  function permanentlyDelete(c: Conversation) {
    if (restoring) return;
    showModal(
      "Xóa vĩnh viễn hội thoại?",
      <ConfirmAdminAction
        confirmLabel="Xóa vĩnh viễn"
        onConfirm={async () => {
          await api(`conversations/${encodeURIComponent(c.id)}/permanent`, {
            method: "DELETE",
          });
          await resource.refresh();
          notify("Đã xóa vĩnh viễn hội thoại.");
        }}
      >
        <p>
          Hội thoại <strong>{c.title}</strong> cùng các tin nhắn và nguồn đã lưu
          sẽ bị xóa. Bạn không thể khôi phục sau khi xác nhận.
        </p>
      </ConfirmAdminAction>,
    );
  }
  return (
    <>
      <Heading
        title="Lịch sử hỏi đáp"
        description="Mọi cuộc trò chuyện, sẵn sàng khi bạn cần quay lại."
        action={
          <ButtonLink variant="primary" href={routes.chat}>
            ＋ Hội thoại mới
          </ButtonLink>
        }
      />
      <Card className="history-card">
        <div className="history-toolbar">
          <div className="segmented-control" aria-label="Chế độ xem lịch sử">
            {[false, true].map((value) => (
              <button
                type="button"
                key={String(value)}
                aria-pressed={trash === value}
                onClick={() => {
                  setTrash(value);
                  setPage(1);
                }}
              >
                {value ? "Thùng rác" : "Hội thoại"}
              </button>
            ))}
          </div>
          <SearchInput
            placeholder="Tìm tên hoặc nội dung…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {trash && (
          <p className="history-hint">
            Hội thoại được giữ trong 30 ngày kể từ khi chuyển vào thùng rác, sau
            đó tự động xóa vĩnh viễn. Bạn cũng có thể xóa ngay.
          </p>
        )}
        <ResourceState {...resource} retry={resource.refresh} />
        {resource.data?.items.map((c) => (
          <div className="record history-record" key={c.id}>
            <IconTile name={trash ? "clock" : "chat"} />
            {trash ? (
              <div className="record-copy">
                <strong>{c.title}</strong>
                <small>Đã chuyển vào thùng rác {dateText(c.deleted_at!)}</small>
              </div>
            ) : (
              <Link className="record-copy" href={`${routes.chat}?c=${c.id}`}>
                <strong>{c.title}</strong>
                <small>Cập nhật {dateText(c.updated_at)}</small>
              </Link>
            )}
            <div className="record-actions">
              {trash ? (
                <>
                  <Button
                    variant="outline"
                    disabled={!!restoring}
                    onClick={() => void restore(c)}
                  >
                    {restoring === c.id ? "Đang khôi phục…" : "Khôi phục"}
                  </Button>
                  <Button
                    variant="outline"
                    disabled={!!restoring}
                    onClick={() => void permanentlyDelete(c)}
                  >
                    Xóa vĩnh viễn
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    aria-label={`Đổi tên: ${c.title}`}
                    onClick={() =>
                      showModal(
                        "Đổi tên hội thoại",
                        <ConversationDialog
                          conversation={c}
                          mode="rename"
                          done={resource.refresh}
                        />,
                      )
                    }
                  >
                    Đổi tên
                  </Button>
                  <Button
                    variant="outline"
                    className="history-delete-button"
                    aria-label={`Chuyển vào thùng rác: ${c.title}`}
                    onClick={() =>
                      showModal(
                        "Chuyển hội thoại vào thùng rác?",
                        <ConversationDialog
                          conversation={c}
                          mode="trash"
                          done={resource.refresh}
                        />,
                      )
                    }
                  >
                    Xóa
                  </Button>
                </>
              )}
            </div>
          </div>
        ))}
        {!resource.loading && !resource.error && resource.data?.total === 0 && (
          <EmptyState
            title={
              query
                ? "Không tìm thấy hội thoại"
                : trash
                  ? "Thùng rác đang trống"
                  : "Chưa có cuộc trò chuyện nào"
            }
          >
            {query
              ? "Thử từ khóa khác hoặc kiểm tra mục thùng rác."
              : trash
                ? "Hội thoại bạn xóa sẽ xuất hiện ở đây."
                : "Bắt đầu một câu hỏi, trợ lý sẽ lưu lại để bạn tiếp tục sau."}
            {!trash && !query && (
              <ButtonLink variant="primary" href={routes.chat}>
                Hỏi trợ lý
              </ButtonLink>
            )}
          </EmptyState>
        )}
        {!!resource.data?.total && (
          <Pagination
            page={resource.data.page}
            onPage={setPage}
            canNext={resource.data.page * 10 < resource.data.total}
            label={`${resource.data.total} cuộc trò chuyện`}
          />
        )}
      </Card>
    </>
  );
}
