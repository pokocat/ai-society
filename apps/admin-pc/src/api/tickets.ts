/** 工单域 */
import { request } from "./client";

export interface TicketRow {
  id: number;
  ticket_no: string;
  ticket_type: string;
  member_id: number | null;
  member_no: string | null;
  member_name: string | null;
  project_id: string | null;
  assignee_employee_id: number | null;
  assignee_name: string | null;
  city: string | null;
  status: string;
  priority: string;
  sla_total_hours: number;
  sla_remaining_hours: number;
  description: string | null;
  tags: string[] | null;
  created_at: string;
  resolved_at: string | null;
}

export interface ListTicketsParams {
  status?: string;
  type?: string;
}

export function listTickets(params: ListTicketsParams = {}): Promise<TicketRow[]> {
  return request<TicketRow[]>("/tickets", { query: { status: params.status, type: params.type } });
}
