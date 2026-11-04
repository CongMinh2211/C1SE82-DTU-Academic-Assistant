// Mục đích file: Nhận câu hỏi, xử lý nhập liệu và gửi yêu cầu từ khung chat.
import { Button } from "@/components/ui";

import type { ChatController } from "@/features/chat/hooks/use-chat-controller";
export function ChatComposer({
  input,
  textarea,
  setInput,
  draftKey,
  send,
  busy,
  web,
  onWebChange,
}: Pick<
  ChatController,
  "input" | "textarea" | "setInput" | "draftKey" | "send" | "busy"
> & { web: boolean; onWebChange: (value: boolean) => void }) {
  // Giao diện nhận nội dung; controller chịu trách nhiệm gọi API và quản lý trạng thái.
  return (
    <div className="composer-area">
      <form
        className="chat-composer"
        onSubmit={(e) => {
          // Ngăn tải lại trang và chuyển nội dung tới hàm gửi câu hỏi.
          e.preventDefault();
          void send(input);
        }}
      >
        <textarea
          ref={textarea}
          value={input}
          rows={1}
          onChange={(e) => {
            // Đồng bộ ô nhập và lưu bản nháp riêng cho hội thoại đang mở.
            setInput(e.target.value);
            try {
              sessionStorage.setItem(draftKey, e.target.value);
            } catch {}
          }}
          onKeyDown={(e) => {
            // Enter gửi, Shift+Enter xuống dòng; không gửi khi bộ gõ đang ghép chữ.
            if (
              e.key === "Enter" &&
              !e.shiftKey &&
              !e.nativeEvent.isComposing
            ) {
              e.preventDefault();
              void send(input);
            }
          }}
          aria-label="Câu hỏi tiếp theo"
          placeholder="Bạn muốn hỏi điều gì?"
          maxLength={2500}
          disabled={busy}
          required
        />
        <Button
          type="submit"
          aria-label="Gửi câu hỏi"
          // Không cho gửi câu hỏi trống hoặc gửi thêm khi yêu cầu đang chạy.
          disabled={busy || !input.trim()}
        >
          <span>Gửi</span>
          <span aria-hidden="true">↑</span>
        </Button>
      </form>
      <div className="composer-meta">
        <label className="web-toggle">
          <input
            type="checkbox"
            checked={web}
            // Báo cho controller biết người dùng có cho phép tìm thêm nguồn web.
            onChange={(e) => onWebChange(e.target.checked)}
            disabled={busy}
          />{" "}
          Tìm trên toàn web
        </label>
        <small className="input-counter" aria-live="off">
          {input.length > 2000 ? `${input.length}/2500` : ""}
        </small>
      </div>
    </div>
  );
}
