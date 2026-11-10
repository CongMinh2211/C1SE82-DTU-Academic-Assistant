// Mục đích file: Cho phép chọn đoạn tài liệu làm nguồn tham chiếu khi biên soạn FAQ.
import type { useResource } from "@/lib/api-client";
import type { DocumentRecord, FaqRecord } from "@/lib/contracts";

import { ResourceState } from "@/components/live-shared";
import { Card, SearchInput, Select } from "@/components/ui";
import type { ChunkOption } from "@/features/faqs/types";
export function FaqSourcePicker({
  docs,
  chunks,
  selectedRevision,
  setRevision,
  setSource,
  setSourceSearch,
  sourceSearch,
  selectedSource,
  selectedChunk,
  current,
}: {
  docs: ReturnType<typeof useResource<DocumentRecord[]>>;
  chunks: ReturnType<typeof useResource<{ chunks: ChunkOption[] }>>;
  selectedRevision: string;
  setRevision: (value: string) => void;
  setSource: (value: string) => void;
  setSourceSearch: (value: string) => void;
  sourceSearch: string;
  selectedSource: string;
  selectedChunk?: ChunkOption;
  current?: FaqRecord;
}) {
  // Các lựa chọn và kết quả tải được truyền từ editor; chọn nguồn tại đây chưa xuất bản FAQ.
  return (
    <Card>
      <h2>Nguồn tham khảo</h2>
      <ResourceState {...docs} retry={docs.refresh} />
      <label className="field">
        <span>Tài liệu đã xuất bản</span>
        <Select
          aria-label="Tài liệu cho FAQ"
          value={selectedRevision}
          onChange={(e) => {
            setRevision(e.target.value);
            setSource("");
            setSourceSearch("");
          }}
        >
          <option value="">Chọn tài liệu…</option>
          {docs.data
            ?.filter((d) => d.active_revision)
            .map((d) => (
              <option key={d.id} value={d.active_revision!}>
                {d.title}
              </option>
            ))}
        </Select>
      </label>
      <ResourceState {...chunks} retry={chunks.refresh} />
      {selectedRevision && (
        <>
          <SearchInput
            placeholder="Tìm đoạn nguồn…"
            value={sourceSearch}
            onChange={(e) => setSourceSearch(e.target.value)}
          />
          <label className="field">
            <span>Đoạn trích</span>
            <Select
              aria-label="Đoạn nguồn cho FAQ"
              size={8}
              value={selectedSource}
              onChange={(e) => setSource(e.target.value)}
            >
              <option value="">Chọn đoạn để đối chiếu…</option>
              {chunks.data?.chunks
                .filter(
                  (c) =>
                    c.text.toLowerCase().includes(sourceSearch.toLowerCase()) ||
                    c.id === selectedSource,
                )
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    Tr.{c.page}: {c.text.slice(0, 160)}
                  </option>
                ))}
            </Select>
          </label>
        </>
      )}
      {selectedSource && (
        <>
          <h3>Đoạn nguồn đã chọn</h3>
          <blockquote className="source-quote">
            {selectedChunk?.text || current?.source_quote}
          </blockquote>
        </>
      )}
      {(docs.data?.find((d) => d.active_revision === selectedRevision)?.scope ||
        current?.source_scope) && (
        <div className="source-scope-note">
          <h3>Phạm vi áp dụng</h3>
          <p>
            {docs.data?.find((d) => d.active_revision === selectedRevision)
              ?.scope || current?.source_scope}
          </p>
        </div>
      )}
    </Card>
  );
}
