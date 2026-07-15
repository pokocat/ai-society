import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { accountsApi, groupsApi, rulesApi, ApiError } from "../../api";
import type { AccountRow } from "../../api/accounts";
import type { GroupRow } from "../../api/groups";
import type { ResourceRulesRow } from "../../api/rules";

export type AccountType = "个人微信" | "企业微信" | "手机号" | "媒体账号";

export interface AccountResource {
  id: string;
  type: string;
  name: string;
  account: string;
  status: string;
  owner: string;
  region: string;
  projectIds: string[];
  groups: number;
  friends: number;
}

export interface GroupResource {
  id: string;
  name: string;
  type: string;
  city: string;
  builder: string;
  projectId: string | null;
  memberCount: number;
  targetCapacity: number;
  /** 企微客服员工 id（字符串化；空串=待配置） */
  enterpriseService: string;
  /** 个微客服账号 id（空串=待配置） */
  personalWechat: string;
  status: string;
}

export interface ResourceRules {
  targetGroupSize: number;
  maxGroups: number;
  warnFriends: number;
  hardFriends: number;
  requireEnterpriseService: boolean;
  requirePersonalService: boolean;
  blockOverload: boolean;
}

const DEFAULT_RULES: ResourceRules = {
  targetGroupSize: 100,
  maxGroups: 20,
  warnFriends: 1800,
  hardFriends: 2000,
  requireEnterpriseService: true,
  requirePersonalService: true,
  blockOverload: true,
};

function toAccountResource(row: AccountRow): AccountResource {
  return {
    id: row.id,
    type: row.account_type,
    name: row.name,
    account: row.identifier ?? row.phone ?? "—",
    // UI 沿用「异常」文案标红；后端状态机的「风险”映射到它，其余保留原状态
    status: row.status === "风险" ? "异常" : row.status,
    owner: row.user_name ?? row.custodian_name ?? "待分配",
    region: row.region ?? "—",
    projectIds: row.project_ids ?? [],
    groups: row.serving_group_count,
    friends: row.friend_count,
  };
}

function toGroupResource(row: GroupRow): GroupResource {
  return {
    id: row.id,
    name: row.name,
    type: row.group_type,
    city: row.city ?? "—",
    builder: row.builder_account_id ?? "",
    projectId: row.project_id,
    memberCount: row.member_count,
    targetCapacity: row.target_capacity,
    enterpriseService: row.wecom_cs_employee_id != null ? String(row.wecom_cs_employee_id) : "",
    personalWechat: row.personal_cs_account_id ?? "",
    status: row.status,
  };
}

function toResourceRules(row: ResourceRulesRow): ResourceRules {
  return {
    targetGroupSize: row.target_group_size,
    maxGroups: row.max_groups_per_wechat,
    warnFriends: row.warn_friends,
    hardFriends: row.hard_friends,
    requireEnterpriseService: row.require_enterprise_cs,
    requirePersonalService: row.require_personal_cs,
    blockOverload: row.block_overload,
  };
}

interface ResourceContextValue {
  accounts: AccountResource[];
  groups: GroupResource[];
  rules: ResourceRules;
  taskGroups: string[];
  setRules: (rules: ResourceRules) => void;
  updateAccount: (accountId: string, patch: Partial<AccountResource>) => void;
  updateGroup: (groupId: string, patch: Partial<GroupResource>) => Promise<void>;
  toggleAccountProject: (accountId: string, projectId: string) => Promise<void>;
  createFriendTask: (groupId: string) => void;
  assignMemberToGroup: (groupId: string) => void;
  resetResources: () => void;
  /** 额外：强制从后端重拉资源（编组保存等动作后刷新） */
  reloadResources: () => Promise<void>;
}

const ResourceContext = createContext<ResourceContextValue | null>(null);

const logError = (scope: string, err: unknown) => {
  const msg = err instanceof ApiError ? `${err.code} ${err.message}` : String(err);
  console.error(`[ResourceContext] ${scope}：`, msg);
};

