// Mục đích file: Đưa ra gợi ý hỏi tiếp theo câu trả lời và chủ đề vừa trao đổi.
import type { ChatController } from "@/features/chat/hooks/use-chat-controller";
export function ChatFollowUps({
  send,
  question,
}: Pick<ChatController, "send"> & { question?: string }) {
  // Bỏ dấu để nhận diện chủ đề dù sinh viên gõ tiếng Việt không dấu.
  const topic = (question || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase();
  const suggestions = [
    [
      "Giải thích rõ hơn",
      "Giải thích rõ hơn câu trả lời vừa rồi và giữ đúng nguồn nếu có.",
    ],
    [
      "Tôi chưa hiểu",
      "Tôi chưa hiểu câu trả lời vừa rồi, hãy giải thích dễ hiểu hơn.",
    ],
    [
      "Cho ví dụ cụ thể",
      "Cho ví dụ minh họa dễ hiểu cho câu trả lời vừa rồi; ghi rõ đó là ví dụ và không bịa quy định.",
    ],
  ];
  // Chỉ thêm gợi ý theo một trong các chủ đề đã nhận diện; các câu giải thích chung luôn có.
  if (/hoc phi|tin chi|tuition/.test(topic))
    suggestions.push([
      "Hướng dẫn nộp học phí",
      "Hướng dẫn nộp học phí theo nguồn chính thức là gì?",
    ]);
  else if (/lich thi|danh sach thi/.test(topic))
    suggestions.push(["Xem lịch thi ở đâu?", "Xem lịch thi ở đâu?"]);
  else if (/tot nghiep|capstone/.test(topic))
    suggestions.push([
      "Điều kiện liên quan",
      "Những điều kiện liên quan đến nội dung vừa hỏi là gì?",
    ]);
  return (
    <div className="chat-follow-ups" aria-label="Tiếp tục hội thoại">
      {suggestions.map(([label, question]) => (
        <button key={label} type="button" onClick={() => void send(question)}>
          {label} <span aria-hidden="true">↗</span>
        </button>
      ))}
    </div>
  );
}
