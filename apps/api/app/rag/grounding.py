"""Lọc bằng chứng trước khi đưa cho bước tạo câu trả lời.

Repository pgvector do Tài triển khai sẽ trả về các đoạn kèm trạng thái duyệt,
phiên bản và điểm tương đồng. Bộ lọc này không tự coi tài liệu là đáng tin:
trạng thái duyệt phải đến từ CSDL và quy trình quản trị tài liệu.
"""

from dataclasses import dataclass
from datetime import date
from math import isfinite
from typing import Iterable


@dataclass(frozen=True)
class EvidenceCandidate:
    chunk_id: str
    document_version_id: str
    title: str
    excerpt: str
    similarity: float
    approved: bool
    active: bool = True
    page: int | None = None
    section: str | None = None
    effective_date: date | None = None
    expires_on: date | None = None


def select_evidence(
    candidates: Iterable[EvidenceCandidate],
    *,
    minimum_similarity: float,
    today: date | None = None,
    limit: int = 2,
) -> list[EvidenceCandidate]:
    """Chỉ giữ đoạn đã duyệt, còn hiệu lực và đạt ngưỡng truy xuất."""
    if not 0 <= minimum_similarity <= 1:
        raise ValueError("minimum_similarity must be between 0 and 1")
    if limit < 1:
        raise ValueError("limit must be positive")
    today = today or date.today()
    # Lọc trước khi xếp hạng: điểm cao không được phép vượt qua điều kiện duyệt.
    # Ngày bắt đầu trong tương lai và ngày hết hiệu lực đã qua đều không hợp lệ.
    # Không suy đoán ngày hiệu lực khi nguồn dữ liệu chưa cung cấp thông tin.
    eligible = (
        item for item in candidates
        if isinstance(item, EvidenceCandidate)
        and item.approved is True
        and item.active is True
        # Provider là ranh giới dữ liệu ngoài: sai kiểu phải bị loại, không
        # làm hỏng toàn bộ yêu cầu hoặc biến nội dung thiếu thành trích dẫn.
        and all(isinstance(value, str) and value.strip() for value in (
            item.chunk_id, item.document_version_id, item.title, item.excerpt
        ))
        and isinstance(item.similarity, (int, float))
        and not isinstance(item.similarity, bool)
        and isfinite(item.similarity)
        # Provider phải trả cosine hợp lệ; không dùng điểm vượt 1 để tạo citation.
        and -1 <= item.similarity <= 1
        and item.similarity >= minimum_similarity
        and (item.effective_date is None or type(item.effective_date) is date)
        and (item.expires_on is None or type(item.expires_on) is date)
        and (item.page is None or (type(item.page) is int and item.page > 0))
        and (item.section is None or isinstance(item.section, str))
        and (item.effective_date is None or item.effective_date <= today)
        and (item.expires_on is None or item.expires_on >= today)
        and (item.effective_date is None or item.expires_on is None or item.effective_date <= item.expires_on)
    )
    result: list[EvidenceCandidate] = []
    seen: set[str] = set()
    # Một chunk có thể xuất hiện nhiều lần từ các chiến lược truy xuất.
    # Chỉ lấy bản có điểm cao nhất và giữ giới hạn ngắn cho phần trích dẫn.
    for item in sorted(eligible, key=lambda item: item.similarity, reverse=True):
        if item.chunk_id not in seen:
            result.append(item)
            seen.add(item.chunk_id)
        if len(result) == limit:
            break
    return result
