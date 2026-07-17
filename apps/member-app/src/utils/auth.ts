import Taro from "@tarojs/taro";

/**
 * 登录与裂变归因工具。
 * - inviteCode 来源：分享 path 查询参数 / 小程序码 scene（≤32 可见字符，直接放邀请码）
 * - 登录：wx.login → POST /mp/login（M3b 后端为 Mock code2Session；M3c 换真实凭证，前端不变）
 */

export const BASE = "http://127.0.0.1:8080/api/v1"; // 开发期直连；上线换 HTTPS 域名并配业务域名白名单
const TOKEN_KEY = "scp-mp-token";
const MEMBER_KEY = "scp-mp-member";
const INVITE_KEY = "scp-mp-invite-code";

export function captureInviteCode(options: { query?: Record<string, unknown>; scene?: number }) {
  const q = options?.query ?? {};
  // 分享 path: /pages/index/index?inviteCode=FLM-XXXX；小程序码 scene: 直接是邀请码
  const fromQuery = (q.inviteCode as string) || undefined;
  const fromScene = typeof q.scene === "string" ? decodeURIComponent(q.scene) : undefined;
  const code = fromQuery ?? (fromScene && fromScene.startsWith("FLM-") ? fromScene : undefined);
  if (code) {
    Taro.setStorageSync(INVITE_KEY, code);
  }
}

export function getToken(): string | null {
  return Taro.getStorageSync(TOKEN_KEY) || null;
}

export function getMemberNo(): string | null {
  return Taro.getStorageSync(MEMBER_KEY) || null;
}

export interface LoginResult {
  token: string;
  memberNo: string;
  name: string;
  created: boolean;
  referral: string;
}

/** 静默登录（幂等）：已有 token 直接返回；否则 wx.login 换 code 走后端建档/并档。 */
export async function ensureLogin(): Promise<{ memberNo: string }> {
  const token = getToken();
  const memberNo = getMemberNo();
  if (token && memberNo) {
    return { memberNo };
  }
  const { code } = await Taro.login();
  const inviteCode = Taro.getStorageSync(INVITE_KEY) || undefined;
  const resp = await Taro.request<{ code: number; message: string; data: LoginResult }>({
    url: `${BASE}/mp/login`,
    method: "POST",
    data: { code, inviteCode },
    header: { "Content-Type": "application/json" },
  });
  if (resp.data.code !== 0) {
    throw new Error(resp.data.message || "登录失败");
  }
  Taro.setStorageSync(TOKEN_KEY, resp.data.data.token);
  Taro.setStorageSync(MEMBER_KEY, resp.data.data.memberNo);
  return { memberNo: resp.data.data.memberNo };
}

export function logout(): void {
  Taro.removeStorageSync(TOKEN_KEY);
  Taro.removeStorageSync(MEMBER_KEY);
}
