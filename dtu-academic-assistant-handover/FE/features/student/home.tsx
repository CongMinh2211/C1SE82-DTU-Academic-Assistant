// Mục đích file: Hiển thị trang chủ sinh viên và các lối vào chức năng học vụ.
"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { routes } from "@/lib/routes";
import { useResource, dateText } from "@/lib/api-client";
import type { Conversation } from "@/lib/contracts";
import { useApp } from "@/components/app-provider";
import { ResourceState, topics } from "@/components/live-shared";
import {
  Button,
  ButtonLink,
  CampusImage,
  Card,
  EmptyState,
  Icon,
  IconTile,
  Notice,
} from "@/components/ui";

export function StudentHome() {
  // Lấy người dùng và lịch sử để cá nhân hóa trang chủ.
  const router = useRouter(),
    { user } = useApp();
  const [input, setInput] = useState("");
  const history = useResource<Conversation[]>("conversations");
  // Chuyển câu hỏi không rỗng sang trang chat bằng tham số URL đã mã hóa.
  const ask = (q: string) => {
    if (q.trim())
      router.push(`${routes.chat}?q=${encodeURIComponent(q.trim())}`);
  };
  return (
    <>
      <section className="welcome-hero">
        <div className="welcome-copy">
          <strong>
            XIN CHÀO, {user?.name.split(" ").at(-1)?.toUpperCase()}
          </strong>
          <h1>Hôm nay bạn cần hỗ trợ điều gì?</h1>
          <p>
            Tìm câu trả lời về học phần, học phí, điểm số và thủ tục sinh viên —
            kèm nguồn để bạn kiểm tra.
          </p>
          <form
            className="question-composer"
            onSubmit={(e) => {
              e.preventDefault();
              ask(input);
            }}
          >
            <Icon name="search" tone="muted" />
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              aria-label="Câu hỏi học vụ"
              placeholder="Nhập câu hỏi học vụ của bạn…"
              required
              maxLength={2500}
            />
            <Button type="submit">Gửi câu hỏi</Button>
          </form>
        </div>
        <CampusImage variant="home" priority />
      </section>
      <div className="section-heading">
        <h2>Bạn muốn tìm hiểu về…</h2>
        <ButtonLink href={routes.faq}>Xem FAQ & thủ tục</ButtonLink>
      </div>
      <div className="topic-grid">
        {topics.slice(0, 4).map((t, i) => (
          <Link
            key={t}
            className={`topic-card ${["tone-blue", "tone-teal", "topic-purple", "tone-amber"][i]}`}
            href={`${routes.faq}?chu-de=${encodeURIComponent(t)}`}
          >
            <strong>{t}</strong>
            <p>
              {
                [
                  "Điều kiện và quy trình đăng ký.",
                  "Biểu phí theo khóa và chương trình.",
                  "Đánh giá và quy chế học tập.",
                  "Điều kiện và đợt xét tốt nghiệp.",
                ][i]
              }
            </p>
            <span>Khám phá →</span>
          </Link>
        ))}
      </div>
      <div className="equal-columns home-info">
        <Card>
          <div className="card-title">
            <Icon name="help" />
            <h2>Gợi ý tra cứu</h2>
          </div>
          {[
            "HKI năm học 2026-2027 được đăng ký tối đa bao nhiêu tín chỉ?",
            "Học phí K31 ngành Công nghệ Phần mềm mã 102 năm học 2026-2027 là bao nhiêu?",
            "Điều kiện công nhận tốt nghiệp đợt tháng 9/2026 là gì?",
          ].map((q) => (
            <button key={q} className="record" onClick={() => ask(q)}>
              <IconTile name="chat" />
              <span className="record-copy">
                <strong>{q}</strong>
                <small>Tra cứu nguồn tài liệu đã xuất bản</small>
              </span>
              <Icon name="chevron" tone="muted" size={20} />
            </button>
          ))}
        </Card>
        <Card>
          <h2>Tiếp tục câu chuyện của bạn</h2>
          <ResourceState {...history} retry={history.refresh} />
          {history.data?.slice(0, 3).map((c) => (
            <Link
              key={c.id}
              className="record"
              href={`${routes.chat}?c=${c.id}`}
            >
              <IconTile name="clock" />
              <span className="record-copy">
                <strong>{c.title}</strong>
                <small>{dateText(c.updated_at)}</small>
              </span>
              <Icon name="chevron" tone="muted" size={20} />
            </Link>
          ))}
          {history.data?.length === 0 && (
            <EmptyState>
              Những cuộc trò chuyện của bạn sẽ xuất hiện ở đây.
            </EmptyState>
          )}
          <ButtonLink href={routes.history}>Xem lịch sử hỏi đáp</ButtonLink>
        </Card>
      </div>
      <Notice title="Kiểm tra đúng phạm vi áp dụng">
        Cho biết khóa, ngành/chương trình và học kỳ hoặc đợt xét để trợ lý tìm
        nguồn phù hợp.
      </Notice>
    </>
  );
}
