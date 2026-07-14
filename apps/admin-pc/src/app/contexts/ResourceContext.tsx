import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";

export type AccountType = "个人微信" | "企业微信" | "手机号" | "媒体账号";

export interface AccountResource {
  id: string;
  type: AccountType;
  name: string;
  account: string;
  status: "可用" | "使用中" | "异常" | "库存";
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
  enterpriseService: string;
  personalWechat: string;
  status: "待配置" | "服务中" | "容量预警";
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

const initialAccounts: AccountResource[] = [
  { id: "WX-P-001", type: "个人微信", name: "蜂乐·吴思远", account: "fengle_bj_01", status: "使用中", owner: "吴思远", region: "华北区", projectIds: ["flm-membership"], groups: 12, friends: 1320 },
  { id: "WX-P-002", type: "个人微信", name: "蜂乐·林小燕", account: "fengle_sh_01", status: "使用中", owner: "林小燕", region: "华东区", projectIds: ["flm-membership", "experience-camp"], groups: 16, friends: 1684 },
  { id: "WX-P-003", type: "个人微信", name: "蜂乐·刘刚", account: "fengle_gz_01", status: "异常", owner: "刘刚", region: "华南区", projectIds: ["city-partner"], groups: 9, friends: 976 },
  { id: "WX-P-004", type: "个人微信", name: "蜂乐·陈明", account: "fengle_hz_01", status: "使用中", owner: "陈明", region: "华东区", projectIds: ["experience-camp"], groups: 7, friends: 642 },
  { id: "WX-P-005", type: "个人微信", name: "备用客服号", account: "fengle_bj_02", status: "库存", owner: "待分配", region: "华北区", projectIds: [], groups: 0, friends: 0 },
  { id: "WX-E-001", type: "企业微信", name: "蜂乐玛企微-北京", account: "ww_fenglema_bj", status: "使用中", owner: "吴思远", region: "华北区", projectIds: ["flm-membership"], groups: 18, friends: 0 },
  { id: "WX-E-002", type: "企业微信", name: "蜂乐玛企微-上海", account: "ww_fenglema_sh", status: "使用中", owner: "林小燕", region: "华东区", projectIds: ["flm-membership", "experience-camp"], groups: 12, friends: 0 },
  { id: "WX-E-003", type: "企业微信", name: "蜂乐玛企微-华南", account: "ww_fenglema_gz", status: "可用", owner: "刘刚", region: "华南区", projectIds: ["city-partner"], groups: 7, friends: 0 },
  { id: "TEL-001", type: "手机号", name: "北京客服设备号", account: "138-0012-3456", status: "使用中", owner: "吴思远", region: "华北区", projectIds: ["flm-membership"], groups: 0, friends: 0 },
  { id: "MEDIA-001", type: "媒体账号", name: "蜂乐玛小红书官方号", account: "FLM_OFFICIAL", status: "可用", owner: "内容组", region: "全国", projectIds: ["brand-live"], groups: 0, friends: 0 },
];

const initialGroups: GroupResource[] = [
  { id: "G-0001", name: "北京PRO会员群01", type: "PRO会员群", city: "北京", builder: "WX-E-001", projectId: "flm-membership", memberCount: 86, targetCapacity: 100, enterpriseService: "S-001", personalWechat: "WX-P-001", status: "服务中" },
  { id: "G-0002", name: "北京PRO会员群02", type: "PRO会员群", city: "北京", builder: "WX-E-001", projectId: "flm-membership", memberCount: 98, targetCapacity: 100, enterpriseService: "S-001", personalWechat: "", status: "容量预警" },
  { id: "G-0003", name: "上海体验官群01", type: "体验官群", city: "上海", builder: "WX-E-002", projectId: "experience-camp", memberCount: 74, targetCapacity: 100, enterpriseService: "S-002", personalWechat: "WX-P-002", status: "服务中" },
  { id: "G-0004", name: "上海PRO会员群01", type: "PRO会员群", city: "上海", builder: "WX-E-002", projectId: "flm-membership", memberCount: 91, targetCapacity: 100, enterpriseService: "S-002", personalWechat: "WX-P-002", status: "服务中" },
  { id: "G-0005", name: "广州游客承接群01", type: "游客群", city: "广州", builder: "WX-E-003", projectId: "city-partner", memberCount: 66, targetCapacity: 100, enterpriseService: "S-003", personalWechat: "WX-P-003", status: "服务中" },
  { id: "G-0006", name: "北京体验官备用群", type: "体验官群", city: "北京", builder: "WX-E-001", projectId: null, memberCount: 0, targetCapacity: 100, enterpriseService: "", personalWechat: "", status: "待配置" },
  { id: "G-0007", name: "杭州体验官群02", type: "体验官群", city: "杭州", builder: "WX-E-002", projectId: "experience-camp", memberCount: 52, targetCapacity: 100, enterpriseService: "S-004", personalWechat: "WX-P-004", status: "服务中" },
  { id: "G-0008", name: "全国直播游客群", type: "游客群", city: "全国", builder: "WX-E-003", projectId: null, memberCount: 35, targetCapacity: 100, enterpriseService: "", personalWechat: "", status: "待配置" },
];

const initialRules: ResourceRules = {
  targetGroupSize: 100,
  maxGroups: 20,
  warnFriends: 1800,
  hardFriends: 2000,
  requireEnterpriseService: true,
  requirePersonalService: true,
  blockOverload: true,
};

interface PersistedResourceState {
  accounts: AccountResource[];
  groups: GroupResource[];
  rules: ResourceRules;
  taskGroups: string[];
}

interface ResourceContextValue extends PersistedResourceState {
  setRules: (rules: ResourceRules) => void;
  updateAccount: (accountId: string, patch: Partial<AccountResource>) => void;
  updateGroup: (groupId: string, patch: Partial<GroupResource>) => void;
  toggleAccountProject: (accountId: string, projectId: string) => void;
  createFriendTask: (groupId: string) => void;
  assignMemberToGroup: (groupId: string) => void;
  resetResources: () => void;
}

const STORAGE_KEY = "flm-resource-state-v1";
const ResourceContext = createContext<ResourceContextValue | null>(null);

const loadState = (): PersistedResourceState => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved) as PersistedResourceState;
  } catch {
    // Fall through to the built-in library when local data is invalid.
  }
  return { accounts: initialAccounts, groups: initialGroups, rules: initialRules, taskGroups: [] };
};

