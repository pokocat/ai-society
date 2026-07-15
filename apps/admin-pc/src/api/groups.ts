/** 微信群域 */
import { request, newIdempotencyKey } from "./client";

export interface GroupRow {
  id: string;
  name: string;
  group_type: string;
  city: string | null;
  region: string | null;
  builder_account_id: string | null;
  project_id: string | null;
  target_capacity: number;
  member_count: number;
  qrcode_version: number;
  status: string;
  created_at: string;
  updated_at: string;
  builder_name: string | null;
  fill_rate: number;
  wecom_cs_employee_id: number | null;
  wecom_cs_name: string | null;
  personal_cs_account_id: string | null;
  personal_cs_name: string | null;
  active_reservations: number;
}

export interface ListGroupsParams {
  projectId?: string;
  poolOnly?: boolean;
}

export function listGroups(params: ListGroupsParams = {}): Promise<GroupRow[]> {
  return request<GroupRow[]>("/groups", {
    query: { projectId: params.projectId, poolOnly: params.poolOnly },
  });
}

/** 群编组成员（服务编组行） */
export interface GroupStaffingRow {
  id: number;
  group_id: string;
  role: string; // 企微客服 | 个微客服
  employee_id: number | null;
  account_id: string | null;
  is_primary: boolean;
  created_at: string;
  employee_name: string | null;
  account_name: string | null;
}

export interface GroupQrcodeRow {
  id: number;
  group_id: string;
  version: number;
  image_url: string | null;
  valid_until: string | null;
  created_at: string;
}

export interface GroupEventRow {
  [key: string]: unknown;
}

/** GET /groups/{id} 详情（含编组/二维码/事件） */
export interface GroupDetail {
  id: string;
  name: string;
  group_type: string;
  city: string | null;
  region: string | null;
  builder_account_id: string | null;
  project_id: string | null;
  target_capacity: number;
  member_count: number;
  qrcode_version: number;
  status: string;
  created_at: string;
  updated_at: string;
  staffing: GroupStaffingRow[];
  qrcodes: GroupQrcodeRow[];
  events: GroupEventRow[];
}

export function getGroup(id: string): Promise<GroupDetail> {
  return request<GroupDetail>(`/groups/${id}`);
}

export interface PatchGroupParams {
  projectId?: string; // 移出项目传 ""
  builderAccountId?: string;
  targetCapacity?: number;
}

export function patchGroup(id: string, params: PatchGroupParams): Promise<GroupDetail> {
  return request<GroupDetail>(`/groups/${id}`, { method: "PATCH", body: params });
}

export interface CreateGroupParams {
  id: string;
  name: string;
  groupType: string;
  city?: string;
  region?: string;
  builderAccountId?: string;
  targetCapacity?: number;
}

export function createGroup(params: CreateGroupParams): Promise<GroupDetail> {
  return request<GroupDetail>("/groups", {
    method: "POST",
    body: params,
    idempotencyKey: newIdempotencyKey(),
  });
}

/** 个微承接负载预测（camelCase 响应） */
export interface StaffingPreview {
  personalWechatId: string;
  currentGroups: number;
  projectedGroups: number;
  maxGroups: number;
  currentFriends: number;
  projectedFriends: number;
  estimatedNewFriends: number;
  hardFriends: number;
  warning: boolean;
  overload: boolean;
}

export function staffingPreview(groupId: string, personalWechatId: string): Promise<StaffingPreview> {
  return request<StaffingPreview>(`/groups/${groupId}/staffing/preview`, {
    query: { personalWechatId },
  });
}

export interface SaveStaffingParams {
  wecomEmployeeId: number;
  wecomAccountId: string;
  personalWechatId: string;
}

/** 保存服务编组（超载时后端返回 4090） */
export function saveStaffing(groupId: string, params: SaveStaffingParams): Promise<GroupDetail> {
  return request<GroupDetail>(`/groups/${groupId}/staffing`, {
    method: "POST",
    body: params,
  });
}

/** 更新群二维码（版本 +1） */
export function rotateQrcode(groupId: string): Promise<GroupDetail> {
  return request<GroupDetail>(`/groups/${groupId}/qrcode/rotate`, {
    method: "POST",
    idempotencyKey: newIdempotencyKey(),
  });
}
