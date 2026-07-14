/** 会员域 */
import { request } from "./client";

export interface MemberProjectIdentity {
  projectId: string;
  identity: string;
  stage: string | null;
  status: string;
}

export interface MemberRow {
  id: number;
  member_no: string;
  name: string;
  phone: string | null;
  city: string | null;
  source_channel: string | null;
  merged_into: string | null;
  created_at: string;
  updated_at: string;
  project_identities: MemberProjectIdentity[];
  lv1_parent: string | null;
  referrer_no: string | null;
  referrer_name: string | null;
}

export interface ListMembersParams {
  projectId?: string;
  identity?: string;
  keyword?: string;
}

export function listMembers(params: ListMembersParams = {}): Promise<MemberRow[]> {
  return request<MemberRow[]>("/members", {
    query: {
      projectId: params.projectId,
      identity: params.identity,
      keyword: params.keyword,
    },
  });
}

/** 会员档案（结构较宽，保留后端原样字段） */
export type MemberProfile = Record<string, unknown>;

export function getMemberProfile(memberNo: string): Promise<MemberProfile> {
  return request<MemberProfile>(`/members/${memberNo}/profile`);
}

export interface TimelineEvent {
  [key: string]: unknown;
}

export function getMemberTimeline(memberNo: string): Promise<TimelineEvent[]> {
  return request<TimelineEvent[]>(`/members/${memberNo}/timeline`);
}
