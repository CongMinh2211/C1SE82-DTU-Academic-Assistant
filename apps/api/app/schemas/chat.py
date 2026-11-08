"""Schema tạm cho API hỏi đáp ưu tiên nguồn trích dẫn."""

from datetime import date

from pydantic import BaseModel, Field, field_validator


class AskRequest(BaseModel):
    question: str = Field(min_length=5, max_length=1000)

    @field_validator("question")
    @classmethod
    def meaningful_question(cls, value: str) -> str:
        # Gom khoảng trắng để tránh câu hỏi nhìn dài nhưng chỉ chứa dấu cách.
        value = " ".join(value.split())
        if len(value) < 5:
            raise ValueError("Câu hỏi cần ít nhất 5 ký tự.")
        return value


class Citation(BaseModel):
    chunk_id: str
    document_version_id: str
    title: str
    page: int | None = None
    section: str | None = None
    effective_date: date | None = None


class AskResponse(BaseModel):
    answer: str
    citations: list[Citation] = Field(default_factory=list)
    fallback: bool
    reason: str | None = None
