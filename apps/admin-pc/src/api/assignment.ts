/** 会员入群分配域 */
import { request, newIdempotencyKey } from "./client";

/** 待分配用户（GET /assignment/pending，snake_case） */
export interface PendingMember {
  id: number;
  member_no: string;
  name: string;
  phone: string | null;
  city: string | null;
  source_channel: string | null;
  project_id: string;
  identity: string | null;
  referrer_name: string | null;
}

export function listPending(projectId: string): Promise<PendingMember[]> {
  return request<PendingMember[]>("/assignment/pending", { query: { projectId } });
}

/** 推荐结果（POST /assignment/recommend，内部为 camelCase） */
export interface RecommendedGroup {
  groupId: string;
  groupName: string;
  score: number;
  hitRules: string[];
  riskHints: string[];
  personalWechatId: string | null;
  memberCount: number;
  targetCapacity: number;
}

export interface Recommendation {
  best: RecommendedGroup | null;
  alternatives: RecommendedGroup[];
  candidateCount: number;
}

export interface RecommendResult {
  assignmentId: number;
  recommendation: Recommendation;
}

export function recommend(memberNo: string, projectId: string): Promise<RecommendResult> {
  return request<RecommendResult>("/assignment/recommend", {
    method: "POST",
    body: { memberNo, projectId },
  });
}

/** 确认分配（POST /assignment/confirm） */
export interface ConfirmResult {
  assignmentId: number;
  taskId: number | null;
  status: string; // 待加好友 | 待邀请 | 待确认
  groupId: string;
  isFriend: boolean;
  personalWechatId: string | null;
}

export interface ConfirmParams {
  assignmentId: number;
  /** 选非推荐（备选/手动）群时传，必须同时传 overrideReason */
  groupId?: string;
  overrideReason?: string;
}

export function confirm(params: ConfirmParams): Promise<ConfirmResult> {
  return request<ConfirmResult>("/assignment/confirm", {
    method: "POST",
    body: params,
    idempotencyKey: newIdempotencyKey(),
  });
}

/** 分配记录（GET /assignment，snake_case） */
export interface AssignmentRow {
  id: number;
  member_id: number;
  project_id: string;
  group_id: string | null;
  personal_wechat_id: string | null;
  status: string;
  recommend_score: number | null;
  hit_rules: string[] | null;
  risk_hints: string[] | null;
  assign_way: string | null;
  override_reason: string | null;
  operator: string | null;
  approval_id: number | null;
  fail_reason: string | null;
  friend_task_id: number | null;
  invite_task_id: number | null;
  recommended_at: string | null;
  confirmed_at: string | null;
  friended_at: string | null;
  invited_at: string | null;
  joined_at: string | null;
  created_at: string;
  updated_at: string;
  member_no: string | null;
  member_name: string | null;
  group_name: string | null;
}

export interface ListAssignmentParams {
  projectId?: string;
  status?: string;
  groupId?: string;
}

export function listAssignments(params: ListAssignmentParams = {}): Promise<AssignmentRow[]> {
  return request<AssignmentRow[]>("/assignment", {
    query: { projectId: params.projectId, status: params.status, groupId: params.groupId },
  });
}

export function confirmJoin(id: number): Promise<AssignmentRow> {
  return request<AssignmentRow>(`/assignment/${id}/confirm-join`, {
    method: "POST",
    idempotencyKey: newIdempotencyKey(),
  });
}
