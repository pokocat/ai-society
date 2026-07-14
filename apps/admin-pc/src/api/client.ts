/**
 * API 请求基础封装
 * - BASE = /api/v1（vite 代理到后端 8080）
 * - 自动附带 Authorization: Bearer <scp-token>
 * - 统一响应信封 { code, message, data }；code!==0 抛 ApiError
 * - code===4030（登录态无效）自动清 token 并广播 scp:logout 事件，由 App 跳回登录门
 * - 写请求可传 idempotencyKey → Idempotency-Key 头（后端幂等保护）
 */

export const BASE = "/api/v1";
export const TOKEN_KEY = "scp-token";
export const USER_KEY = "scp-user";

export class ApiError extends Error {
  code: number;
  constructor(code: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.code = code;
  }
}

export interface ApiEnvelope<T> {
  code: number;
  message: string;
  data: T;
}

export type QueryValue = string | number | boolean | null | undefined;

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  /** 携带 Idempotency-Key 头，供写接口幂等保护 */
  idempotencyKey?: string;
  /** 查询参数；空值（null/undefined/空串）自动忽略 */
  query?: Record<string, QueryValue>;
  signal?: AbortSignal;
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

function buildQuery(query?: Record<string, QueryValue>): string {
  if (!query) return "";
  const parts = Object.entries(query)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return parts.length ? `?${parts.join("&")}` : "";
}

/** 清除本地登录态并广播事件，App 监听后跳回登录门 */
export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  window.dispatchEvent(new CustomEvent("scp:logout"));
}

export async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, idempotencyKey, query, signal } = opts;

  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;

  let response: Response;
  try {
    response = await fetch(`${BASE}${path}${buildQuery(query)}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch {
    throw new ApiError(-1, "网络请求失败，请检查网络或后端服务");
  }

  let envelope: ApiEnvelope<T>;
  try {
    envelope = (await response.json()) as ApiEnvelope<T>;
  } catch {
    throw new ApiError(response.status || -1, `服务器返回异常（HTTP ${response.status}）`);
  }

  if (envelope.code === 4030) {
    clearSession();
    throw new ApiError(4030, envelope.message || "登录态无效或已过期");
  }
  if (envelope.code !== 0) {
    throw new ApiError(envelope.code, envelope.message || "请求失败");
  }
  return envelope.data;
}

/** 生成幂等键（写接口用） */
export function newIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `idem-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
