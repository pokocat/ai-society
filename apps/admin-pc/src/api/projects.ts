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
