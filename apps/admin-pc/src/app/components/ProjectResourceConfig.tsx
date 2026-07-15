import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle, Boxes, Building2, Check, CheckCircle2, CircleGauge,
  Database, Link2, Loader2, MessageCircle, Save, Search, Settings2,
  ShieldCheck, Smartphone, UserCog, Users2,
} from "lucide-react";
import { useProject } from "../contexts/ProjectContext";
import { useResources } from "../contexts/ResourceContext";
import { employeesApi, groupsApi, projectsApi, ApiError } from "../../api";
import type { EmployeeRow } from "../../api/employees";
import type { StaffingPreview } from "../../api/groups";
import type { ResourceVersionRow, ValidateResult } from "../../api/projects";

const C = {
  bg: "#0d1629", panel: "#131f35", panel2: "#1a2640",
  border: "rgba(255,255,255,0.075)", border2: "rgba(255,255,255,0.045)",
  text: "#e2e8f0", text2: "#94a3b8", muted: "#64748b",
  primary: "#4361ee", purple: "#7c3aed", green: "#34d399",
  amber: "#fbbf24", red: "#f87171", cyan: "#22d3ee",
};

type ConfigTab = "accounts" | "groups" | "staffing" | "rules";

const typeMeta: Record<string, { color: string; icon: typeof MessageCircle }> = {
  个人微信: { color: C.green, icon: MessageCircle },
  企业微信: { color: C.cyan, icon: Building2 },
  手机号: { color: C.amber, icon: Smartphone },
  媒体账号: { color: C.purple, icon: Database },
};
const DEFAULT_TYPE_META = { color: C.muted, icon: Database };

function NumberRule({ label, description, value, onChange, suffix }: { label: string; description: string; value: number; onChange: (value: number) => void; suffix: string }) {
  return (
    <label className="p-4 rounded-md" style={{ background: C.panel, border: `1px solid ${C.border}` }}>
      <span className="block font-medium" style={{ color: C.text, fontSize: 11 }}>{label}</span>
      <span className="block mt-1" style={{ color: C.muted, fontSize: 9 }}>{description}</span>
      <span className="mt-3 flex items-center gap-2">
        <input type="number" min={1} value={value} onChange={event => onChange(Math.max(1, Number(event.target.value)))} className="w-28 px-3 py-2 rounded-md outline-none" style={{ color: C.text, background: C.panel2, border: `1px solid ${C.border}`, fontSize: 12 }} />
        <span style={{ color: C.text2, fontSize: 10 }}>{suffix}</span>
      </span>
    </label>
  );
}

interface StaffingDraft {
  wecomEmployeeId?: string;
  personalWechatId?: string;
}

