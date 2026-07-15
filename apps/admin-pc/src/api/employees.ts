/** 员工域 */
import { request } from "./client";

export interface EmployeeRow {
  id: number;
  emp_no: string;
  name: string;
  gender: string | null;
  phone: string | null;
  department: string | null;
  job_role: string;
  service_region: string | null;
  employment_status: string;
  created_at: string;
  serving_groups: string[];
  using_accounts: string[];
}

export interface ListEmployeesParams {
  jobRole?: string;
}

export function listEmployees(params: ListEmployeesParams = {}): Promise<EmployeeRow[]> {
  return request<EmployeeRow[]>("/employees", { query: { jobRole: params.jobRole } });
}