export function ResourceProvider({ children }: { children: ReactNode }) {
  const [accounts, setAccounts] = useState<AccountResource[]>([]);
  const [groups, setGroups] = useState<GroupResource[]>([]);
  const [rules, setRulesState] = useState<ResourceRules>(DEFAULT_RULES);
  const [taskGroups] = useState<string[]>([]);
  // 后端 rules 行里 UI 未覆盖的字段（growth_points_per_invite 等）需要在 PUT 时回传
  const growthPointsRef = useRef(288);
  const rulesTimerRef = useRef<number | null>(null);
  const groupTimersRef = useRef<Map<string, number>>(new Map());
  const groupPendingRef = useRef<Map<string, groupsApi.PatchGroupParams>>(new Map());

  const reloadResources = useCallback(async () => {
    try {
      const [accountRows, groupRows, rulesRow] = await Promise.all([
        accountsApi.listAccounts(),
        groupsApi.listGroups(),
        rulesApi.getRules(),
      ]);
      setAccounts(accountRows.map(toAccountResource));
      setGroups(groupRows.map(toGroupResource));
      setRulesState(toResourceRules(rulesRow));
      growthPointsRef.current = rulesRow.growth_points_per_invite;
    } catch (err) {
      logError("加载资源库失败", err);
    }
  }, []);

  useEffect(() => {
    reloadResources();
  }, [reloadResources]);

  /** 规则修改：本地即时生效 + 600ms 防抖 PUT 后端 */
  const setRules = useCallback((next: ResourceRules) => {
    setRulesState(next);
    if (rulesTimerRef.current) window.clearTimeout(rulesTimerRef.current);
    rulesTimerRef.current = window.setTimeout(() => {
      rulesApi
        .updateRules({
          targetGroupSize: next.targetGroupSize,
          maxGroupsPerWechat: next.maxGroups,
          warnFriends: next.warnFriends,
          hardFriends: next.hardFriends,
          requireEnterpriseCs: next.requireEnterpriseService,
          requirePersonalCs: next.requirePersonalService,
          blockOverload: next.blockOverload,
          growthPointsPerInvite: growthPointsRef.current,
        })
        .then(row => {
          setRulesState(toResourceRules(row));
          growthPointsRef.current = row.growth_points_per_invite;
        })
        .catch(err => {
          logError("保存资源规则失败", err);
          reloadResources();
        });
    }, 600);
  }, [reloadResources]);

  /** 实际使用人变更暂无后端端点（M2）：仅本地展示，不落库 */
  const updateAccount = useCallback((accountId: string, patch: Partial<AccountResource>) => {
    console.warn("[ResourceContext] updateAccount 暂无后端端点（M2 接线），仅本地生效：", accountId, patch);
    setAccounts(current => current.map(a => (a.id === accountId ? { ...a, ...patch } : a)));
  }, []);

  /**
   * 群字段修改：projectId / builder / targetCapacity 走 PATCH /groups/{id}（700ms 防抖合并）；
   * enterpriseService / personalWechat 属服务编组域，由 POST /groups/{id}/staffing 承担（组件侧直调）。
   */
  const updateGroup = useCallback(async (groupId: string, patch: Partial<GroupResource>) => {
    // 本地乐观更新，保持输入手感
    setGroups(current => current.map(g => (g.id === groupId ? { ...g, ...patch } : g)));

    const apiPatch: groupsApi.PatchGroupParams = {};
    if ("projectId" in patch) apiPatch.projectId = patch.projectId ?? "";
    if ("builder" in patch && patch.builder !== undefined) apiPatch.builderAccountId = patch.builder;
    if ("targetCapacity" in patch && patch.targetCapacity !== undefined) apiPatch.targetCapacity = patch.targetCapacity;

    const localOnly = Object.keys(patch).filter(k => ["enterpriseService", "personalWechat"].includes(k));
    if (localOnly.length) {
      console.warn("[ResourceContext] 编组字段请走 saveStaffing（POST /groups/{id}/staffing），本次仅本地生效：", groupId, localOnly);
    }
    if (Object.keys(apiPatch).length === 0) return;

    // 合并该群的待提交 PATCH，防抖后一次提交
    const pending = { ...(groupPendingRef.current.get(groupId) ?? {}), ...apiPatch };
    groupPendingRef.current.set(groupId, pending);
    const timers = groupTimersRef.current;
    const existing = timers.get(groupId);
    if (existing) window.clearTimeout(existing);

    await new Promise<void>((resolve, reject) => {
      timers.set(groupId, window.setTimeout(() => {
        const body = groupPendingRef.current.get(groupId);
        groupPendingRef.current.delete(groupId);
        timers.delete(groupId);
        if (!body) { resolve(); return; }
        groupsApi
          .patchGroup(groupId, body)
          .then(detail => {
            const wecomEmp = detail.staffing.find(s => s.role === "企微客服")?.employee_id ?? null;
            const personalAcct = detail.staffing.find(s => s.role === "个微客服")?.account_id ?? null;
            setGroups(current => current.map(g => (g.id === groupId ? {
              ...g,
              name: detail.name,
              type: detail.group_type,
              city: detail.city ?? "—",
              builder: detail.builder_account_id ?? "",
              projectId: detail.project_id,
              memberCount: detail.member_count,
              targetCapacity: detail.target_capacity,
              enterpriseService: wecomEmp != null ? String(wecomEmp) : "",
              personalWechat: personalAcct ?? "",
              status: detail.status,
            } : g)));
            resolve();
          })
          .catch(err => {
            logError(`更新群 ${groupId} 失败`, err);
            reloadResources();
            reject(err);
          });
      }, 700));
    });
  }, [reloadResources]);

  /** 项目授权开关：已授权→撤销，未授权→授权 */
  const toggleAccountProject = useCallback(async (accountId: string, projectId: string) => {
    const account = accounts.find(a => a.id === accountId);
    if (!account || !projectId) return;
    const assigned = account.projectIds.includes(projectId);
    try {
      const row = assigned
        ? await accountsApi.revokeFromProject(accountId, projectId)
        : await accountsApi.assignToProject(accountId, projectId);
      setAccounts(current => current.map(a => (a.id === accountId ? toAccountResource(row) : a)));
    } catch (err) {
      logError(`${assigned ? "撤销" : "授权"}账号 ${accountId} 项目失败`, err);
      throw err;
    }
  }, [accounts]);

  /** 加好友任务由入群分配流程自动派发（SPEC §6.5），不再手动生成 */
  const createFriendTask = useCallback((groupId: string) => {
    console.warn("[ResourceContext] createFriendTask 已废弃：加好友任务由入群分配流程自动派发。", groupId);
  }, []);

  /** 群人数由后端在入群确认事务内维护（SPEC §13.1），前端不再手改聚合 */
  const assignMemberToGroup = useCallback((groupId: string) => {
    console.warn("[ResourceContext] assignMemberToGroup 已废弃：群人数由后端事务维护。", groupId);
  }, []);

  const resetResources = useCallback(() => {
    reloadResources();
  }, [reloadResources]);

  const value = useMemo<ResourceContextValue>(() => ({
    accounts,
    groups,
    rules,
    taskGroups,
    setRules,
    updateAccount,
    updateGroup,
    toggleAccountProject,
    createFriendTask,
    assignMemberToGroup,
    resetResources,
    reloadResources,
  }), [accounts, groups, rules, taskGroups, setRules, updateAccount, updateGroup, toggleAccountProject, createFriendTask, assignMemberToGroup, resetResources, reloadResources]);

  return <ResourceContext.Provider value={value}>{children}</ResourceContext.Provider>;
}

export function useResources() {
  const context = useContext(ResourceContext);
  if (!context) throw new Error("useResources must be used within ResourceProvider");
  return context;
}
