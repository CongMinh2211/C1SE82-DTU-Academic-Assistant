// Mục đích file: Hiển thị các lượt hỏi và câu trả lời trong hội thoại.
import { AnswerBubble } from "@/features/chat/components/answer-bubble";
import { WaitingAnswer } from "@/features/chat/components/waiting-answer";

import type { ChatController } from "@/features/chat/hooks/use-chat-controller";
export function ChatMessages({
  conversation,
  lastAnswer,
  lastQuestion,
  busy,
  pending,
  setSourceMessageId,
  setSourceReveal,
  send,
  controller,
  bottom,
}: Pick<
  ChatController,
  | "conversation"
  | "lastAnswer"
  | "lastQuestion"
  | "busy"
  | "pending"
  | "setSourceMessageId"
  | "setSourceReveal"
  | "send"
  | "controller"
  | "bottom"
>) {
  // Vùng log công bố cập nhật lịch sự cho công nghệ hỗ trợ khi có tin nhắn mới.
  return (
    <div
      className="message-list"
      role="log"
      aria-label="Nội dung hội thoại"
      aria-live="polite"
      aria-busy={busy}
    >
      {conversation?.messages?.map((m) =>
        m.role === "user" ? (
          <div className="user-bubble" key={m.id}>
            {m.content}
          </div>
        ) : (
          <AnswerBubble
            key={m.id}
            message={m}
            onShowSources={() => {
              setSourceMessageId(m.id);
              setSourceReveal((value) => value + 1);
            }}
            onRetry={
              m.id === lastAnswer?.id && lastQuestion
                ? () => void send(lastQuestion)
                : undefined
            }
            busy={busy}
          />
        ),
      )}
      {busy && (
        <>
          <div className="user-bubble">{pending}</div>
          <WaitingAnswer onStop={() => controller.current?.abort()} />
        </>
      )}
      <div ref={bottom} />
    </div>
  );
}
