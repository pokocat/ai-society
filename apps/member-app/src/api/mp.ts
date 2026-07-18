import Taro from "@tarojs/taro";
import { BASE, ensureLogin, getToken, logout } from "../utils/auth";

/** /mp/* API 封装：统一信封 {code,message,data}；4030 清登录态重登一次。 */
async function request<T>(path: string, opts: { method?: "GET" | "POST"; data?: unknown; headers?: Record<string, string> } = {}, retried = false): Promise<T> {
  await ensureLogin();
  const resp = await Taro.request<{ code: number; message: string; data: T }>({
    url: `${BASE}${path}`,
    method: opts.method ?? "GET",
    data: opts.data,
    header: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
      ...(opts.headers ?? {}),
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
  city: string | null;
  identity: { identity?: string; status?: string; valid_from?: string; valid_until?: string };
  hasPaidEntitlement: boolean;
  growthTotal: number;
  pointsTotal: number;
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
  serviceTeacher?: null | { name: string; service_region: string | null; role: string };
}

export interface ProfileCard {
  member_no: string;
  name: string | null;
  phone: string | null;
  city: string | null;
  source_channel: string | null;
  created_at: string;
  wechatId: string | null;
  referrer: null | { member_no: string; name: string };
}

export interface EarningsData {
  summary: { total_est: number; withdrawable: number; pending: number; frozen: number; synced_at?: string };
  paidOut: number;
  withdrawals: Array<{ id: number; amount: number; method: string; status: string; created_at: string; decided_at: string | null }>;
}

export interface MemberTask {
  id: number;
  title: string;
  task_type: string;
  priority: string;
  points: number;
  deadline: string | null;
  done: boolean;
  completed_at: string | null;
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
export const getProfile = () => request<ProfileCard>("/mp/profile");
export const getEarnings = () => request<EarningsData>("/mp/earnings");
/** 提现申请：idemKey 由页面在打开表单时生成一次，同一次填单重复提交只受理一次 */
export const applyWithdrawal = (amount: number, method: string, accountInfo: string | undefined, idemKey: string) =>
  request<{ withdrawalId: number; approvalId: number; status: string; message: string }>(
    "/mp/withdrawals", {
      method: "POST",
      data: { amount, method, accountInfo },
      headers: { "Idempotency-Key": idemKey },
    });
export const getTasks = () => request<MemberTask[]>("/mp/tasks");
export const completeTask = (id: number) =>
  request<{ taskId: number; pointsAwarded: number; pointsBalance: number }>(
    `/mp/tasks/${id}/complete`, { method: "POST" });
