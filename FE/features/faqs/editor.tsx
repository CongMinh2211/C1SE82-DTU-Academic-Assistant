// Mục đích file: Biên soạn FAQ, chọn nguồn và gửi yêu cầu lưu hoặc xuất bản.
"use client";
import type { ChunkOption } from "./types";
import { FaqSourcePicker } from "@/features/faqs/components/source-picker";
import { useRef, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, useResource } from "@/lib/api-client";
import type { DocumentRecord, FaqRecord } from "@/lib/contracts";
import { routes } from "@/lib/routes";
import { useApp } from "@/components/app-provider";
import { topics, ResourceState } from "@/components/live-shared";
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  EmptyState,
  Heading,
  Select,
} from "@/components/ui";

export function FaqEditor() {
  // Khi có ID thì tải FAQ hiện tại; đồng thời lấy tài liệu để chọn nguồn.
  const params = useSearchParams(),
    faqId = params.get("id"),
    router = useRouter(),
    { notify, showModal } = useApp();
  const faqs = useResource<FaqRecord[]>(faqId ? "admin/faqs" : null),
    docs = useResource<DocumentRecord[]>("admin/documents");
  const [revision, setRevision] = useState<string | null>(null),
    [source, setSource] = useState<string | null>(null),
    [sourceSearch, setSourceSearch] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const formRef = useRef<HTMLFormElement>(null),
    current = faqs.data?.find((f) => f.id === faqId),
    selectedRevision = revision ?? current?.source_revision ?? "",
    selectedSource = source ?? current?.source_chunk ?? "";
  // Chỉ tải các đoạn nguồn khi đã chọn một phiên bản tài liệu.
  const chunks = useResource<{ chunks: ChunkOption[] }>(
    selectedRevision ? `admin/revision/${selectedRevision}` : null,
  );
  // Nguồn được coi là đang hoạt động khi phiên bản trùng với bản tài liệu đang phục vụ.
  const selectedChunk = chunks.data?.chunks.find(
      (c) => c.id === selectedSource,
    ),
    sourceActive =
      !!selectedSource &&
      !!docs.data?.some((d) => d.active_revision === selectedRevision);
  async function save(e: FormEvent<HTMLFormElement>) {
    // Dựa vào nút gửi để phân biệt lưu bản nháp và yêu cầu xuất bản.
    e.preventDefault();
    const f = new FormData(e.currentTarget),
      submitter = (e.nativeEvent as SubmitEvent)
        .submitter as HTMLButtonElement | null,
      status = submitter?.value === "published" ? "published" : "draft";
    setBusy(true);
    setError("");
    try {
      // Máy chủ kiểm tra lại đoạn nguồn và quyền trước khi lưu hoặc xuất bản.
      await api("admin/faqs", {
        method: "POST",
        body: JSON.stringify({
          ...(faqId ? { id: faqId } : {}),
          question: f.get("question"),
          answer: f.get("answer"),
          topic: f.get("topic"),
          sourceChunk: selectedSource || null,
          status,
        }),
      });
      notify(
        status === "published" ? "Đã xuất bản FAQ." : "Đã lưu bản nháp FAQ.",
      );
      router.push(routes.adminFaq);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function preview() {
    // Xem trước lấy dữ liệu hiện trong form, không tự lưu hoặc xuất bản FAQ.
    if (!formRef.current) return;
    const f = new FormData(formRef.current);
    showModal(
      "Xem trước câu trả lời",
      <div className="stack">
        <Badge tone={sourceActive ? "teal" : "amber"}>
          {sourceActive
            ? "Đã chọn nguồn"
            : "Bản nháp chưa có nguồn đang phục vụ"}
        </Badge>
        <h3>{String(f.get("question") || "Chưa nhập câu hỏi")}</h3>
        <p className="answer-text">
          {String(f.get("answer") || "Chưa nhập nội dung")}
        </p>
        {selectedSource && (
          <>
            <h4>Nguồn đối chiếu</h4>
            <blockquote className="source-quote">
              {selectedChunk?.text || current?.source_quote}
            </blockquote>
            <p className="muted">
              {docs.data?.find((d) => d.active_revision === selectedRevision)
                ?.title || current?.source_title}
            </p>
          </>
        )}
      </div>,
    );
  }
  if (faqId && !faqs.data)
    return <ResourceState {...faqs} retry={faqs.refresh} />;
  if (faqId && !current)
    return (
      <EmptyState>
        FAQ không còn tồn tại.{" "}
        <ButtonLink href={routes.adminFaq}>Về danh sách FAQ</ButtonLink>
      </EmptyState>
    );
  return (
    <>
      <Heading
        title="Biên soạn câu hỏi thường gặp"
        description="Lưu bản nháp, kiểm tra nguồn và xem trước trước khi xuất bản."
        action={
          <ButtonLink href={routes.adminFaq}>Về danh sách FAQ</ButtonLink>
        }
      />
      <div className="two-columns">
        <Card>
          <form
            ref={formRef}
            className="stack"
            onSubmit={save}
            key={current?.id || "new"}
          >
            <label className="field">
              <span>Câu hỏi</span>
              <input
                className="input"
                name="question"
                minLength={5}
                maxLength={300}
                defaultValue={current?.question}
                required
              />
            </label>
            <label className="field">
              <span>Chủ đề</span>
              <Select name="topic" defaultValue={current?.topic || topics[0]}>
                {topics.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </Select>
            </label>
            <label className="field">
              <span>Nội dung trả lời</span>
              <textarea
                className="input"
                name="answer"
                rows={12}
                minLength={5}
                maxLength={5000}
                defaultValue={current?.answer}
                required
              />
            </label>
            <p className="muted">
              {sourceActive
                ? "Nguồn đã được chọn. Đối chiếu nội dung và phạm vi áp dụng trước khi xuất bản."
                : "Bạn có thể lưu bản nháp. Cần chọn nguồn đang xuất bản để duyệt FAQ."}
            </p>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <div className="row faq-editor-actions">
              <Button
                type="submit"
                name="intent"
                value="draft"
                variant="outline"
                disabled={busy}
              >
                {busy ? "Đang lưu…" : "Lưu bản nháp"}
              </Button>
              <Button variant="secondary" disabled={busy} onClick={preview}>
                Xem trước
              </Button>
              <Button
                type="submit"
                name="intent"
                value="published"
                disabled={busy || !sourceActive}
              >
                Duyệt xuất bản
              </Button>
            </div>
          </form>
        </Card>
        <FaqSourcePicker
          docs={docs}
          chunks={chunks}
          selectedRevision={selectedRevision}
          setRevision={setRevision}
          setSource={setSource}
          setSourceSearch={setSourceSearch}
          sourceSearch={sourceSearch}
          selectedSource={selectedSource}
          selectedChunk={selectedChunk}
          current={current}
        />
      </div>
    </>
  );
}
