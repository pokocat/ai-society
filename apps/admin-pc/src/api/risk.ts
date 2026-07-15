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
  level?: string;
  projectId?: string;
}

export function listRiskEvents(params: ListRiskEventsParams = {}): Promise<RiskEventRow[]> {
  return request<RiskEventRow[]>("/risk-events", {
    query: { status: params.status, level: params.level, projectId: params.projectId },
  });
}

export interface ConvertResult {
  riskId: number;
  taskId?: number;
  approvalId?: number;
}

/** 风险事件转任务/转审批 */
export function convertRiskEvent(id: number, target: "task" | "approval"): Promise<ConvertResult> {
  return request<ConvertResult>(`/risk-events/${id}/convert`, {
    method: "POST",
    body: { target },
  });
}

/** 标记风险事件已解决 */
export function resolveRiskEvent(id: number, resolution: string): Promise<RiskEventRow> {
  return request<RiskEventRow>(`/risk-events/${id}/resolve`, {
    method: "POST",
    body: { resolution },
  });
}
