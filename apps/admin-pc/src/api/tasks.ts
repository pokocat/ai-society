/** 任务域（加好友 / 邀请入群等派发任务） */
import { request, newIdempotencyKey } from "./client";

export interface TaskRow {
  id: number;
  batch_id: number | null;
  task_type: string;
  title: string;
  project_id: string | null;
  member_id: number | null;
  group_id: string | null;
  account_id: string | null;
  assignee_employee_id: number | null;
  assignment_id: number | null;
  priority: string;
  status: string;
  due_at: string | null;
  fail_reason: string | null;
  created_at: string;
  completed_at: string | null;
  member_no: string | null;
  member_name: string | null;
  group_name: string | null;
  assignee_name: string | null;
  account_name: string | null;
}

export interface ListTasksParams {
  taskType?: string;
  status?: string;
  projectId?: string;
}

export function listTasks(params: ListTasksParams = {}): Promise<TaskRow[]> {
  return request<TaskRow[]>("/tasks", {
    query: {
      taskType: params.taskType,
      status: params.status,
      projectId: params.projectId,
    },
  });
}

export interface TaskAttemptResult {
  taskId: number;
  status: string;
}

/** 回填任务执行结果（幂等） */
export function recordAttempt(
  taskId: number,
  result: "成功" | "失败",
  failReason?: string,
): Promise<TaskAttemptResult> {
  return request<TaskAttemptResult>(`/tasks/${taskId}/attempts`, {
    method: "POST",
    body: { result, failReason },
    idempotencyKey: newIdempotencyKey(),
  });
}
