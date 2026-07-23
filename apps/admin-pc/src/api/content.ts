/** 运营内容域（M3）：欢迎语（全自动）/ 群发（半自动，群主确认）/ 讲课（企微群直播） */
import { request } from "./client";

export interface WelcomeTemplate {
  id: number;
  name: string;
  scope_group_type: string | null;
  project_id: string | null;
  project_name: string | null;
  content: Record<string, unknown>;
  wecom_material_id: string | null;
  status: string;
  created_at: string;
}

export interface BroadcastPlan {
  id: number;
  title: string;
  content: Record<string, unknown>;
  target_scope: Record<string, unknown> | null;
  status: string;
  dispatched_at: string | null;
  created_at: string;
  task_total: number;
  task_done: number;
}

export interface CourseSession {
  id: number;
  title: string;
  speaker: string | null;
  scheduled_at: string;
  live_id: string | null;
  replay_url: string | null;
  status: string;
}

export function listWelcomeTemplates(status?: string): Promise<WelcomeTemplate[]> {
  return request<WelcomeTemplate[]>("/content/welcome-templates", { query: { status } });
}

export function createWelcomeTemplate(body: {
  name: string; scopeGroupType?: string; projectId?: string; content: Record<string, unknown>;
}): Promise<WelcomeTemplate> {
  return request<WelcomeTemplate>("/content/welcome-templates", { method: "POST", body });
}

export function patchWelcomeTemplate(id: number, body: {
  status?: string; content?: Record<string, unknown>;
}): Promise<WelcomeTemplate> {
  return request<WelcomeTemplate>(`/content/welcome-templates/${id}`, { method: "PATCH", body });
}

export function syncWelcomeTemplate(id: number): Promise<WelcomeTemplate> {
  return request<WelcomeTemplate>(`/content/welcome-templates/${id}/sync`, { method: "POST" });
}

export function listBroadcasts(status?: string): Promise<BroadcastPlan[]> {
  return request<BroadcastPlan[]>("/content/broadcasts", { query: { status } });
}

export function createBroadcast(body: {
  title: string; content: Record<string, unknown>; targetScope?: Record<string, unknown>;
}): Promise<BroadcastPlan> {
  return request<BroadcastPlan>("/content/broadcasts", { method: "POST", body });
}

export interface DispatchResult {
  planId: number;
  status: string;
  taskCreated: number;
  skippedByQuota: number;
}

export function dispatchBroadcast(id: number): Promise<DispatchResult> {
  return request<DispatchResult>(`/content/broadcasts/${id}/dispatch`, { method: "POST" });
}

export function refreshBroadcast(id: number): Promise<BroadcastPlan> {
  return request<BroadcastPlan>(`/content/broadcasts/${id}/refresh`, { method: "POST" });
}

export function cancelBroadcast(id: number, reason: string): Promise<BroadcastPlan> {
  return request<BroadcastPlan>(`/content/broadcasts/${id}/cancel`, { method: "POST", body: { reason } });
}

export function listCourses(status?: string): Promise<CourseSession[]> {
  return request<CourseSession[]>("/content/courses", { query: { status } });
}

export function createCourse(body: {
  title: string; speaker?: string; scheduledAt: string; groupScope?: Record<string, unknown>;
}): Promise<CourseSession> {
  return request<CourseSession>("/content/courses", { method: "POST", body });
}

export function startLive(id: number): Promise<Record<string, unknown>> {
  return request<Record<string, unknown>>(`/content/courses/${id}/start-live`, { method: "POST" });
}

export function finishCourse(id: number): Promise<CourseSession> {
  return request<CourseSession>(`/content/courses/${id}/finish`, { method: "POST" });
}
