// Mục đích file: Điều phối trạng thái chat, bản nháp, gửi câu hỏi và tải lịch sử hội thoại.
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { routes } from "@/lib/routes";

import { api, useResource } from "@/lib/api-client";
import { conversationText } from "@/lib/conversation-export";
import type { Conversation } from "@/lib/contracts";
import { useApp } from "@/components/app-provider";

function subscribeDraft(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("dtu-draft", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("dtu-draft", callback);
  };
}
const emptyDraft = () => "";
// Quản lý bản nháp, trạng thái gửi câu hỏi, lịch sử và thao tác xem nguồn trên màn hình chat.
export function useChatController(web: boolean) {
  const params = useSearchParams(),
    router = useRouter(),
    { notify, user, showModal, closeModal } = useApp();
  const cid = params.get("c"),
    q = params.get("q") || "";
  const resource = useResource<Conversation>(
    cid ? `conversations/${cid}` : null,
  );
  const [local, setLocal] = useState<Conversation | null>(null),
    [draft, setDraft] = useState<{ key: string; value: string } | null>(null),
    [pending, setPending] = useState(""),
    [busy, setBusy] = useState(false),
    [sourceMessageId, setSourceMessageId] = useState<string | null>(null),
    [sourceReveal, setSourceReveal] = useState(0),
    [error, setError] = useState("");
  const controller = useRef<AbortController | null>(null),
    inFlight = useRef(false),
    autoAsked = useRef(""),
    active = useRef(false),
    context = useRef(cid),
    bottom = useRef<HTMLDivElement>(null),
    textarea = useRef<HTMLTextAreaElement>(null);
  const attempt = useRef<{
    question: string;
    conversation: string | null;
    id: string;
  } | null>(null);
  const draftKey = `dtu-draft:${user?.id || ""}:${cid || "new"}`;
  const readDraft = useCallback(() => {
    try {
      return sessionStorage.getItem(draftKey) || "";
    } catch {
      return "";
    }
  }, [draftKey]);
  const savedDraft = useSyncExternalStore(
    subscribeDraft,
    readDraft,
    emptyDraft,
  );
  const input = draft?.key === draftKey ? draft.value : savedDraft;
  const setInput = useCallback(
    (value: string) => setDraft({ key: draftKey, value }),
    [draftKey],
  );
  const conversation =
    local?.id === cid
      ? local
      : resource.data?.id === cid
        ? resource.data
        : null;
  const lastAnswer = conversation?.messages?.findLast(
    (m) => m.role === "assistant" && m.status !== "processing",
  );
  const sourceAnswer =
    conversation?.messages?.find((m) => m.id === sourceMessageId) ||
    conversation?.messages?.findLast(
      (m) => m.role === "assistant" && m.citations.length > 0,
    ) ||
    lastAnswer;
  const lastQuestion = conversation?.messages?.findLast(
    (m) => m.role === "user",
  )?.content;
  const sourceIndex =
    conversation?.messages?.findIndex((m) => m.id === sourceAnswer?.id) ?? -1;
  const sourceQuestion = conversation?.messages
    ?.slice(0, sourceIndex)
    .findLast((m) => m.role === "user")?.content;
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  useEffect(() => {
    context.current = cid;
  }, [cid]);
  useEffect(() => {
    if (textarea.current) {
      textarea.current.style.height = "auto";
      textarea.current.style.height = `${Math.min(160, Math.max(48, textarea.current.scrollHeight))}px`;
    }
  }, [input]);
  useEffect(() => {
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    bottom.current?.scrollIntoView({
      behavior: reduce ? "instant" : "smooth",
      block: "nearest",
    });
  }, [conversation?.messages?.length, busy]);
  const send = useCallback(
    async (text: string) => {
      // Không gửi câu hỏi trống hoặc gửi trùng khi yêu cầu trước còn đang chạy.
      const question = text.trim();
      if (!question || inFlight.current) return;
      inFlight.current = true;
      const origin = cid;
      setBusy(true);
      setPending(question);
      setInput("");
      setError("");
      controller.current = new AbortController();
      // Giữ requestId khi thử lại cùng lượt hỏi để máy chủ tránh lưu tin nhắn trùng.
      if (
        attempt.current?.question !== question ||
        attempt.current.conversation !== cid
      )
        attempt.current = {
          question,
          conversation: cid,
          id: crypto.randomUUID(),
        };
      try {
        const value = await api<Conversation>("chat", {
          method: "POST",
          body: JSON.stringify({
            question,
            ...(cid ? { conversationId: cid } : {}),
            requestId: attempt.current.id,
            useWeb: web,
          }),
          signal: controller.current.signal,
        });
        // Bỏ kết quả cũ nếu người dùng đã rời màn hình hoặc chuyển sang hội thoại khác.
        if (!active.current || context.current !== origin) return;
        try {
          sessionStorage.removeItem(draftKey);
          window.dispatchEvent(new Event("dtu-draft"));
        } catch {}
        setLocal(value);
        attempt.current = null;
        setSourceMessageId(null);
        router.replace(`${routes.chat}?c=${value.id}`);
      } catch (e) {
        // Trả câu hỏi về ô nhập khi lỗi để người dùng không phải gõ lại.
        if (!active.current || context.current !== origin) return;
        setInput(question);
        setError(
          e instanceof Error && e.name === "AbortError"
            ? "Đã dừng chờ. Bạn có thể xem trạng thái trong lịch sử."
            : e instanceof Error
              ? e.message
              : "Không thể gửi câu hỏi. Bạn có thể thử lại.",
        );
      } finally {
        inFlight.current = false;
        controller.current = null;
        if (active.current) {
          setBusy(false);
          setPending("");
        }
      }
    },
    [cid, web, router, draftKey, setInput],
  );
  useEffect(() => {
    if (!q) autoAsked.current = "";
    else if (autoAsked.current !== q) {
      autoAsked.current = q;
      void send(q);
    }
  }, [q, send]);
  function exportChat() {
    if (!conversation) return;
    const url = URL.createObjectURL(
      new Blob(["\uFEFF", conversationText(conversation)], {
        type: "text/plain;charset=utf-8",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `DTU-hoi-thoai-${conversation.id.slice(0, 8)}.txt`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify("Đã xuất hội thoại kèm nguồn thành file TXT.");
  }
  return {
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
    showModal,
    closeModal,
    setLocal,
    setError,
    error,
    router,
    exportChat,
    setSourceMessageId,
    setSourceReveal,
  };
}
export type ChatController = ReturnType<typeof useChatController>;
