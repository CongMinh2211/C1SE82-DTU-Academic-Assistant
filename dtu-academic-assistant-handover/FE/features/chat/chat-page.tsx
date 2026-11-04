// Mục đích file: Ghép các thành phần màn hình chat, điều khiển hỏi đáp và thao tác chia sẻ.
"use client";
import { useChatController } from "@/features/chat/hooks/use-chat-controller";
import { ChatWelcome } from "@/features/chat/components/welcome";
import { ChatMessages } from "@/features/chat/components/messages";
import { ChatFollowUps } from "@/features/chat/components/follow-ups";
import { ChatComposer } from "@/features/chat/components/composer";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { routes } from "@/lib/routes";
import { api } from "@/lib/api-client";
import { useApp } from "@/components/app-provider";
import { ConfirmAdminAction } from "@/components/admin-controls";

import { ResourceState } from "@/components/live-shared";
import { Button, Card, Heading, IconTile } from "@/components/ui";

import { Sources } from "@/features/chat/components/sources";

export function ChatPage() {
  // Tạo vùng chat theo hội thoại hoặc câu hỏi được chuyển từ trang khác.
  const params = useSearchParams();
  const [web, setWeb] = useState(true);
  return (
    <ChatView
      key={`${params.get("c") || "new"}:${params.get("q") || ""}`}
      web={web}
      onWebChange={setWeb}
    />
  );
}

function ChatView({
  web,
  onWebChange,
}: {
  web: boolean;
  onWebChange: (value: boolean) => void;
}) {
  const { notify, showModal } = useApp();
  const {
    cid,
    resource,
    conversation,
    busy,
    pending,
    sourceAnswer,
    sourceReveal,
    sourceQuestion,
    input,
    textarea,
    setInput,
    draftKey,
    send,
    controller,
    bottom,
    lastAnswer,
    lastQuestion,
    setLocal,
    setError,
    error,
    router,
    exportChat,
    setSourceMessageId,
    setSourceReveal,
  } = useChatController(web);
  return (
    <>
      <Heading
        title="Hỏi điều bạn cần"
        description="Trợ lý cùng bạn tìm hiểu việc học và cuộc sống tại DTU."
        action={
          <div className="heading-actions">
            {conversation && (
              <>
                <Button variant="outline" onClick={exportChat} disabled={busy}>
                  Xuất TXT
                </Button>
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => {
                    // Chỉ tạo liên kết sau khi người dùng đồng ý chia sẻ bản chụp.
                    showModal(
                      "Tạo liên kết chia sẻ?",
                      <ConfirmAdminAction
                        confirmLabel="Tạo liên kết"
                        onConfirm={async () => {
                          // Sao chép liên kết để người dùng tự gửi cho người nhận mong muốn.
                          const shared = await api<{ token: string }>(
                            `conversations/${conversation.id}/share`,
                            { method: "POST" },
                          );
                          const url = `${window.location.origin}/chia-se/${shared.token}`;
                          try {
                            await navigator.clipboard.writeText(url);
                            notify(
                              "Đã sao chép liên kết chia sẻ có hiệu lực 7 ngày.",
                            );
                          } catch {
                            window.prompt("Sao chép liên kết chia sẻ:", url);
                          }
                        }}
                      >
                        <p>
                          Bất kỳ ai có liên kết đều có thể xem nội dung hiện tại
                          trong 7 ngày. Hãy kiểm tra thông tin cá nhân trước khi
                          chia sẻ.
                        </p>
                        {["localhost", "127.0.0.1"].includes(
                          window.location.hostname,
                        ) && (
                          <p>
                            Ứng dụng đang chạy local nên liên kết chỉ mở được
                            trên máy này.
                          </p>
                        )}
                      </ConfirmAdminAction>,
                    );
                  }}
                >
                  Chia sẻ
                </Button>
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => {
                    showModal(
                      "Tắt liên kết chia sẻ?",
                      <ConfirmAdminAction
                        confirmLabel="Tắt chia sẻ"
                        onConfirm={async () => {
                          await api(`conversations/${conversation.id}/share`, {
                            method: "DELETE",
                          });
                          notify("Đã tắt liên kết chia sẻ.");
                        }}
                      >
                        <p>
                          Người nhận sẽ không thể mở liên kết đã tạo. Hội thoại
                          của bạn vẫn được giữ lại.
                        </p>
                      </ConfirmAdminAction>,
                    );
                  }}
                >
                  Tắt chia sẻ
                </Button>
              </>
            )}
            <Button
              variant="primary"
              disabled={busy}
              onClick={() => {
                setLocal(null);
                resource.setData(null);
                setError("");
                setInput("");
                try {
                  sessionStorage.removeItem(draftKey);
                  window.dispatchEvent(new Event("dtu-draft"));
                } catch {}
                router.push(routes.chat);
              }}
            >
              <span aria-hidden="true">＋</span> Hội thoại mới
            </Button>
          </div>
        }
      />
      <div className="chat-layout">
        <Card className="conversation-panel">
          <div className="assistant-identity">
            <IconTile name="chat" />
            <div>
              <strong>Trợ lý học vụ DTU</strong>
              <small>Tài liệu học vụ & thông tin về DTU</small>
            </div>
            <span className="assistant-dot" aria-hidden="true" />
          </div>
          <ResourceState
            loading={!!cid && resource.loading && !conversation}
            error={resource.error}
            retry={resource.refresh}
          />
          {!conversation && !busy && !cid && <ChatWelcome send={send} />}
          <ChatMessages
            conversation={conversation}
            lastAnswer={lastAnswer}
            lastQuestion={lastQuestion}
            busy={busy}
            pending={pending}
            setSourceMessageId={setSourceMessageId}
            setSourceReveal={setSourceReveal}
            send={send}
            controller={controller}
            bottom={bottom}
          />
          {!busy &&
            lastAnswer &&
            lastAnswer.status !== "error" &&
            lastAnswer.status !== "processing" && (
              <ChatFollowUps send={send} question={lastQuestion} />
            )}
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <ChatComposer
            input={input}
            textarea={textarea}
            setInput={setInput}
            draftKey={draftKey}
            send={send}
            busy={busy}
            web={web}
            onWebChange={onWebChange}
          />
        </Card>
        <Sources
          answer={sourceAnswer}
          reveal={sourceReveal}
          question={sourceQuestion}
        />
      </div>
    </>
  );
}
