/** 账号资产域 */
import { request, newIdempotencyKey } from "./client";

export interface AccountRow {
  id: string;
  account_type: string;
  name: string;
  identifier: string | null;
  status: string;
  custodian_employee_id: number | null;
  user_employee_id: number | null;
  device_id: string | null;
  phone: string | null;
  real_name_verified: boolean;
  region: string | null;
  city: string | null;
  friend_count: number;
  friend_calibrated_at: string | null;
  serving_group_count: number;
  corp_name: string | null;
  dept: string | null;
  sync_status: string | null;
  last_login_at: string | null;
  risk_note: string | null;
  created_at: string;
  updated_at: string;
  custodian_name: string | null;
  user_name: string | null;
  project_ids: string[];
  staffing_group_count: number;
}

export interface ListAccountsParams {
  projectId?: string;
  accountType?: string;
  status?: string;
}

export function listAccounts(params: ListAccountsParams = {}): Promise<AccountRow[]> {
  return request<AccountRow[]>("/accounts", {
    query: {
      projectId: params.projectId,
      accountType: params.accountType,
      status: params.status,
    },
  });
}

export interface CreateAccountParams {
  id: string;
  accountType: string;
  name: string;
  identifier?: string;
  phone?: string;
  region?: string;
  city?: string;
}

export function createAccount(params: CreateAccountParams): Promise<AccountRow> {
  return request<AccountRow>("/accounts", {
    method: "POST",
    body: params,
    idempotencyKey: newIdempotencyKey(),
  });
}

/**
 * 账号状态机合法迁移表（与后端一致，后端仍强制校验，非法迁移返回 4090）
 */
export const ACCOUNT_STATUS_TRANSITIONS: Record<string, string[]> = {
  "库存": ["待激活", "已归档"],
  "待激活": ["可用", "库存"],
  "可用": ["使用中", "冻结", "已停用"],
  "使用中": ["风险", "冻结", "待交接", "已停用"],
  "风险": ["使用中", "冻结", "待交接", "已停用"],
  "冻结": ["可用", "待交接", "已停用"],
  "待交接": ["使用中", "可用", "已停用"],
  "已停用": ["已归档"],
};

/** 状态流转（非法迁移后端返回 4090） */
export function changeAccountStatus(id: string, status: string, reason: string): Promise<AccountRow> {
  return request<AccountRow>(`/accounts/${id}/status`, {
    method: "PATCH",
    body: { status, reason },
  });
}

export interface HandoverResult {
  approvalId: number;
  handoverId: number;
}

/** 发起账号交接（走审批单，账号即刻置「待交接」，拒绝则回退） */
export function createHandover(id: string, toEmployeeId: number, reason: string): Promise<HandoverResult> {
  return request<HandoverResult>(`/accounts/${id}/handovers`, {
    method: "POST",
    body: { toEmployeeId, reason },
    idempotencyKey: newIdempotencyKey(),
  });
}

/** 授权账号给项目 */
export function assignToProject(id: string, projectId: string): Promise<AccountRow> {
  return request<AccountRow>(`/accounts/${id}/assignments`, {
    method: "POST",
    body: { projectId },
  });
}

/** 撤销账号的项目授权 */
export function revokeFromProject(id: string, projectId: string): Promise<AccountRow> {
  return request<AccountRow>(`/accounts/${id}/assignments/revoke`, {
    method: "POST",
    body: { projectId },
  });
}
