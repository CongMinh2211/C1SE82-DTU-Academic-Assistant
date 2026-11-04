// Mục đích file: Hiển thị lời chào và FAQ đã duyệt khi người dùng chưa bắt đầu hội thoại.
import { useResource } from "@/lib/api-client";
import type { FaqRecord } from "@/lib/contracts";
import { Icon } from "@/components/ui";
import type { ChatController } from "@/features/chat/hooks/use-chat-controller";

export function ChatWelcome({ send }: Pick<ChatController, "send">) {
  // Lấy FAQ từ API; API chỉ trả các mục đã công bố và còn nguồn hợp lệ.
  const faqs = useResource<FaqRecord[]>("faqs");
  return (
    <div className="chat-welcome">
      <span className="eyebrow">CÙNG BẠN TRÊN HÀNH TRÌNH ĐẠI HỌC</span>
      <h2>Chào bạn, mình sẵn sàng hỗ trợ.</h2>
      <p>Chọn một câu hỏi thường gặp hoặc đặt câu hỏi của bạn.</p>
      {faqs.loading && <p role="status">Đang tải câu hỏi thường gặp…</p>}
      {faqs.error && (
        <p>
          Chưa thể tải câu hỏi thường gặp. Bạn vẫn có thể đặt câu hỏi bên dưới.
        </p>
      )}
      <div className="chat-starters">
        {faqs.data?.slice(0, 4).map((faq) => (
          <button
            type="button"
            key={faq.id}
            onClick={() => void send(faq.question)}
          >
            <Icon name="help" size={20} />
            <span>{faq.question}</span>
            <span aria-hidden="true">↗</span>
          </button>
        ))}
      </div>
    </div>
  );
}
