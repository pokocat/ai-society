/** 风险事件域 */
import { request } from "./client";

export interface RiskEventRow {
  id: number;
  risk_type: string;
  level: string;
  title: string;
  ref_type: string | null;
  ref_id: string | null;
  project_id: string | null;
  owner: string | null;
  due_at: string | null;
  status: string;
  converted_task_id: number | null;
  converted_approval_id: number | null;
  resolution: string | null;
  created_at: string;
  resolved_at: string | null;
}

export interface ListRiskEventsParams {
  status?: string;
  projectId?: string;
}

export function listRiskEvents(params: ListRiskEventsParams = {}): Promise<RiskEventRow[]> {
  return request<RiskEventRow[]>("/risk-events", {
    query: { status: params.status, projectId: params.projectId },
  });
}
