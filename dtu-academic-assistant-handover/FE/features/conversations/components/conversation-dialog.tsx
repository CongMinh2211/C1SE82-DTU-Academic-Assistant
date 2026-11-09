// Mục đích file: Hiển thị hộp thoại cho các thao tác với hội thoại trong lịch sử.
import { useState } from "react";

import { api } from "@/lib/api-client";
import type { Conversation } from "@/lib/contracts";
import { useApp } from "@/components/app-provider";

import { Button } from "@/components/ui";
export function ConversationDialog({
  conversation,
  mode,
  done,
}: {
  conversation: Conversation;
  mode: "rename" | "trash";
  done: () => Promise<void>;
}) {
  const [title, setTitle] = useState(conversation.title),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const { closeModal, notify } = useApp();
  return (
    <form
      className="stack"
      onSubmit={async (e) => {
        e.preventDefault();
        // Bỏ qua lần gửi lặp khi thao tác trước vẫn đang chờ máy chủ.
        if (busy) return;
        setBusy(true);
        setError("");
        try {
          // Xóa mềm dùng DELETE; đổi tên dùng PATCH và gửi tên đã bỏ khoảng trắng thừa.
          await api(`conversations/${conversation.id}`, {
            method: mode === "trash" ? "DELETE" : "PATCH",
            ...(mode === "rename"
              ? { body: JSON.stringify({ title: title.trim() }) }
              : {}),
          });
          // Cập nhật danh sách sau khi máy chủ lưu thành công rồi đóng hộp thoại.
          await done();
          closeModal();
          notify(
            mode === "trash"
              ? "Đã chuyển vào thùng rác. Bạn có thể khôi phục trong lịch sử."
              : "Đã đổi tên hội thoại.",
          );
        } catch (e) {
          setError((e as Error).message);
          setBusy(false);
        }
      }}
    >
      {mode === "rename" ? (
        <label className="field">
          <span>Tên hội thoại</span>
          <input
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
            required
            autoFocus
          />
        </label>
      ) : (
        <p>
          “{conversation.title}” sẽ được chuyển vào thùng rác. Bạn có thể khôi
          phục trong vòng 30 ngày.
        </p>
      )}
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <div className="dialog-actions">
        <Button variant="outline" disabled={busy} onClick={closeModal}>
          Hủy
        </Button>
        <Button
          type="submit"
          disabled={busy || (mode === "rename" && !title.trim())}
        >
          {busy
            ? "Đang lưu…"
            : mode === "rename"
              ? "Lưu tên"
              : "Chuyển vào thùng rác"}
        </Button>
      </div>
    </form>
  );
}
