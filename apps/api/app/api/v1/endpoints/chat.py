"""API hỏi đáp preview; provider rỗng sẽ được thay bằng truy xuất CSDL."""

import os
from typing import Protocol

from fastapi import APIRouter, Depends, HTTPException

from app.rag.grounding import EvidenceCandidate
from app.rag.query_normalizer import normalize_question
from app.schemas.chat import AskRequest, AskResponse
from app.services.chat_support import answer_from_evidence

router = APIRouter(tags=["chat"])


class CandidateProvider(Protocol):
    """Hợp đồng để Tài nối pgvector mà không sửa luồng kiểm chứng/response."""
    def search(self, question: str, *, limit: int) -> list[EvidenceCandidate]: ...


class EmptyProvider:
    """Mặc định không có nguồn; API chỉ có thể trả safe fallback."""
    def search(self, question: str, *, limit: int) -> list[EvidenceCandidate]:
        return []


def get_candidate_provider() -> CandidateProvider:
    """Điểm gắn repository truy xuất các chunk đã duyệt của Tài."""
    return EmptyProvider()


@router.post("/chat/ask", response_model=AskResponse)
def ask_question(
    request: AskRequest, provider: CandidateProvider = Depends(get_candidate_provider)
) -> AskResponse:
    # Mặc định tắt đến khi xác thực, nguồn DTU và quyền truy cập được nối.
    if os.getenv("ENABLE_CHAT_PREVIEW", "false").lower() != "true":
        raise HTTPException(status_code=503, detail="Chat API chưa được bật cho môi trường này.")
    try:
        # Kiểm tra trước khi gọi provider, tránh truy vấn khi cấu hình không hợp lệ.
        threshold = float(os.getenv("RAG_MIN_SIMILARITY", "0.72"))
        if not 0 <= threshold <= 1:
            raise ValueError("invalid similarity threshold")
    except (TypeError, ValueError) as exc:
        raise HTTPException(status_code=503, detail="Cấu hình truy xuất chưa hợp lệ.") from exc
    try:
        candidates = provider.search(normalize_question(request.question), limit=5)
        return answer_from_evidence(candidates, minimum_similarity=threshold)
    except Exception as exc:
        # Không trả chi tiết lỗi DB/provider hoặc nhầm lỗi dịch vụ với không có nguồn.
        raise HTTPException(status_code=503, detail="Dịch vụ truy xuất tạm thời không khả dụng.") from exc
