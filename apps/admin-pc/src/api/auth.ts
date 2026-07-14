/** 认证域 */
import { request, TOKEN_KEY, USER_KEY, clearSession } from "./client";

export interface AuthUser {
  userId: number;
  username: string;
  displayName: string;
  roleCode: string;
  dataScope: string;
  memberNo: string | null;
}

export interface LoginResult {
  token: string;
  user: AuthUser;
}

export async function login(username: string, password: string): Promise<LoginResult> {
  const data = await request<LoginResult>("/auth/login", {
    method: "POST",
    body: { username, password },
  });
  localStorage.setItem(TOKEN_KEY, data.token);
  localStorage.setItem(USER_KEY, JSON.stringify(data.user));
  return data;
}

export function me(): Promise<AuthUser> {
  return request<AuthUser>("/auth/me");
}

/** 读取本地缓存的登录用户 */
export function getStoredUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

/** 退出登录：清本地态并广播事件 */
export function logout(): void {
  clearSession();
}
