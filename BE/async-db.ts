// Mục đích file: Thống nhất truy cập SQLite local và PostgreSQL cloud, giữ tham số SQL tách khỏi câu lệnh.
import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import { Pool, types, type PoolClient } from "pg";
import { attachDatabasePool } from "@vercel/functions";
import { db as localDb } from "./sqlite";

export const cloudDatabase = () => !!process.env.DATABASE_URL;
const context = new AsyncLocalStorage<{ client?: PoolClient; sqlite?: true }>();
const runtime = globalThis as unknown as { academicPool?: Pool };
types.setTypeParser(20, (value) => {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) throw new Error("Unsafe database integer");
  return parsed;
});
export function pool() {
  if (!runtime.academicPool) {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
    const url = new URL(process.env.DATABASE_URL);
    url.searchParams.set("sslmode", "verify-full");
    runtime.academicPool = new Pool({
      connectionString: url.href,
      max: 4,
      connectionTimeoutMillis: 15000,
      idleTimeoutMillis: 10000,
    });
    if (process.env.VERCEL) attachDatabasePool(runtime.academicPool);
  }
  return runtime.academicPool;
}
export function authDatabase() {
  if (process.env.VERCEL && !cloudDatabase())
    throw new Error("Vercel requires a durable database");
  return cloudDatabase() ? pool() : localDb();
}

// Only the application's static SQL is translated. Values stay parameterized.
export function postgresSql(sql: string) {
  if (sql.includes("chunks_fts MATCH ?"))
    sql =
      "SELECT id FROM chunks_fts,websearch_to_tsquery('simple', ?) q WHERE search_vector @@ q ORDER BY ts_rank_cd(search_vector,q) DESC LIMIT 100";
  const quoted = new Set([
    "user",
    "session",
    "account",
    "verification",
    "emailVerified",
    "createdAt",
    "updatedAt",
    "studentCode",
    "banReason",
    "banExpires",
    "userId",
    "expiresAt",
    "ipAddress",
    "userAgent",
    "accountId",
    "providerId",
    "accessToken",
    "refreshToken",
    "idToken",
    "accessTokenExpiresAt",
    "refreshTokenExpiresAt",
    "impersonatedBy",
    "lastRequest",
  ]);
  let index = 0;
  return sql.replace(
    /'(?:''|[^'])*'|"(?:""|[^"])*"|\b[A-Za-z_]\w*\b|\?/g,
    (token) => {
      if (token === "?") return `$${++index}`;
      if (token === "rowid") return "_ordinal";
      return quoted.has(token) ? `"${token}"` : token;
    },
  );
}

let localTail: Promise<unknown> = Promise.resolve();
async function localExclusive<T>(fn: () => Promise<T>): Promise<T> {
  // Trong giao dịch SQLite hiện tại có thể chạy tiếp; yêu cầu ngoài giao dịch phải xếp hàng.
  if (context.getStore()?.sqlite) return fn();
  const previous = localTail;
  let release!: () => void;
  localTail = new Promise<void>((resolve) => {
    release = resolve;
  });
  await previous;
  try {
    return await fn();
  } finally {
    // Giải phóng lượt tiếp theo dù thao tác thành công hay phát sinh lỗi.
    release();
  }
}
async function execute(
  sql: string,
  params: unknown[],
  mode: "all" | "get" | "run",
) {
  // PostgreSQL dùng client của giao dịch nếu có; tham số tiếp tục được truyền riêng khỏi SQL.
  if (cloudDatabase()) {
    const result = await (context.getStore()?.client || pool()).query(
      postgresSql(sql),
      params,
    );
    if (mode === "run") return { changes: result.rowCount || 0 };
    return mode === "get" ? result.rows[0] : result.rows;
  }
  // Trên Vercel không cho phép âm thầm chuyển sang SQLite tạm thời.
  if (process.env.VERCEL) throw new Error("Vercel requires a durable database");
  return localExclusive(async () =>
    localDb()
      .prepare(sql)
      [mode](...params),
  );
}
const database = {
  prepare(sql: string) {
    return {
      all: (...params: unknown[]) =>
        execute(sql, params, "all") as Promise<unknown[]>,
      get: (...params: unknown[]) =>
        execute(sql, params, "get") as Promise<unknown>,
      run: (...params: unknown[]) =>
        execute(sql, params, "run") as Promise<{ changes: number }>,
    };
  },
  transaction<T>(fn: () => Promise<T>) {
    return async () => {
      if (context.getStore()) return fn();
      if (cloudDatabase()) {
        // Giữ cùng một kết nối trong giao dịch cloud và hoàn tác toàn bộ khi gặp lỗi.
        const client = await pool().connect();
        try {
          await client.query("BEGIN");
          // Khóa giao dịch để các phiên ghi từ nhiều instance không xung đột.
          await client.query("SELECT pg_advisory_xact_lock(824024)");
          const result = await context.run({ client }, fn);
          await client.query("COMMIT");
          return result;
        } catch (error) {
          await client.query("ROLLBACK");
          throw error;
        } finally {
          client.release();
        }
      }
      return localExclusive(async () => {
        // Với local, khóa lượt ghi trước khi bắt đầu giao dịch SQLite.
        localDb().exec("BEGIN IMMEDIATE");
        try {
          const result = await context.run({ sqlite: true }, fn);
          localDb().exec("COMMIT");
          return result;
        } catch (error) {
          localDb().exec("ROLLBACK");
          throw error;
        }
      });
    };
  },
  async close() {
    if (runtime.academicPool) {
      await runtime.academicPool.end();
      runtime.academicPool = undefined;
    } else localDb().close();
  },
};
export const db = () => database;
export async function rows<T>(
  sql: string,
  ...params: (string | number | null)[]
) {
  return (await database.prepare(sql).all(...params)) as T[];
}
export async function row<T>(
  sql: string,
  ...params: (string | number | null)[]
) {
  return (await database.prepare(sql).get(...params)) as T | undefined;
}
export const now = () => new Date().toISOString();
export const id = () => randomUUID();
export async function audit(
  actor: string | null,
  action: string,
  entity: string | null,
  detail: object = {},
) {
  await database
    .prepare("INSERT INTO audit VALUES (?,?,?,?,?,?)")
    .run(id(), actor, action, entity, JSON.stringify(detail), now());
}
