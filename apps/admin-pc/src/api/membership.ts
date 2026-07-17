/** 权益域（M3）：会员套餐 / 会员费订单（一方交易）/ 权益查询 / 到期作业 */
import { request } from "./client";

export interface MembershipPlan {
  id: number;
  plan_code: string;
  name: string;
  grant_identity: string;
  duration_days: number;
  price_cents: number;
  ios_price_cents: number | null;
  project_scope: string | null;
  status: string;
  created_at: string;
}

export interface MembershipOrder {
  id: number;
  order_no: string;
  member_no: string;
  member_name: string;
  plan_code: string;
  plan_name: string;
  grant_identity: string;
  duration_days: number;
  channel: string;
  amount_cents: number;
  status: string;
  paid_at: string | null;
  created_at: string;
  project_id: string | null;
}

export function listPlans(onSaleOnly = false): Promise<MembershipPlan[]> {
  return request<MembershipPlan[]>("/membership/plans", { query: { onSaleOnly } });
}

export function createPlan(body: {
  planCode: string; name: string; grantIdentity: string;
  durationDays: number; priceCents: number; iosPriceCents?: number; projectScope?: string;
}): Promise<MembershipPlan> {
  return request<MembershipPlan>("/membership/plans", { method: "POST", body });
}

export function setPlanStatus(id: number, status: "上架" | "下架"): Promise<MembershipPlan> {
  return request<MembershipPlan>(`/membership/plans/${id}/status`, { method: "PATCH", body: { status } });
}

export function listOrders(params: { memberNo?: string; status?: string } = {}): Promise<MembershipOrder[]> {
  return request<MembershipOrder[]>("/membership/orders", { query: params });
}

export function createOrder(body: {
  memberNo: string; planCode: string; channel: string; projectId?: string;
}, idempotencyKey?: string): Promise<MembershipOrder> {
  return request<MembershipOrder>("/membership/orders", { method: "POST", body, idempotencyKey });
}

/** Mock 支付：模拟虚拟支付成功回调（M3c 换真实回调，接口不变） */
export function mockPay(orderNo: string): Promise<MembershipOrder> {
  return request<MembershipOrder>(`/membership/orders/${orderNo}/mock-pay`, { method: "POST" });
}

export function changeOrderStatus(orderNo: string, status: string, reason?: string): Promise<MembershipOrder> {
  return request<MembershipOrder>(`/membership/orders/${orderNo}/status`, {
    method: "PATCH", body: { status, reason },
  });
}

export interface EntitlementSummary {
  memberId: number;
  projectId: string;
  identity: Record<string, unknown>;
  hasPaidEntitlement: boolean;
  gateEnabled: boolean;
}

export function getEntitlement(memberNo: string, projectId: string): Promise<EntitlementSummary> {
  return request<EntitlementSummary>(`/membership/entitlements/${memberNo}`, { query: { projectId } });
}

export function runExpiry(): Promise<{ expired: number }> {
  return request<{ expired: number }>("/membership/run-expiry", { method: "POST" });
}
