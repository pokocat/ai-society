/** 关系链（M3 代理总览数据源）：邀请链 / 影响力矩阵 */
import { request } from "./client";

export interface ChainNode {
  member_no: string;
  name: string;
  identity?: string | null;
  [key: string]: unknown;
}

export interface ReferralChain {
  memberNo: string;
  upline: ChainNode[];
  downline: Record<string, unknown>[];
  [key: string]: unknown;
}

export interface InfluenceCell {
  level: string | number;
  identity: string;
  member_count: number;
  [key: string]: unknown;
}

export function getChain(memberNo: string): Promise<ReferralChain> {
  return request<ReferralChain>(`/referral/${memberNo}/chain`);
}

export function getInfluenceMatrix(memberNo: string): Promise<InfluenceCell[]> {
  return request<InfluenceCell[]>(`/referral/${memberNo}/influence-matrix`);
}
