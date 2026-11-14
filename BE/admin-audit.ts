// Mục đích file: Đọc và phân trang nhật ký thao tác quản trị để theo dõi thay đổi hệ thống.
import { rows, row, audit } from "./db";
import { HttpError } from "./http";
export async function reviewAnswer(traceId: string, actorId: string) {
  // Không trả câu trả lời nếu hội thoại gốc đã được người dùng xóa.
  const result = await row<{
    answer: string;
    status: string;
    citations_json: string;
  }>(
    "SELECT m.content AS answer, m.status, m.citations_json FROM traces t JOIN conversations c ON c.id=t.conversation_id JOIN messages m ON m.trace_id=t.id AND m.role='assistant' WHERE t.id=? AND c.deleted_at IS NULL",
    traceId,
  );
  if (!result)
    throw new HttpError(404, "Không tìm thấy câu trả lời còn khả dụng.");
  // Không ghi lại nội dung hỏi đáp trong nhật ký truy cập.
  await audit(actorId, "question.answer_viewed", traceId);
  return {
    answer: result.answer,
    status: result.status,
    citations: JSON.parse(result.citations_json || "[]"),
  };
}
export async function adminAuditPage(params: URLSearchParams) {
  // Chỉ cho phép hai dạng nhật ký và kiểm tra giới hạn trang, từ khóa, trạng thái.
  const view = params.get("view");
  if (view !== "questions" && view !== "events")
    throw new HttpError(400, "Chế độ nhật ký chưa hợp lệ.");
  const page = Number(params.get("page") || 1),
    q = (params.get("q") || "").trim(),
    status = params.get("status") || "";
  if (
    !Number.isSafeInteger(page) ||
    page < 1 ||
    page > 100000 ||
    q.length > 200 ||
    (status &&
      ![
        "answered",
        "conversation",
        "insufficient",
        "clarification",
        "error",
        "processing",
      ].includes(status))
  )
    throw new HttpError(400, "Bộ lọc nhật ký chưa hợp lệ.");
  // Tên bảng và cột chọn từ giá trị cố định; dữ liệu lọc truyền qua tham số SQL.
  const table = view === "questions" ? "traces" : "audit",
    column = view === "questions" ? "question" : "action",
    clauses: string[] = [],
    values: (string | number | null)[] = [];
  // Không đưa câu hỏi của hội thoại đã xóa vào danh sách quản trị.
  if (view === "questions")
    clauses.push(
      "EXISTS (SELECT 1 FROM conversations c WHERE c.id=traces.conversation_id AND c.deleted_at IS NULL)",
    );
  if (q) {
    clauses.push(`(LOWER(${column}) LIKE ? OR LOWER(id) LIKE ?)`);
    values.push(`%${q.toLowerCase()}%`, `%${q.toLowerCase()}%`);
  }
  if (status && view === "questions") {
    clauses.push("status=?");
    values.push(status);
  }
  const where = clauses.length ? ` WHERE ${clauses.join(" AND ")}` : "";
  // Đếm trước để điều chỉnh trang khi bộ lọc làm giảm số kết quả.
  const total =
    (
      await row<{ n: number }>(
        `SELECT count(*) n FROM ${table}${where}`,
        ...values,
      )
    )?.n || 0;
  const pageSize = 20,
    current = Math.min(page, Math.max(1, Math.ceil(total / pageSize)));
  const fields =
    view === "questions"
      ? "id,question,status,model,latency_ms,reason,created_at"
      : "*,(SELECT name FROM user WHERE id=audit.actor_id) actor_name";
  const records = await rows(
    `SELECT ${fields} FROM ${table}${where} ORDER BY created_at DESC,id DESC LIMIT ? OFFSET ?`,
    ...values,
    pageSize,
    (current - 1) * pageSize,
  );
  return {
    view,
    page: current,
    pageSize,
    total,
    traces: view === "questions" ? records : [],
    events: view === "events" ? records : [],
  };
}
