/** 项目域 */
import { request } from "./client";

/** GET /projects 行（snake_case，直连后端字段） */
export interface ProjectRow {
  id: string;
  code: string;
  name: string;
  short_name: string;
  category: string;
  owner_user_id: number | null;
  status: string;
  accent: string;
  service_region: string | null;
  expected_member_scale: number | null;
  active_resource_version_id: number | null;
  started_at: string | null;
  stopped_at: string | null;
  created_at: string;
  updated_at: string;
  api_type: string | null;
  integration_scope: string | null;
  endpoint: string | null;
  auth_status: string | null;
  last_sync_at: string | null;
  member_count: number;
  group_count: number;
  account_count: number;
}

export function listProjects(): Promise<ProjectRow[]> {
  return request<ProjectRow[]>("/projects");
}

export function syncProject(id: string): Promise<Partial<ProjectRow>> {
  return request<Partial<ProjectRow>>(`/projects/${id}/sync`, { method: "POST" });
}

/** 资源方案版本（draft → validated → published，发布后不可变） */
export interface ResourceVersionRow {
  id: number;
  project_id: string;
  version_no: number;
  status: string; // draft | validated | published
  snapshot: unknown;
  issues: ResourceVersionIssue[] | null;
  approval_id: number | null;
  created_by: number | null;
  published_at: string | null;
  created_at: string;
}

/** 校验问题项（注意后端为 snake_case：object_id） */
export interface ResourceVersionIssue {
  object_id: string;
  name: string;
  issue: string;
}

export interface ValidateResult {
  versionId: number;
  status: string;
  message: string;
  issues: ResourceVersionIssue[];
}

export function listResourceVersions(projectId: string): Promise<ResourceVersionRow[]> {
  return request<ResourceVersionRow[]>(`/projects/${projectId}/resource-versions`);
}

export function createResourceVersion(projectId: string): Promise<ResourceVersionRow> {
  return request<ResourceVersionRow>(`/projects/${projectId}/resource-versions`, {
    method: "POST",
    body: {},
  });
}

export function validateResourceVersion(projectId: string, versionId: number): Promise<ValidateResult> {
  return request<ValidateResult>(`/projects/${projectId}/resource-versions/${versionId}/validate`, {
    method: "POST",
  });
}

export interface PublishResult {
  approvalId?: number;
  approval_id?: number;
  [key: string]: unknown;
}

/** 发布方案（需先通过校验；返回审批单号，先审批后生效） */
export function publishResourceVersion(projectId: string, versionId: number): Promise<PublishResult> {
  return request<PublishResult>(`/projects/${projectId}/resource-versions/${versionId}/publish`, {
    method: "POST",
  });
}
