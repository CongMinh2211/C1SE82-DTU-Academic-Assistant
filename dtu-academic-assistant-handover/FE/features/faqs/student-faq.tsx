// Mục đích file: Hiển thị FAQ đã xuất bản cho sinh viên tìm kiếm và xem nội dung.
"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { routes } from "@/lib/routes";
import { useResource } from "@/lib/api-client";
import type { FaqRecord } from "@/lib/contracts";
import { faqMatches } from "@/lib/faq-search";
import { ResourceState, topics } from "@/components/live-shared";
import {
  Badge,
  ButtonLink,
  CampusImage,
  Card,
  EmptyState,
  Heading,
  Icon,
  Notice,
  SearchInput,
  Select,
} from "@/components/ui";

export function StudentFaq() {
  // Nạp FAQ dành cho sinh viên và nhận bộ lọc chủ đề tùy chọn từ đường dẫn.
  const params = useSearchParams(),
    resource = useResource<FaqRecord[]>("faqs");
  const [search, setSearch] = useState(""),
    [topic, setTopic] = useState(params.get("chu-de") || ""),
    [open, setOpen] = useState("");
  // Lọc kết hợp chủ đề và từ khóa trên câu hỏi, câu trả lời và tên nguồn.
  const filtered = (resource.data || []).filter(
    (f) =>
      (!topic || f.topic === topic) &&
      faqMatches(search, f.question, f.answer, f.topic, f.source_title),
  );
  return (
    <>
      <Heading
        title="FAQ & thủ tục sinh viên"
        description="Nội dung do quản trị viên biên soạn, gắn với tài liệu nguồn."
      />
      <section className="faq-banner">
        <div>
          <Badge>THƯ VIỆN HỌC VỤ</Badge>
          <h2>Tìm nhanh điều bạn đang cần</h2>
          <p>
            Kiểm tra đúng tài liệu áp dụng cho khóa và chương trình của bạn.
          </p>
        </div>
        <CampusImage variant="faq" />
      </section>
      <Card>
        <div className="filter-row">
          <SearchInput
            placeholder="Tìm câu hỏi hoặc thủ tục…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select
            aria-label="Chủ đề FAQ"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          >
            <option value="">Tất cả chủ đề</option>
            {topics.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </Select>
        </div>
        <ResourceState {...resource} retry={resource.refresh} />
        {filtered.map((f) => (
          <article className="faq-item" key={f.id}>
            <button
              className="faq-question"
              aria-expanded={open === f.id}
              onClick={() => setOpen(open === f.id ? "" : f.id)}
            >
              <strong>{f.question}</strong>
              <Icon name="chevron" tone="muted" size={20} />
            </button>
            {open === f.id && (
              <div className="faq-answer">
                <p className="answer-text">{f.answer}</p>
                <small>
                  Nội dung quản trị biên soạn • {f.source_title}, trang nguồn{" "}
                  {f.page}
                </small>
                <div className="row">
                  <ButtonLink href={`${routes.source}?faq=${f.id}`}>
                    Kiểm tra nguồn
                  </ButtonLink>
                  <ButtonLink
                    href={`${routes.chat}?q=${encodeURIComponent(f.question)}`}
                  >
                    Hỏi trợ lý
                  </ButtonLink>
                </div>
              </div>
            )}
          </article>
        ))}
        {!resource.loading && filtered.length === 0 && (
          <EmptyState>
            Chưa có FAQ đã xuất bản cho bộ lọc này. Hỏi trợ lý để tra cứu trực
            tiếp từ tài liệu.
          </EmptyState>
        )}
      </Card>
      <Notice title="Cần giải thích cho trường hợp của bạn?">
        Hỏi trợ lý theo khóa, chương trình và thời điểm cụ thể để tra cứu nguồn
        phù hợp.
      </Notice>
    </>
  );
}
