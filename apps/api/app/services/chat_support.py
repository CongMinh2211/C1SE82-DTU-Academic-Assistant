"""Bước trả lời trích xuất tạm thời, chưa kết nối mô hình LLM tiếng Việt."""

from collections.abc import Sequence

from app.rag.grounding import EvidenceCandidate, select_evidence
from app.schemas.chat import AskResponse, Citation


FALLBACK = (
    "Mình chưa tìm được nguồn đã duyệt đủ phù hợp để trả lời câu hỏi này. "
    "Bạn có thể hỏi rõ hơn hoặc liên hệ đơn vị phụ trách của trường."
)


def answer_from_evidence(
    candidates: Sequence[EvidenceCandidate], *, minimum_similarity: float
) -> AskResponse:
    # Không có đoạn nào qua cổng kiểm chứng thì trả lời an toàn, không để LLM
    # tự tạo quy định học vụ hoặc bịa nguồn trích dẫn.
    selected = select_evidence(candidates, minimum_similarity=minimum_similarity)
    if not selected:
        return AskResponse(answer=FALLBACK, fallback=True, reason="insufficient_evidence")

    # Chỉ hiển thị nguyên văn đoạn đã duyệt cùng định danh phiên bản tài liệu.
    # Đây là preview để FE tích hợp trạng thái citation/fallback, chưa phải
    # câu trả lời học vụ hoàn chỉnh. Không tổng hợp thành chính sách mới.
    excerpts = []
    citations = []
    for number, item in enumerate(selected, 1):
        excerpt = " ".join(item.excerpt.split())
        excerpts.append(f'[{number}] “{excerpt[:500]}”')
        citations.append(Citation(
            chunk_id=item.chunk_id,
            document_version_id=item.document_version_id,
            title=item.title,
            page=item.page,
            section=item.section,
            effective_date=item.effective_date,
        ))
    return AskResponse(
        answer="Đây là đoạn tài liệu liên quan để bạn đối chiếu:\n" + "\n".join(excerpts),
        citations=citations,
        fallback=False,
    )
