// Mục đích file: Cung cấp các hàm kiểm tra phiên, origin, dữ liệu đầu vào, giới hạn tần suất và xử lý lỗi API.
import { z } from "zod";
import { getAuth } from "./auth";
import { appOrigins } from "./config";
import { db, id } from "./db";
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function session(headers: Headers, adminOnly = false) {
  // Tra phiên từ cookie; từ chối tài khoản bị khóa và yêu cầu quyền admin khi cần.
  const value = await getAuth().api.getSession({ headers });
  if (!value) throw new HttpError(401, "Vui lòng đăng nhập để tiếp tục.");
  if (value.user.banned)
    throw new HttpError(403, "Tài khoản đang bị tạm khóa.");
  if (adminOnly && value.user.role !== "admin")
    throw new HttpError(403, "Bạn không có quyền quản trị.");
  return value;
}
export function sameOrigin(request: Request) {
  // Các thao tác thay đổi dữ liệu phải xuất phát từ origin ứng dụng được cấu hình.
  const origin = request.headers.get("origin");
  if (!origin || !appOrigins.includes(origin))
    throw new HttpError(403, "Yêu cầu không hợp lệ (origin).");
  const site = request.headers.get("sec-fetch-site");
  if (site && !["same-origin", "none"].includes(site))
    throw new HttpError(403, "Yêu cầu không hợp lệ.");
}
export async function jsonBody<T extends z.ZodType>(
  request: Request,
  schema: T,
): Promise<z.infer<T>> {
  // Chỉ nhận JSON và giới hạn phần thân trước khi phân tích và kiểm tra schema.
  if (!request.headers.get("content-type")?.includes("application/json"))
    throw new HttpError(415, "Cần gửi dữ liệu JSON.");
  const text = await readLimited(request, 64 * 1024);
  try {
    return schema.parse(JSON.parse(new TextDecoder().decode(text)));
  } catch {
    throw new HttpError(
      400,
      "Thông tin chưa hợp lệ. Vui lòng kiểm tra các trường nhập.",
    );
  }
}
export async function readLimited(request: Request, max: number) {
  // Kiểm tra cả Content-Length lẫn dữ liệu thực tế vì header có thể thiếu hoặc không đúng.
  if (Number(request.headers.get("content-length") || 0) > max)
    throw new HttpError(413, "Dữ liệu vượt giới hạn cho phép.");
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array();
  const parts: Uint8Array[] = [];
  let length = 0;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    length += value.length;
    if (length > max) {
      await reader.cancel();
      throw new HttpError(413, "Dữ liệu vượt giới hạn cho phép.");
    }
    parts.push(value);
  }
  // Ghép các phần đã đọc thành một mảng byte sau khi xác nhận không vượt giới hạn.
  const output = new Uint8Array(length);
  let at = 0;
  for (const part of parts) {
    output.set(part, at);
    at += part.length;
  }
  return output;
}
export async function rateLimit(key: string, max: number, seconds: number) {
  // Tăng bộ đếm trong khoảng thời gian hiện tại hoặc bắt đầu khoảng mới khi hết hạn.
  const time = Date.now();
  const result = (await db()
    .prepare(
      `INSERT INTO rate_limits VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET
    count=CASE WHEN rate_limits.expires_at<=? THEN 1 ELSE rate_limits.count+1 END,
    expires_at=CASE WHEN rate_limits.expires_at<=? THEN excluded.expires_at ELSE rate_limits.expires_at END RETURNING count`,
    )
    .get(key, time + seconds * 1000, time, time)) as {
    count: number;
  };
  if (result.count > max)
    throw new HttpError(429, "Bạn thao tác quá nhanh. Vui lòng thử lại sau.");
}
export function endpoint(
  fn: (request: Request) => Promise<Response | unknown>,
) {
  // Bọc API bằng định dạng lỗi thống nhất; không trả lỗi nội bộ hoặc nội dung bí mật cho client.
  return async (request: Request) => {
    try {
      const result = await fn(request);
      const response =
        result instanceof Response ? result : Response.json(result);
      response.headers.set("Cache-Control", "private, no-store");
      return response;
    } catch (error) {
      const ref = id();
      if (!(error instanceof HttpError))
        console.error(
          JSON.stringify({
            event: "request_failed",
            ref,
            type: error instanceof Error ? error.name : "unknown",
            code:
              error &&
              typeof error === "object" &&
              "code" in error &&
              /^[0-9A-Z]{5}$/.test(String(error.code))
                ? error.code
                : undefined,
          }),
        );
      return Response.json(
        {
          error:
            error instanceof HttpError
              ? error.message
              : "Hệ thống chưa thể xử lý. Vui lòng thử lại.",
          ref,
        },
        {
          status: error instanceof HttpError ? error.status : 500,
          headers: { "Cache-Control": "no-store" },
        },
      );
    }
  };
}
