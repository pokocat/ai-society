/** 账号资产域 */
import { request } from "./client";

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