export default function ProjectResourceConfig() {
  const { currentProject } = useProject();
  const { accounts, groups, rules, setRules, toggleAccountProject, updateGroup, reloadResources } = useResources();
  const [activeTab, setActiveTab] = useState<ConfigTab>("accounts");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("全部类型");
  const [message, setMessage] = useState<{ text: string; kind: "success" | "error" } | null>(null);

  // Tab3 服务编组
  const [wecomStaff, setWecomStaff] = useState<EmployeeRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, StaffingDraft>>({});
  const [previews, setPreviews] = useState<Record<string, StaffingPreview | "loading" | null>>({});
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [savingGroup, setSavingGroup] = useState<string | null>(null);

  // Tab4 服务端校验
  const [versions, setVersions] = useState<ResourceVersionRow[]>([]);
  const [validateResult, setValidateResult] = useState<ValidateResult | null>(null);
  const [validating, setValidating] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const assignedAccounts = accounts.filter(account => account.projectIds.includes(currentProject.id));
  const assignedGroups = groups.filter(group => group.projectId === currentProject.id);
  const personalAccounts = accounts.filter(account => account.type === "个人微信");
  const enterpriseAccounts = accounts.filter(account => account.type === "企业微信");

  const filteredAccounts = accounts.filter(account =>
    (typeFilter === "全部类型" || account.type === typeFilter) &&
    (account.name.includes(search) || account.account.toLowerCase().includes(search.toLowerCase()) || account.owner.includes(search))
  );
  const filteredGroups = groups.filter(group =>
    group.name.includes(search) || group.id.toLowerCase().includes(search.toLowerCase()) || group.type.includes(search)
  );

  const issues = useMemo(() => {
    const result: string[] = [];
    assignedGroups.forEach(group => {
      if (!group.builder) result.push(`${group.name} 未指定建群企业微信`);
      if (rules.requireEnterpriseService && !group.enterpriseService) result.push(`${group.name} 未配置企业微信客服`);
      if (rules.requirePersonalService && !group.personalWechat) result.push(`${group.name} 未配置个人微信客服`);
      if (group.memberCount > group.targetCapacity) result.push(`${group.name} 已超过目标容量`);
    });
    personalAccounts.forEach(account => {
      if (!account.projectIds.includes(currentProject.id)) return;
      if (account.groups > rules.maxGroups) result.push(`${account.name} 服务群数超过上限`);
      if (account.friends >= rules.hardFriends) result.push(`${account.name} 好友数已达到硬上限`);
    });
    return result;
  }, [assignedGroups, currentProject.id, personalAccounts, rules]);

  const configuredGroups = assignedGroups.filter(group => group.builder && group.enterpriseService && group.personalWechat).length;
  const completion = Math.round(((assignedAccounts.length ? 1 : 0) + (assignedGroups.length ? 1 : 0) + (assignedGroups.length ? configuredGroups / assignedGroups.length : 0) + (issues.length === 0 ? 1 : 0)) / 4 * 100);

  const flash = useCallback((text: string, kind: "success" | "error" = "success") => {
    setMessage({ text, kind });
    window.setTimeout(() => setMessage(null), 2600);
  }, []);

  const errMsg = (err: unknown, fallback: string) => (err instanceof ApiError ? err.message : fallback);

  // 企微客服员工（Tab3 下拉）
  useEffect(() => {
    employeesApi.listEmployees({ jobRole: "企微客服" })
      .then(setWecomStaff)
      .catch(err => { console.error("[ProjectResourceConfig] 加载企微客服失败：", err); flash(errMsg(err, "加载企微客服失败"), "error"); });
  }, [flash]);

  // 版本列表（Tab4）
  const loadVersions = useCallback(() => {
    if (!currentProject.id) return;
    projectsApi.listResourceVersions(currentProject.id)
      .then(setVersions)
      .catch(err => console.error("[ProjectResourceConfig] 加载版本列表失败：", err));
  }, [currentProject.id]);

  useEffect(() => {
    loadVersions();
    setValidateResult(null);
    setDrafts({});
    setPreviews({});
    setRowErrors({});
  }, [loadVersions]);

  /** 行的生效值：草稿优先，其次已保存编组 */
  const effectiveDraft = (groupId: string, saved: { wecom: string; personal: string }): { wecom: string; personal: string; changed: boolean } => {
    const draft = drafts[groupId] ?? {};
    const wecom = draft.wecomEmployeeId ?? saved.wecom;
    const personal = draft.personalWechatId ?? saved.personal;
    return { wecom, personal, changed: wecom !== saved.wecom || personal !== saved.personal };
  };

  const setDraft = (groupId: string, patch: StaffingDraft) => {
    setDrafts(current => ({ ...current, [groupId]: { ...current[groupId], ...patch } }));
    setRowErrors(current => ({ ...current, [groupId]: "" }));
  };

  /** 负载预测：选择个微后调后端 preview */
  const loadPreview = useCallback((groupId: string, personalWechatId: string) => {
    const key = `${groupId}:${personalWechatId}`;
    setPreviews(current => ({ ...current, [key]: "loading" }));
    groupsApi.staffingPreview(groupId, personalWechatId)
      .then(preview => setPreviews(current => ({ ...current, [key]: preview })))
      .catch(err => {
        console.error("[ProjectResourceConfig] 负载预测失败：", err);
        setPreviews(current => ({ ...current, [key]: null }));
        setRowErrors(current => ({ ...current, [groupId]: errMsg(err, "负载预测失败") }));
      });
  }, []);

  /** 保存编组：POST /groups/{id}/staffing（超载后端 4090 → 行内红字） */
  const saveStaffing = async (groupId: string, wecomEmployeeId: string, personalWechatId: string, builderAccountId: string) => {
    const employee = wecomStaff.find(e => String(e.id) === wecomEmployeeId);
    const wecomAccountId = employee?.using_accounts.find(id => id.startsWith("WX-E")) ?? builderAccountId;
    if (!employee || !wecomAccountId || !personalWechatId) {
      setRowErrors(current => ({ ...current, [groupId]: "请先选择企微客服与个微客服" }));
      return;
    }
    setSavingGroup(groupId);
    try {
      await groupsApi.saveStaffing(groupId, {
        wecomEmployeeId: employee.id,
        wecomAccountId,
        personalWechatId,
      });
      setDrafts(current => { const next = { ...current }; delete next[groupId]; return next; });
      setRowErrors(current => ({ ...current, [groupId]: "" }));
      await reloadResources();
      flash("服务编组已保存");
    } catch (err) {
      const msg = errMsg(err, "保存编组失败");
      setRowErrors(current => ({ ...current, [groupId]: msg }));
      console.error("[ProjectResourceConfig] 保存编组失败：", msg);
    } finally {
      setSavingGroup(null);
    }
  };

  /** Tab4：新建草稿并校验 */
  const runValidate = async () => {
    if (!currentProject.id) return;
    setValidating(true);
    setValidateResult(null);
    try {
      const draft = await projectsApi.createResourceVersion(currentProject.id);
      const result = await projectsApi.validateResourceVersion(currentProject.id, draft.id);
      setValidateResult(result);
      loadVersions();
      flash(result.issues.length ? `校验完成：${result.issues.length} 项问题` : "校验通过，可发布方案", result.issues.length ? "error" : "success");
    } catch (err) {
      flash(errMsg(err, "创建/校验资源方案失败"), "error");
    } finally {
      setValidating(false);
    }
  };

  /** Tab4：发布已通过校验的版本（先审批后生效） */
  const runPublish = async () => {
    if (!currentProject.id || !validateResult || validateResult.issues.length > 0) return;
    setPublishing(true);
    try {
      const result = await projectsApi.publishResourceVersion(currentProject.id, validateResult.versionId);
      const approvalId = result.approvalId ?? result.approval_id;
      flash(approvalId ? `已提交审批（审批单 #${approvalId}），审批通过后生效` : "发布请求已提交审批");
      setValidateResult(null);
      loadVersions();
    } catch (err) {
      flash(errMsg(err, "发布资源方案失败"), "error");
    } finally {
      setPublishing(false);
    }
  };

  const tabs: { id: ConfigTab; label: string; note: string; icon: typeof Database }[] = [
    { id: "accounts", label: "账号归属", note: "选择项目可用账号", icon: Database },
    { id: "groups", label: "群库归属", note: "选择项目可用群", icon: Boxes },
    { id: "staffing", label: "服务编组", note: "配置企微与个微客服", icon: UserCog },
    { id: "rules", label: "规则校验", note: "容量、负载与准入", icon: Settings2 },
  ];

  return (
    <div className="p-5 h-full overflow-auto min-w-[1080px]" style={{ background: C.bg }}>
      {message && <div className="fixed top-16 right-5 z-50 flex items-center gap-2 px-3 py-2 rounded-md shadow-xl" style={{ background: message.kind === "success" ? "#0f2f2b" : "#331a1d", border: `1px solid ${message.kind === "success" ? "rgba(52,211,153,0.35)" : "rgba(248,113,113,0.4)"}`, color: message.kind === "success" ? C.green : C.red, fontSize: 11 }}>{message.kind === "success" ? <Check size={13} /> : <AlertTriangle size={13} />}{message.text}</div>}

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2"><h1 className="font-semibold" style={{ color: C.text, fontSize: 18 }}>项目资源配置</h1><span className="px-2 py-0.5 rounded-md" style={{ color: currentProject.accent, background: `${currentProject.accent}16`, fontSize: 9 }}>{currentProject.shortName}</span></div>
          <p className="mt-1" style={{ color: C.muted, fontSize: 11 }}>从统一账号库和企微群库中选择资源，再配置服务人员、容量和负载规则</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="px-3 py-2 rounded-md" style={{ background: C.panel, border: `1px solid ${C.border}` }}><span style={{ color: C.muted, fontSize: 9 }}>配置完成度</span><span className="ml-2 font-semibold" style={{ color: completion >= 90 ? C.green : C.amber, fontSize: 12 }}>{completion}%</span></div>
          <button disabled title="改动实时生效；整体方案经第 4 步「规则校验」发布（M2 接线）" className="px-3 py-2 rounded-md flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed" style={{ color: "white", background: C.primary, fontSize: 10 }}><Save size={12} />保存配置</button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 mt-4">
        {tabs.map((tab, index) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          const done = index === 0 ? assignedAccounts.length > 0 : index === 1 ? assignedGroups.length > 0 : index === 2 ? configuredGroups === assignedGroups.length && assignedGroups.length > 0 : issues.length === 0;
          return <button key={tab.id} onClick={() => { setActiveTab(tab.id); setSearch(""); }} className="p-3 rounded-md flex items-center gap-3 text-left" style={{ background: active ? "rgba(67,97,238,0.13)" : C.panel, border: `1px solid ${active ? C.primary : C.border}` }}><span className="w-8 h-8 rounded-md flex items-center justify-center" style={{ color: active ? "white" : C.text2, background: active ? C.primary : C.panel2 }}><Icon size={14} /></span><span className="min-w-0 flex-1"><span className="block font-medium" style={{ color: active ? C.text : C.text2, fontSize: 10 }}>{index + 1}. {tab.label}</span><span className="block mt-0.5 truncate" style={{ color: C.muted, fontSize: 8 }}>{tab.note}</span></span>{done ? <CheckCircle2 size={14} style={{ color: C.green }} /> : <CircleGauge size={14} style={{ color: C.amber }} />}</button>;
        })}
      </div>

      <div className="grid grid-cols-4 gap-2 mt-3">
        {[
          ["已选账号", assignedAccounts.length, `账号库共 ${accounts.length} 个`, Database, C.cyan],
          ["已选群组", assignedGroups.length, `企微群库共 ${groups.length} 个`, Boxes, C.purple],
          ["完成编组", configuredGroups, `待编组 ${Math.max(0, assignedGroups.length - configuredGroups)} 个`, Users2, C.green],
          ["配置问题", issues.length, issues.length ? "保存前需要处理" : "当前校验通过", ShieldCheck, issues.length ? C.amber : C.green],
        ].map(([label, value, note, Icon, color]) => {
          const MetricIcon = Icon as typeof Database;
          return <div key={label as string} className="px-3 py-2.5 rounded-md flex items-center gap-2" style={{ background: C.panel, border: `1px solid ${C.border}` }}><MetricIcon size={14} style={{ color: color as string }} /><span><span className="font-semibold" style={{ color: C.text, fontSize: 12 }}>{value as number}</span><span className="ml-1.5" style={{ color: C.text2, fontSize: 9 }}>{label as string}</span><span className="block mt-0.5" style={{ color: C.muted, fontSize: 8 }}>{note as string}</span></span></div>;
        })}
      </div>

      {activeTab === "accounts" && (
        <section className="mt-3 rounded-md overflow-hidden" style={{ background: C.panel, border: `1px solid ${C.border}` }}>
          <div className="px-3 py-3 flex items-center gap-2" style={{ borderBottom: `1px solid ${C.border}` }}><div className="mr-auto"><h2 className="font-semibold" style={{ color: C.text, fontSize: 12 }}>统一账号库</h2><p className="mt-0.5" style={{ color: C.muted, fontSize: 9 }}>选择当前项目可使用的账号，并指定实际服务人员</p></div><select value={typeFilter} onChange={event => setTypeFilter(event.target.value)} className="px-3 py-2 rounded-md outline-none" style={{ color: C.text2, background: C.panel2, border: `1px solid ${C.border}`, fontSize: 9 }}><option>全部类型</option><option>个人微信</option><option>企业微信</option><option>手机号</option><option>媒体账号</option></select><div className="w-64 flex items-center gap-2 px-3 py-2 rounded-md" style={{ background: C.panel2, border: `1px solid ${C.border}` }}><Search size={12} style={{ color: C.muted }} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="搜索账号、名称或人员" className="flex-1 bg-transparent outline-none" style={{ color: C.text2, fontSize: 9 }} /></div></div>
          <div className="grid grid-cols-[90px_1fr_1.2fr_90px_90px_120px_120px_96px] gap-2 px-3 py-2.5" style={{ color: C.muted, background: C.panel2, fontSize: 9 }}>{["类型", "账号名称", "账号", "状态", "服务大区", "实际使用人", "当前负载", "项目归属"].map(label => <span key={label}>{label}</span>)}</div>
          {filteredAccounts.map(account => {
            const meta = typeMeta[account.type] ?? DEFAULT_TYPE_META;
            const Icon = meta.icon;
            const assigned = account.projectIds.includes(currentProject.id);
            const load = account.type === "个人微信" ? Math.max(account.groups / rules.maxGroups, account.friends / rules.hardFriends) : 0;
            return <div key={account.id} className="grid grid-cols-[90px_1fr_1.2fr_90px_90px_120px_120px_96px] gap-2 px-3 py-2.5 items-center" style={{ borderTop: `1px solid ${C.border2}`, background: assigned ? "rgba(67,97,238,0.035)" : "transparent" }}><span className="flex items-center gap-1.5" style={{ color: meta.color, fontSize: 9 }}><Icon size={11} />{account.type}</span><span><span className="block font-medium" style={{ color: C.text, fontSize: 10 }}>{account.name}</span><span className="block mt-0.5" style={{ color: C.muted, fontSize: 8 }}>{account.id}</span></span><span className="truncate" style={{ color: C.text2, fontSize: 9 }}>{account.account}</span><span style={{ color: account.status === "异常" ? C.red : account.status === "库存" ? C.muted : C.green, fontSize: 9 }}>{account.status}</span><span style={{ color: C.text2, fontSize: 9 }}>{account.region}</span><select value={account.owner} disabled title="M2 接线：实际使用人变更暂无后端端点" className="px-2 py-1.5 rounded-md outline-none disabled:opacity-50 disabled:cursor-not-allowed" style={{ color: C.text2, background: C.bg, border: `1px solid ${C.border}`, fontSize: 9 }}><option>{account.owner}</option></select><span>{account.type === "个人微信" ? <><span className="block" style={{ color: load >= .9 ? C.red : load >= .8 ? C.amber : C.text2, fontSize: 9 }}>{account.groups}/{rules.maxGroups} 群 · {account.friends}/{rules.hardFriends}</span><span className="block h-1 mt-1 rounded-full overflow-hidden" style={{ background: C.bg }}><span className="block h-full" style={{ width: `${Math.min(100, load * 100)}%`, background: load >= .9 ? C.red : load >= .8 ? C.amber : C.green }} /></span></> : <span style={{ color: C.muted, fontSize: 9 }}>资产可用</span>}</span><button onClick={() => { toggleAccountProject(account.id, currentProject.id).then(() => flash(assigned ? `${account.name} 已移出项目` : `${account.name} 已授权给 ${currentProject.shortName}`)).catch(err => flash(errMsg(err, "项目授权变更失败"), "error")); }} disabled={account.status === "异常" && !assigned} className="px-2 py-1.5 rounded-md disabled:opacity-40" style={{ color: assigned ? C.red : C.primary, background: assigned ? "rgba(248,113,113,0.1)" : "rgba(67,97,238,0.12)", fontSize: 9 }}>{assigned ? "移出项目" : "分配项目"}</button></div>;
          })}
        </section>
      )}

      {activeTab === "groups" && (
        <section className="mt-3 rounded-md overflow-hidden" style={{ background: C.panel, border: `1px solid ${C.border}` }}>
          <div className="px-3 py-3 flex items-center gap-2" style={{ borderBottom: `1px solid ${C.border}` }}><div className="mr-auto"><h2 className="font-semibold" style={{ color: C.text, fontSize: 12 }}>企业微信群库</h2><p className="mt-0.5" style={{ color: C.muted, fontSize: 9 }}>群先由企业微信建立，再配置项目归属和目标容量</p></div><div className="w-64 flex items-center gap-2 px-3 py-2 rounded-md" style={{ background: C.panel2, border: `1px solid ${C.border}` }}><Search size={12} style={{ color: C.muted }} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="搜索群名、编号或类型" className="flex-1 bg-transparent outline-none" style={{ color: C.text2, fontSize: 9 }} /></div></div>
          <div className="grid grid-cols-[82px_1.4fr_110px_90px_150px_110px_110px_96px] gap-2 px-3 py-2.5" style={{ color: C.muted, background: C.panel2, fontSize: 9 }}>{["群编号", "微信群", "群类型", "城市", "建群企业微信", "人数 / 目标", "状态", "项目归属"].map(label => <span key={label}>{label}</span>)}</div>
          {filteredGroups.map(group => {
            const assigned = group.projectId === currentProject.id;
            const percent = Math.round(group.memberCount / group.targetCapacity * 100);
            return <div key={group.id} className="grid grid-cols-[82px_1.4fr_110px_90px_150px_110px_110px_96px] gap-2 px-3 py-2.5 items-center" style={{ borderTop: `1px solid ${C.border2}`, background: assigned ? "rgba(67,97,238,0.035)" : "transparent" }}><span style={{ color: C.muted, fontSize: 9 }}>{group.id}</span><span className="font-medium" style={{ color: C.text, fontSize: 10 }}>{group.name}</span><span style={{ color: C.text2, fontSize: 9 }}>{group.type}</span><span style={{ color: C.text2, fontSize: 9 }}>{group.city}</span><select value={group.builder} onChange={event => { updateGroup(group.id, { builder: event.target.value }).catch(err => flash(errMsg(err, "更新建群企微失败"), "error")); }} className="px-2 py-1.5 rounded-md outline-none" style={{ color: C.text2, background: C.bg, border: `1px solid ${C.border}`, fontSize: 9 }}>{!group.builder && <option value="">待指定</option>}{enterpriseAccounts.map(account => <option key={account.id} value={account.id}>{account.name}</option>)}</select><span><span className="flex items-center gap-1"><span style={{ color: percent >= 90 ? C.red : C.text2, fontSize: 9 }}>{group.memberCount} /</span><input type="number" min={group.memberCount} value={group.targetCapacity} onChange={event => { updateGroup(group.id, { targetCapacity: Math.max(group.memberCount, Number(event.target.value)) }).catch(err => flash(errMsg(err, "更新目标容量失败"), "error")); }} className="w-14 px-1.5 py-1 rounded outline-none" style={{ color: C.text, background: C.bg, border: `1px solid ${C.border}`, fontSize: 9 }} /></span><span className="block h-1 mt-1 rounded-full overflow-hidden" style={{ background: C.bg }}><span className="block h-full" style={{ width: `${Math.min(100, percent)}%`, background: percent >= 90 ? C.red : C.primary }} /></span></span><span style={{ color: group.status === "容量预警" ? C.red : group.status === "待配置" || group.status === "待建群" ? C.amber : C.green, fontSize: 9 }}>{group.status}</span><button onClick={() => { updateGroup(group.id, { projectId: assigned ? null : currentProject.id }).then(() => flash(assigned ? `${group.name} 已移出项目` : `${group.name} 已归属 ${currentProject.shortName}`)).catch(err => flash(errMsg(err, "项目归属变更失败"), "error")); }} className="px-2 py-1.5 rounded-md" style={{ color: assigned ? C.red : C.primary, background: assigned ? "rgba(248,113,113,0.1)" : "rgba(67,97,238,0.12)", fontSize: 9 }}>{assigned ? "移出项目" : "分配项目"}</button></div>;
          })}
        </section>
      )}

      {activeTab === "staffing" && (
        <section className="mt-3 rounded-md overflow-hidden" style={{ background: C.panel, border: `1px solid ${C.border}` }}>
          <div className="px-3 py-3 flex items-center justify-between" style={{ borderBottom: `1px solid ${C.border}` }}><div><h2 className="font-semibold" style={{ color: C.text, fontSize: 12 }}>群客服服务编组</h2><p className="mt-0.5" style={{ color: C.muted, fontSize: 9 }}>每个企微群配置企业微信客服和个人微信客服，并预测个微承接后的群数与好友负载</p></div><span className="px-2 py-1 rounded" style={{ color: C.amber, background: "rgba(251,191,36,0.12)", fontSize: 9 }}>默认 {rules.targetGroupSize} 人/群 · {rules.maxGroups} 群/个微 · {rules.hardFriends} 好友/个微</span></div>
          <div className="grid grid-cols-[1.35fr_115px_135px_170px_190px_110px] gap-2 px-3 py-2.5" style={{ color: C.muted, background: C.panel2, fontSize: 9 }}>{["项目群", "群容量", "企业微信客服", "个人微信客服", "分配后负载预测", "编组操作"].map(label => <span key={label}>{label}</span>)}</div>
          {assignedGroups.map(group => {
            const saved = { wecom: group.enterpriseService, personal: group.personalWechat };
            const eff = effectiveDraft(group.id, saved);
            const previewKey = `${group.id}:${eff.personal}`;
            const preview = eff.personal && eff.changed ? previews[previewKey] : undefined;
            const previewLoaded = preview && preview !== "loading" ? preview : null;
            const overload = previewLoaded?.overload ?? false;
            const warning = previewLoaded?.warning ?? false;
            const rowError = rowErrors[group.id];
            const saving = savingGroup === group.id;
            const canSave = !!eff.wecom && !!eff.personal && eff.changed && !saving;
            return <div key={group.id} className="grid grid-cols-[1.35fr_115px_135px_170px_190px_110px] gap-2 px-3 py-3 items-center" style={{ borderTop: `1px solid ${C.border2}` }}>
              <span><span className="block font-medium" style={{ color: C.text, fontSize: 10 }}>{group.name}</span><span className="block mt-0.5" style={{ color: C.muted, fontSize: 8 }}>{group.builder || "未指定建群企微"} · {group.city} · {group.type}</span></span>
              <span><span style={{ color: group.memberCount / group.targetCapacity >= .9 ? C.red : C.text2, fontSize: 9 }}>{group.memberCount}/{group.targetCapacity}</span><span className="block mt-1 h-1 rounded-full overflow-hidden" style={{ background: C.bg }}><span className="block h-full" style={{ width: `${Math.min(100, group.memberCount / group.targetCapacity * 100)}%`, background: group.memberCount / group.targetCapacity >= .9 ? C.red : C.primary }} /></span></span>
              <select value={eff.wecom} onChange={event => setDraft(group.id, { wecomEmployeeId: event.target.value })} className="px-2 py-2 rounded-md outline-none" style={{ color: eff.wecom ? C.text2 : C.amber, background: C.bg, border: `1px solid ${C.border}`, fontSize: 9 }}><option value="">待配置</option>{wecomStaff.map(person => <option key={person.id} value={String(person.id)}>{person.name} · {person.service_region ?? "—"}</option>)}</select>
              <select value={eff.personal} onChange={event => { const v = event.target.value; setDraft(group.id, { personalWechatId: v }); if (v && v !== saved.personal) loadPreview(group.id, v); }} className="px-2 py-2 rounded-md outline-none" style={{ color: eff.personal ? C.text2 : C.amber, background: C.bg, border: `1px solid ${C.border}`, fontSize: 9 }}><option value="">待配置</option>{personalAccounts.filter(account => account.status === "使用中" && account.projectIds.includes(currentProject.id)).map(account => <option key={account.id} value={account.id}>{account.name} · {account.groups}/{rules.maxGroups}群</option>)}</select>
              <span className="px-2.5 py-2 rounded-md" style={{ background: C.bg, border: `1px solid ${rowError || overload ? "rgba(248,113,113,0.4)" : warning ? "rgba(251,191,36,0.35)" : C.border}` }}>
                {rowError ? <span className="flex items-start gap-1" style={{ color: C.red, fontSize: 9 }}><AlertTriangle size={10} className="mt-0.5 flex-shrink-0" />{rowError}</span>
                  : preview === "loading" ? <span className="flex items-center gap-1.5" style={{ color: C.muted, fontSize: 9 }}><Loader2 size={10} className="animate-spin" />计算负载中…</span>
                  : previewLoaded ? <><span className="block" style={{ color: overload ? C.red : warning ? C.amber : C.green, fontSize: 9 }}>{previewLoaded.projectedGroups}/{previewLoaded.maxGroups} 群 · {previewLoaded.projectedFriends}/{previewLoaded.hardFriends} 好友</span><span className="block mt-1" style={{ color: C.muted, fontSize: 8 }}>预计新增 {previewLoaded.estimatedNewFriends} 位去重好友{overload ? " · 超出负载上限" : warning ? " · 接近负载上限" : ""}</span></>
                  : eff.personal && !eff.changed ? <span style={{ color: C.green, fontSize: 9 }}>当前编组已生效</span>
                  : <span style={{ color: C.muted, fontSize: 9 }}>选择个微后计算</span>}
              </span>
              <span className="flex flex-col gap-1">
                <button disabled={!canSave} onClick={() => saveStaffing(group.id, eff.wecom, eff.personal, group.builder)} className="px-2 py-1.5 rounded-md disabled:opacity-40 flex items-center justify-center gap-1" style={{ color: "white", background: C.primary, fontSize: 9 }}>{saving ? <Loader2 size={10} className="animate-spin" /> : <Save size={10} />}{saving ? "保存中" : "保存编组"}</button>
                <button disabled title="由入群分配流程自动派发" className="px-2 py-1.5 rounded-md disabled:opacity-40 disabled:cursor-not-allowed" style={{ color: C.primary, background: "rgba(67,97,238,0.12)", fontSize: 9 }}>生成任务</button>
              </span>
            </div>;
          })}
          {assignedGroups.length === 0 && <div className="py-16 text-center" style={{ color: C.muted, fontSize: 11 }}>请先在“群库归属”中为当前项目选择微信群</div>}
        </section>
      )}

      {activeTab === "rules" && (
        <div className="mt-3 grid grid-cols-[1fr_360px] gap-3">
          <div>
            <div className="grid grid-cols-2 gap-3">
              <NumberRule label="单群目标容量" description="企业微信群默认服务人数，特殊群可单独调整" value={rules.targetGroupSize} onChange={value => setRules({ ...rules, targetGroupSize: value })} suffix="人 / 群" />
              <NumberRule label="个微服务群上限" description="单个个人微信允许同时服务的群数量" value={rules.maxGroups} onChange={value => setRules({ ...rules, maxGroups: value })} suffix="个群" />
              <NumberRule label="个微好友预警线" description="达到该值后减少系统推荐权重" value={rules.warnFriends} onChange={value => setRules({ ...rules, warnFriends: value })} suffix="位好友" />
              <NumberRule label="个微好友硬上限" description="达到该值后禁止继续分配新群" value={rules.hardFriends} onChange={value => setRules({ ...rules, hardFriends: value })} suffix="位好友" />
            </div>
            <section className="mt-3 rounded-md overflow-hidden" style={{ background: C.panel, border: `1px solid ${C.border}` }}>
              <div className="px-4 py-3" style={{ borderBottom: `1px solid ${C.border}` }}><h2 className="font-semibold" style={{ color: C.text, fontSize: 11 }}>准入与阻断规则</h2></div>
              {[
                ["requireEnterpriseService", "必须配置企业微信客服", "群进入服务中状态前必须指定企微客服"],
                ["requirePersonalService", "必须配置个人微信客服", "个微客服负责添加群成员并承接服务"],
                ["blockOverload", "超负载自动阻断", "预计群数或好友数超过上限时禁止分配"],
              ].map(([key, label, note]) => <label key={key} className="px-4 py-3 flex items-center gap-3" style={{ borderTop: `1px solid ${C.border2}` }}><input type="checkbox" checked={Boolean(rules[key as keyof typeof rules])} onChange={event => setRules({ ...rules, [key]: event.target.checked })} className="w-4 h-4 accent-[#4361ee]" /><span className="flex-1"><span className="block" style={{ color: C.text2, fontSize: 10 }}>{label}</span><span className="block mt-0.5" style={{ color: C.muted, fontSize: 8 }}>{note}</span></span></label>)}
            </section>
          </div>
          <aside className="rounded-md overflow-hidden self-start" style={{ background: C.panel, border: `1px solid ${C.border}` }}>
            <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: `1px solid ${C.border}` }}><span className="font-semibold" style={{ color: C.text, fontSize: 11 }}>资源方案校验与发布</span><span style={{ color: validateResult ? (validateResult.issues.length ? C.amber : C.green) : C.muted, fontSize: 9 }}>{validateResult ? (validateResult.issues.length ? `${validateResult.issues.length} 项待处理` : "校验通过") : `${versions.length} 个版本`}</span></div>

            {/* 校验结果 */}
            {validateResult ? (
              validateResult.issues.length ? validateResult.issues.map((issue, index) => (
                <div key={`${issue.object_id}-${index}`} className="px-4 py-3 flex items-start gap-2" style={{ borderTop: `1px solid ${C.border2}` }}>
                  <AlertTriangle size={12} className="mt-0.5 flex-shrink-0" style={{ color: C.amber }} />
                  <span style={{ fontSize: 9 }}>
                    <span className="block font-medium" style={{ color: C.text2 }}>{issue.name}<span className="ml-1" style={{ color: C.muted }}>({issue.object_id})</span></span>
                    <span className="block mt-0.5" style={{ color: C.amber }}>{issue.issue}</span>
                  </span>
                </div>
              )) : (
                <div className="p-6 text-center"><CheckCircle2 size={28} className="mx-auto" style={{ color: C.green }} /><div className="mt-2" style={{ color: C.text, fontSize: 11 }}>校验通过（版本 #{validateResult.versionId}）</div><div className="mt-1" style={{ color: C.muted, fontSize: 9 }}>账号、群组、人员和负载规则均符合要求，可发布方案</div></div>
              )
            ) : (
              <div className="px-4 py-3" style={{ color: C.muted, fontSize: 9 }}>
                {versions.length ? (
                  <span className="flex flex-col gap-1.5">
                    {versions.slice(0, 5).map(v => (
                      <span key={v.id} className="flex items-center justify-between">
                        <span style={{ color: C.text2 }}>V{v.version_no} <span style={{ color: C.muted }}>#{v.id}</span></span>
                        <span className="px-1.5 py-0.5 rounded" style={{ fontSize: 8, color: v.status === "published" ? C.green : v.status === "validated" ? C.cyan : C.amber, background: C.panel2 }}>{v.status}{v.approval_id ? ` · 审批#${v.approval_id}` : ""}</span>
                      </span>
                    ))}
                  </span>
                ) : "尚无资源方案版本。点击下方按钮，把当前资源配置生成草稿并做服务端校验（draft → validated → published）。"}
              </div>
            )}

            {/* 动作区 */}
            <div className="p-3 flex flex-col gap-2" style={{ borderTop: `1px solid ${C.border2}` }}>
              <button onClick={runValidate} disabled={validating || publishing} className="px-3 py-2 rounded-md flex items-center justify-center gap-1.5 disabled:opacity-50" style={{ width: "100%", color: "white", background: C.panel2, border: `1px solid ${C.border}`, fontSize: 9 }}>{validating ? <Loader2 size={11} className="animate-spin" /> : <Link2 size={11} />}{validating ? "校验中…" : "新建草稿并校验"}</button>
              {validateResult && validateResult.issues.length === 0 && (
                <button onClick={runPublish} disabled={publishing} className="px-3 py-2 rounded-md flex items-center justify-center gap-1.5 disabled:opacity-50" style={{ width: "100%", color: "white", background: C.green, fontSize: 9 }}>{publishing ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}{publishing ? "提交中…" : "发布方案（提交审批）"}</button>
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
