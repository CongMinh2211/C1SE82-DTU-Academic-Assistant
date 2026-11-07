// Mục đích file: Hiển thị chi tiết nguồn của câu trả lời và mở tài liệu tại trang được trích dẫn.
"use client";
import { useSearchParams } from "next/navigation";
import { routes } from "@/lib/routes";
import { useResource, dateText } from "@/lib/api-client";
import type { Citation } from "@/lib/contracts";
import { ResourceState } from "@/components/live-shared";
import { Badge, ButtonLink, Card, EmptyState, Heading } from "@/components/ui";

export function SourceDetail() {
  // Lấy tham số để phân biệt nguồn FAQ và nguồn của một tin nhắn cụ thể.
  const params = useSearchParams(),
    message = params.get("message"),
    citationId = params.get("citation"),
    faq = params.get("faq");
  // Chỉ tải khi có đủ mã FAQ hoặc cặp mã tin nhắn và trích dẫn.
  const resource = useResource<{
    citation: Citation;
    pages: { page: number; text: string }[];
    web?: boolean;
    mime?: string;
    conversationId?: string;
  }>(
    faq
      ? `faq-source/${faq}`
      : message && citationId
        ? `sources/${message}/${citationId}`
        : null,
  );
  const c = resource.data?.citation;
  const wordSource = resource.data?.mime?.includes("wordprocessingml");
  // Nếu trích đoạn đã bằng toàn bộ nội dung trang thì tránh hiển thị lặp.
  const quoteIsWholePage =
    !!c &&
    resource.data?.pages
      .map((p) => p.text)
      .join("\n\n")
      .trim() === c.quote.trim();
  return (
    <>
      <Heading
        title="Chi tiết nguồn trích dẫn"
        description="Đối chiếu nguyên văn và phạm vi áp dụng của nguồn."
        action={
          <ButtonLink
            href={
              faq
                ? routes.faq
                : resource.data?.conversationId
                  ? `${routes.chat}?c=${resource.data.conversationId}`
                  : routes.history
            }
          >
            {faq
              ? "Về FAQ"
              : resource.data?.conversationId
                ? "Về hội thoại"
                : "Về lịch sử hỏi đáp"}
          </ButtonLink>
        }
      />
      <ResourceState {...resource} retry={resource.refresh} />
      {!message && !faq && (
        <EmptyState>Mở nguồn từ câu trả lời hoặc FAQ đã xuất bản.</EmptyState>
      )}
      {c && (
        <div className="two-columns">
          <Card className="source-reading-card">
            <Badge>{resource.data?.web ? "Nguồn web" : "Nguồn tài liệu"}</Badge>
            <h2>{c.title}</h2>
            <p>
              {resource.data?.web
                ? `Truy xuất: ${dateText(c.retrievedAt!)}`
                : wordSource
                  ? `Phiên bản ${c.version} • Văn bản trích từ DOCX`
                  : `Phiên bản ${c.version} • Trang nguồn ${c.page}${c.pageEnd > c.page ? `–${c.pageEnd}` : ""}`}
            </p>
            {!quoteIsWholePage && (
              <>
                <h3>Đoạn được trích dẫn</h3>
                <blockquote className="source-quote">{c.quote}</blockquote>
              </>
            )}
            <h3>
              {quoteIsWholePage
                ? "Nội dung nguồn được trích dẫn"
                : "Nội dung trang nguồn"}
            </h3>
            {resource.data?.pages.map((p) => (
              <section key={p.page}>
                {!resource.data?.web && (
                  <h4>
                    {wordSource ? "Văn bản tài liệu" : `Trang nguồn ${p.page}`}
                  </h4>
                )}
                <pre className="source-page">{p.text}</pre>
              </section>
            ))}
          </Card>
          <Card className="source-context-card">
            <h2>Phạm vi áp dụng</h2>
            <p className="answer-text">{c.scope}</p>
            {resource.data?.web && (
              <dl className="web-source-meta">
                <div>
                  <dt>Nhà xuất bản</dt>
                  <dd>{c.url && new URL(c.url).hostname}</dd>
                </div>
                {c.publishedAt && (
                  <div>
                    <dt>Ngày đăng được ghi nhận</dt>
                    <dd>{dateText(c.publishedAt)}</dd>
                  </div>
                )}
                {c.retrievedAt && (
                  <div>
                    <dt>Thời điểm truy xuất</dt>
                    <dd>{dateText(c.retrievedAt)}</dd>
                  </div>
                )}
              </dl>
            )}
            <hr className="divider" />
            {c.url && (
              <a
                className="btn btn-primary"
                href={c.url}
                target="_blank"
                rel="noreferrer"
              >
                Mở website nguồn ↗
              </a>
            )}
            {!resource.data?.web && (message || faq) && (
              <a
                className="btn btn-outline"
                href={
                  // Fragment #page giúp trình đọc PDF mở gần vị trí trích dẫn.
                  faq
                    ? `/api/app/faq-source/${faq}/file${wordSource ? "" : `#page=${c.page}`}`
                    : `/api/app/sources/${message}/${citationId}/file${wordSource ? "" : `#page=${c.page}`}`
                }
                target="_blank"
                rel="noreferrer"
              >
                Mở tài liệu gốc ↗
              </a>
            )}
            <p className="muted">
              Với PDF, số trang là vị trí trong file, có thể khác số trang in
              trên văn bản. Với TXT/HTML, vị trí chỉ phần văn bản được lưu từ
              nguồn. DOCX không có số trang ổn định; mở file gốc để đối chiếu.
            </p>
          </Card>
        </div>
      )}
    </>
  );
}
