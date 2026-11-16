"""Chuẩn hóa cách hỏi học phí rút gọn, không thêm dữ kiện hoặc gọi thêm LLM."""
import re
import unicodedata


def plain(question: str) -> str:
    folded = unicodedata.normalize("NFD", question.casefold().replace("đ", "d"))
    return "".join(character for character in folded if not unicodedata.combining(character))

TUITION_PREFIX = "Tra cứu học phí, đơn giá tín chỉ: "


def normalize_question(question: str) -> str:
    """Đồng nhất từ ngữ tương đương, giữ ngành, khóa, số lượng và phạm vi gốc.

    Chỉ mở rộng 'tín/tc' khi có ý hỏi giá. Không biến câu hỏi đăng ký tín chỉ,
    điểm số hoặc số tín tích lũy thành câu hỏi học phí. Không đoán tên viết tắt
    của ngành và tuyệt đối không chèn giá tiền/khóa học mặc định.
    """
    prefix = TUITION_PREFIX
    if question.startswith(prefix):
        return question
    value = re.sub(r"\s+", " ", plain(question)).strip()
    value = re.sub(r"(\d)(?=tin\b|tc\b)", r"\1 ", value)
    credit = r"\b(?:tin(?:\s+chi)?|tc)\b"
    cost = r"\b(?:bao nhieu tien|bao nhieu vay|bao nhieu|nhieu tien|may tien|gia|hoc phi|het nhieu tien|het nhieu|ton nhieu|bao tien)\b"
    if not re.search(credit, value) or not re.search(cost, value):
        return question
    explicit_money = re.search(r"\b(?:hoc phi|gia|tien|dong|vnd)\b", value)
    if not explicit_money and (
        re.search(r"\b(?:diem|gio|dang ky|tich luy|tot nghiep)\b", value)
        or re.search(r"\bbao nhieu\s+(?:tin|tc)\b", value)
    ):
        return question
    # Các từ này không thay đổi đối tượng được hỏi; bỏ chúng để cả hai cách
    # '1 tín Digital Marketing' và '1 tín ngành Digital Marketing' dùng cùng vector.
    value = re.sub(r"\b(?:chuyen nganh|nganh)\b", " ", value)
    value = re.sub(r"\b(?:1|mot)\s+(?:tin(?:\s+chi)?|tc)\b", "tin chi", value)
    value = re.sub(credit, "tin chi", value)
    # Cùng ý hỏi giá nhưng đảo vị trí/ngắt câu: đưa đơn vị lên đầu và bỏ
    # cụm hỏi giá đã được xác nhận ở trên. Giữ khóa, học kỳ, phủ định và số
    # lượng; không sắp xếp tùy tiện mọi từ vì có thể đảo nghĩa câu hỏi.
    value = re.sub(cost, " ", value)
    value = re.sub(r"\b(?:cho minh hoi|cho toi hoi|cho hoi|minh muon hoi)\b", " ", value)
    value = re.sub(r"\b(?:la|thi|vay|nhi)\b", " ", value)
    value = re.sub(r"[^\w\s]", " ", value)
    value = re.sub(r"\s+", " ", value).strip()
    if value.count("tin chi") == 1 and not re.search(r"\b\d+\s+tin chi\b", value):
        value = "tin chi " + value.replace("tin chi", " ").strip()
    value = re.sub(r"\s+", " ", value).strip()
    return prefix + value