export function ResourceProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PersistedResourceState>(loadState);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const updateAccount = (accountId: string, patch: Partial<AccountResource>) => {
    setState(current => ({ ...current, accounts: current.accounts.map(account => account.id === accountId ? { ...account, ...patch } : account) }));
  };

  const updateGroup = (groupId: string, patch: Partial<GroupResource>) => {
    setState(current => ({ ...current, groups: current.groups.map(group => group.id === groupId ? { ...group, ...patch } : group) }));
  };

  const toggleAccountProject = (accountId: string, projectId: string) => {
    setState(current => ({
      ...current,
      accounts: current.accounts.map(account => account.id === accountId
        ? { ...account, projectIds: account.projectIds.includes(projectId) ? account.projectIds.filter(id => id !== projectId) : [...account.projectIds, projectId] }
        : account),
    }));
  };

  const createFriendTask = (groupId: string) => {
    setState(current => ({ ...current, taskGroups: current.taskGroups.includes(groupId) ? current.taskGroups : [...current.taskGroups, groupId] }));
  };

  const assignMemberToGroup = (groupId: string) => {
    setState(current => ({
      ...current,
      groups: current.groups.map(group => group.id === groupId
        ? { ...group, memberCount: Math.min(group.targetCapacity, group.memberCount + 1), status: group.memberCount + 1 >= group.targetCapacity * .9 ? "容量预警" : "服务中" }
        : group),
    }));
  };

  const resetResources = () => setState({ accounts: initialAccounts, groups: initialGroups, rules: initialRules, taskGroups: [] });

  const value = useMemo<ResourceContextValue>(() => ({
    ...state,
    setRules: rules => setState(current => ({ ...current, rules })),
    updateAccount,
    updateGroup,
    toggleAccountProject,
    createFriendTask,
    assignMemberToGroup,
    resetResources,
  }), [state]);

  return <ResourceContext.Provider value={value}>{children}</ResourceContext.Provider>;
}

export function useResources() {
  const context = useContext(ResourceContext);
  if (!context) throw new Error("useResources must be used within ResourceProvider");
  return context;
}
