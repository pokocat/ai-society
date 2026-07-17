import Taro from "@tarojs/taro";
import { BASE, ensureLogin, getToken, logout } from "../utils/auth";

/** /mp/* API 封装：统一信封 {code,message,data}；4030 清登录态重登一次。 */
async function request<T>(path: string, opts: { method?: "GET" | "POST"; data?: unknown } = {}, retried = false): Promise<T> {
  await ensureLogin();
  const resp = await Taro.request<{ code: number; message: string; data: T }>({
    url: `${BASE}${path}`,
    method: opts.method ?? "GET",
    data: opts.data,
    header: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    },
  });
  if (resp.data.code === 4030 && !retried) {
    logout();
    return request<T>(path, opts, true);
  }
  if (resp.data.code !== 0) {
    throw new Error(resp.data.message || "请求失败");
  }
  return resp.data.data;
}

export interface Plan {
  id: number;
  plan_code: string;
  name: string;
  grant_identity: string;
  duration_days: number;
  price_cents: number;
}

export interface MeData {
  member_no: string;
  name: string;
  identity: { identity?: string; status?: string; valid_until?: string };
  hasPaidEntitlement: boolean;
  growthTotal: number;
  orders: Array<{ order_no: string; status: string; amount_cents: number; plan_name: string; paid_at: string | null }>;
}

export interface InviteData {
  inviteCode: string;
  validUntil: string;
  sharePath: string;
  qrcodeMock: boolean;
  influence: number;
  inviteGrowth: number;
  downline: Array<{ level: number; member_no: string; name: string; city: string | null; direct_downline: number; bound_at: string }>;
}

export interface GroupData {
  hasPaidEntitlement: boolean;
  hint?: string;
  assignment: null | {
    status: string; group_id: string; group_name: string;
    member_count: number; target_capacity: number; joined_at: string | null;
  };
  groupQrcodeUrl?: string | null;
}

export interface Course {
  id: number; title: string; speaker: string | null; scheduled_at: string;
  status: string; replay_url: string | null;
}

export interface FaqItem { question: string; answer: string; }

export const getMe = () => request<MeData>("/mp/me");
export const getInvite = () => request<InviteData>("/mp/invite");
export const getPlans = () => request<Plan[]>("/mp/plans");
export const createOrder = (planCode: string) =>
  request<{ order_no: string }>("/mp/orders", { method: "POST", data: { planCode, channel: "android" } });
export const payOrder = (orderNo: string) =>
  request<{ status: string }>(`/mp/orders/${orderNo}/pay`, { method: "POST" });
export const getMyGroup = () => request<GroupData>("/mp/my-group");
export const getCourses = () => request<Course[]>("/mp/courses");
export const getFaq = () => request<FaqItem[]>("/mp/faq");
