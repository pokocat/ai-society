/** 审批域 */
import { request } from "./client";

export interface ApprovalRow {
  id: number;
  approval_type: string;
  title: string;
  submitter: string;
  project_id: string | null;
  urgent: boolean;
  status: string;
  detail: Record<string, string>;
  callback_type: string | null;
  callback_ref: string | null;
  decided_by: string | null;
  decision_comment: string | null;
  created_at: string;
  decided_at: string | null;
}

export interface ApprovalHistoryItem {
  id: number;
  approval_id: number;
  actor: string;
  action: string;
  comment: string | null;
  created_at: string;
}

export interface ApprovalDetail extends ApprovalRow {
  history: ApprovalHistoryItem[];
}

export interface ListApprovalsParams {
  type?: string;
  status?: string;
}

export function listApprovals(params: ListApprovalsParams = {}): Promise<ApprovalRow[]> {
  return request<ApprovalRow[]>("/approvals", {
    query: { type: params.type, status: params.status },
  });
}

export function getApproval(id: number): Promise<ApprovalDetail> {
  return request<ApprovalDetail>(`/approvals/${id}`);
}

export interface DecisionResult {
  id: number;
  status: string;
}

export function decideApproval(
  id: number,
  approve: boolean,
  comment?: string,
): Promise<DecisionResult> {
  return request<DecisionResult>(`/approvals/${id}/decision`, {
    method: "POST",
    body: { approve, comment: comment ?? "" },
  });
}
