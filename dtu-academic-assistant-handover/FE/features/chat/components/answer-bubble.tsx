// Mục đích file: Hiển thị câu trả lời, trích dẫn, liên kết và thao tác sao chép hoặc góp ý.
"use client";
import Link from "next/link";
import { routes } from "@/lib/routes";
import type { Message } from "@/lib/contracts";
import { useApp } from "@/components/app-provider";
import { Status } from "@/components/live-shared";

export function AnswerBubble({
  message,
  onShowSources,
  onRetry,
  busy,
}: {
  message: Message;
  onShowSources: () => void;
  onRetry?: () => void;
  busy: boolean;
}) {
  const { notify } = useApp();
  // Tập ID cho phép xác định dấu [n] nào thực sự có nguồn trong câu trả lời.
  const cited = new Set(message.citations.map((c) => c.id));
  // Tách văn bản thành các đoạn thường, số trích dẫn và URL để xử lý từng loại.
  const parts = message.content.split(/(\[\d+\]|https:\/\/[^\s<>]+)/g);
  return (
    <div
      className={`answer-bubble ${message.status === "insufficient" ? "fallback-answer" : ""}`}
    >
      <Status value={message.status} />
      <div className="answer-text">
        {message.content
          ? parts.map((part, i) => {
              // Chỉ biến số trích dẫn có thật thành liên kết xem nguồn.
              const id = part.match(/^\[(\d+)\]$/)?.[1];
              // Bỏ dấu câu cuối URL khi kiểm tra; chỉ tạo link nếu URL thuộc nguồn đã trích.
              const link = part.replace(/[.,;!?]+$/, "");
              if (link.startsWith("https://") && message.citations.some((c) => c.url === link))
                return <a key={i} href={link} target="_blank" rel="noopener noreferrer">{link}{part.slice(link.length)}</a>;
              return id && cited.has(id) ? (
                <Link
                  className="inline-citation"
                  aria-label={`Xem nguồn ${id}`}
                  href={`${routes.source}?message=${message.id}&citation=${id}`}
                  key={i}
                >
                  {part}
                </Link>
              ) : (
                part
              );
            })
          : "Yêu cầu đang được xử lý. Bạn có thể kiểm tra lại trong lịch sử."}
      </div>
      {message.status === "insufficient" && (
        <div className="answer-text">
          <p>Nếu cần xác nhận thông tin học vụ, bạn có thể liên hệ:</p>
          <p>
            Ban Đào tạo: K7/25 Quang Trung, Đà Nẵng. Điện thoại:{" "}
            <a href="tel:02362243775">0236 2 243 775</a>; email:{" "}
            <a href="mailto:bandaotao@duytan.edu.vn">bandaotao@duytan.edu.vn</a>
            . Thông tin liên hệ theo{" "}
            <a
              href="https://duytan.edu.vn/ContactUs"
              target="_blank"
              rel="noreferrer"
            >
              danh bạ chính thức của DTU
            </a>
            .
          </p>
          <p>
            Bạn cũng có thể liên hệ cố vấn học tập hoặc văn phòng khoa của mình.
          </p>
        </div>
      )}
      {message.citations.some((c) => c.url?.startsWith("https://")) && (
        <div className="answer-tools" aria-label="Liên kết nguồn">
          {message.citations
            .filter((c) => c.url?.startsWith("https://"))
            .map((c) => (
              <a
                key={c.id}
                href={c.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                Nguồn [{c.id}]: {c.title} ↗
              </a>
            ))}
        </div>
      )}
      {message.status !== "processing" && (
        <div className="answer-tools">
          <button
            type="button"
            onClick={async () => {
              // Sao chép nguyên văn câu trả lời và thông báo nếu trình duyệt từ chối quyền clipboard.
              try {
                await navigator.clipboard.writeText(message.content);
                notify("Đã sao chép câu trả lời.");
              } catch {
                notify(
                  "Trình duyệt không cho phép sao chép. Bạn có thể chọn và sao chép văn bản.",
                );
              }
            }}
          >
            Sao chép
          </button>
          {message.status === "error" && onRetry && (
            <button type="button" onClick={onRetry} disabled={busy}>
              Thử lại câu hỏi
            </button>
          )}
          {message.status !== "processing" && (
            <Link href={`${routes.feedback}?message=${message.id}`}>
              Đánh giá / Góp ý
            </Link>
          )}
          {message.citations.length > 0 && (
            <button
              type="button"
              className="show-answer-sources"
              onClick={onShowSources}
            >
              Xem {message.citations.length} nguồn
            </button>
          )}
        </div>
      )}
    </div>
  );
}
