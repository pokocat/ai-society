/** 微信群域 */
import { request } from "./client";

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
