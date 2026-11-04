// Mục đích file: Hiển thị danh sách nguồn gắn với câu trả lời để người dùng đối chiếu.
"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { routes } from "@/lib/routes";
import { dateText } from "@/lib/api-client";
import type { Citation, Message } from "@/lib/contracts";
import { Badge, Icon, IconTile } from "@/components/ui";

const sourceLabels: Record<string, string> = {
  official: "Nguồn DTU",
  institutional: "Cơ quan / tổ chức",
  press: "Báo chí",
  reference: "Nguồn tham khảo",
  other: "Cần đối chiếu",
};

export function citationLabel(c: Citation) {
  // Nguồn web hiển thị loại nhà xuất bản; tài liệu nội bộ hiển thị phiên bản.
  return c.documentId === "web"
    ? sourceLabels[c.sourceTier || "other"]
    : `Tài liệu • Phiên bản ${c.version}`;
}

export function Sources({
  answer,
  reveal,
  question,
}: {
  answer?: Message;
  reveal: number;
  question?: string;
}) {
  const [open, setOpen] = useState(true);
  const panel = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    // Khi có yêu cầu xem nguồn, mở bảng chi tiết và cuộn tới vùng nguồn.
    if (!reveal) return;
    if (panel.current) panel.current.open = true;
    panel.current?.scrollIntoView({
      block: "nearest",
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
    panel.current?.focus({ preventScroll: true });
  }, [reveal]);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1200px)");
    const update = () => setOpen(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return (
    <details
      className="card source-evidence"
      ref={panel}
      tabIndex={-1}
      open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary>
        <span>
          <Icon name="file" size={20} />
          <strong>Nguồn tham khảo</strong>
        </span>
        <Badge tone="blue">{answer?.citations.length || 0}</Badge>
        <span className="source-chevron" aria-hidden="true">
          ⌄
        </span>
      </summary>
      <div className="sources-body">
        {!!answer?.citations.length && question && (
          <p className="source-question" title={question}>
            <small>Nguồn cho câu hỏi</small>
            {question}
          </p>
        )}
        {answer?.citations.map((c) => (
          <Link
            className="citation-card"
            key={c.id}
            href={`${routes.source}?message=${answer.id}&citation=${c.id}`}
          >
            <div className="citation-meta">
              <span
                className={`source-tier tier-${c.sourceTier || "document"}`}
              >
                {citationLabel(c)}
              </span>
              <span>[{c.id}]</span>
            </div>
            <strong>{c.title}</strong>
            <small>
              {c.documentId === "web"
                ? c.url && new URL(c.url).hostname.replace(/^www\./, "")
                : `Trang ${c.page}${c.pageEnd > c.page ? `–${c.pageEnd}` : ""}`}
              {c.retrievedAt ? ` · ${dateText(c.retrievedAt)}` : ""}
            </small>
            <span>
              Xem đoạn nguồn <span aria-hidden="true">↗</span>
            </span>
          </Link>
        ))}
        {!answer?.citations.length && (
          <div className="sources-empty">
            <IconTile name="file" tone="muted" size={40} />
            <p>Nguồn sẽ xuất hiện ở đây khi bạn tra cứu thông tin.</p>
          </div>
        )}
        {!!answer?.citations.length && (
          <p className="source-note">
            Đối chiếu thời điểm và phạm vi áp dụng trong từng nguồn.
          </p>
        )}
      </div>
    </details>
  );
}
