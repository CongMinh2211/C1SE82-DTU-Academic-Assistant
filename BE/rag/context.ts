// Mục đích file: Theo dõi chủ đề, khóa và thông tin được người dùng nêu trong các lượt hỏi tiếp theo.
import { normalize } from "./parser";
import {
  questionCohorts,
  questionMajorCodes,
  tuitionQuestion,
} from "./retrieve";
import type { Turn } from "./dialogue";

// Tìm các cách nói thường dùng khi sinh viên muốn hỏi tiếp thay vì bắt đầu chủ đề mới.
const followsUp = (q: string) =>
  /\b(?:con|vay|giu nguyen|doi sang|quay lai|what about|same|instead)\b/.test(
    normalize(q),
  );
const year = (q: string) => q.match(/20\d{2}\s*[-–/]\s*20\d{2}/)?.[0];

// Một chủ đề mới được nêu rõ phải dùng câu hỏi mới để truy xuất, không ghép khóa cũ.
export function explicitTopicShift(question: string, history: Turn[]) {
  const topics = (text: string) => {
    const q = normalize(text);
    return [
      ["tuition", /\bhoc phi\b/],
      ["graduation", /\btot nghiep\b/],
      ["exam", /\b(?:lich thi|danh sach thi)\b/],
      ["registration", /\bdang ky (?:mon|hoc phan|tin chi)\b/],
      ["rules", /\bnoi quy\b/],
      ["contact", /\b(?:email|so dien thoai)\b/],
    ]
      .filter(([, pattern]) => (pattern as RegExp).test(q))
      .map(([name]) => name);
  };
  // So sánh với lượt hỏi gần nhất của người dùng, không dùng câu trả lời của mô hình làm chủ đề gốc.
  const previous = history.findLast((turn) => turn.role === "user");
  if (!previous) return false;
  const oldTopics = topics(previous.content),
    newTopics = topics(question);
  return (
    oldTopics.length === 1 &&
    newTopics.length === 1 &&
    oldTopics[0] !== newTopics[0]
  );
}

// Chỉ giữ tham số do người dùng cung cấp; không lấy số tiền từ câu trả lời cũ.
// Khóa hoặc mã mới thay thế giá trị cũ để tránh trả lời nhầm chương trình.
export function tuitionFollowUp(question: string, history: Turn[]) {
  if (
    !followsUp(question) ||
    (!questionCohorts(question).length && !questionMajorCodes(question).length)
  )
    return null;
  // Tìm lượt hỏi học phí gần nhất để làm mốc khôi phục ngữ cảnh.
  const anchor = history.findLastIndex(
    (turn) => turn.role === "user" && tuitionQuestion(turn.content),
  );
  if (anchor < 0) return null;
  let cohorts = questionCohorts(history[anchor].content),
    codes = questionMajorCodes(history[anchor].content),
    academicYear = year(history[anchor].content);
  // Đọc các lượt hỏi tiếp theo theo thứ tự để tham số được nêu sau cùng có hiệu lực.
  for (const turn of [
    ...history.slice(anchor + 1),
    { role: "user", content: question },
  ]) {
    if (turn.role !== "user" || !followsUp(turn.content)) continue;
    const nextCohorts = questionCohorts(turn.content),
      nextCodes = questionMajorCodes(turn.content);
    if (nextCohorts.length) cohorts = nextCohorts;
    if (nextCodes.length) codes = nextCodes;
    academicYear = year(turn.content) || academicYear;
  }
  const majorName = codes.length
    ? ""
    : history[anchor].content
        .replace(/\bk\s*\d{2}\b|\bkhóa\s*\d{2}\b/gi, "")
        .replace(/20\d{2}\s*[-–/]\s*20\d{2}/g, "");
  return `Tra cứu học phí${cohorts.length ? ` khóa ${cohorts.map((c) => `K${c}`).join(" và ")}` : ""}${codes.length ? ` mã chuyên ngành ${codes.join(" và ").toUpperCase()}` : `. Ngành được hỏi: ${majorName}`}${academicYear ? ` năm học ${academicYear}` : ""}. ${/so sanh|compare/.test(normalize(question)) ? "So sánh đầy đủ các đối tượng vừa nêu." : "Cho biết đơn giá tín chỉ và mức học phí học kỳ; giữ đúng chương trình."} Câu hỏi tiếp theo: ${question}`;
}

export function vagueWithoutContext(question: string, history: Turn[]) {
  if (history.length) return false;
  return (
    /^(?:con|vay|the)(?: cai| viec| dieu)? (?:do|nay)(?: thi sao)?[\s?.!]*$/.test(
      normalize(question).trim(),
    ) ||
    /^(?:what about (?:that|it)|and (?:that|it))[\s?.!]*$/i.test(
      question.trim(),
    )
  );
}
