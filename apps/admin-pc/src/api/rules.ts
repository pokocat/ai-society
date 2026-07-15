/** 资源规则域（运营可在线调整的业务阈值） */
import { request } from "./client";

export interface ResourceRulesRow {
  id: number;
  target_group_size: number;
  max_groups_per_wechat: number;
  warn_friends: number;
  hard_friends: number;
  capacity_warn_ratio: number;
  require_enterprise_cs: boolean;
  require_personal_cs: boolean;
  block_overload: boolean;
  growth_points_per_invite: number;
  w_capacity: number;
  w_wechat_load: number;
  w_continuity: number;
  w_strategy: number;
  fill_rate_depress: number;
  updated_at: string;
}

export function getRules(): Promise<ResourceRulesRow> {
  return request<ResourceRulesRow>("/rules");
}

export interface UpdateRulesParams {
  targetGroupSize: number;
  maxGroupsPerWechat: number;
  warnFriends: number;
  hardFriends: number;
  requireEnterpriseCs: boolean;
  requirePersonalCs: boolean;
  blockOverload: boolean;
  growthPointsPerInvite: number;
}

export function updateRules(params: UpdateRulesParams): Promise<ResourceRulesRow> {
  return request<ResourceRulesRow>("/rules", { method: "PUT", body: params });
}
