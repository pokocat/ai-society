import { useMemo, useState } from "react";
import {
  AlertTriangle, Boxes, Building2, Check, CheckCircle2, CircleGauge,
  Database, Link2, MessageCircle, Plus, Save, Search, Settings2,
  ShieldCheck, Smartphone, UserCog, Users2,
} from "lucide-react";
import { useProject } from "../contexts/ProjectContext";
import { AccountType, useResources } from "../contexts/ResourceContext";

const C = {
  bg: "#0d1629", panel: "#131f35", panel2: "#1a2640",
  border: "rgba(255,255,255,0.075)", border2: "rgba(255,255,255,0.045)",
  text: "#e2e8f0", text2: "#94a3b8", muted: "#64748b",
  primary: "#4361ee", purple: "#7c3aed", green: "#34d399",
  amber: "#fbbf24", red: "#f87171", cyan: "#22d3ee",
};

type ConfigTab = "accounts" | "groups" | "staffing" | "rules";

const staff = [
  { id: "S-001", name: "吴思远", role: "企微客服", region: "华北区" },
  { id: "S-002", name: "林小燕", role: "企微客服", region: "华东区" },
  { id: "S-003", name: "刘刚", role: "企微客服", region: "华南区" },
  { id: "S-004", name: "陈明", role: "企微客服", region: "华东区" },
  { id: "S-005", name: "周小七", role: "社群运营", region: "全国" },
];

const typeMeta: Record<AccountType, { color: string; icon: typeof MessageCircle }> = {
  个人微信: { color: C.green, icon: MessageCircle },
  企业微信: { color: C.cyan, icon: Building2 },
  手机号: { color: C.amber, icon: Smartphone },
  媒体账号: { color: C.purple, icon: Database },
};

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

export default function ProjectResourceConfig() {
  const { currentProject } = useProject();
  const { accounts, groups, rules, taskGroups, setRules, updateAccount, updateGroup, toggleAccountProject, createFriendTask } = useResources();
  const [activeTab, setActiveTab] = useState<ConfigTab>("accounts");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("全部类型");
  const [message, setMessage] = useState("");

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

  const flash = (text: string) => {
    setMessage(text);
    window.setTimeout(() => setMessage(""), 2200);
  };

  const tabs: { id: ConfigTab; label: string; note: string; icon: typeof Database }[] = [
    { id: "accounts", label: "账号归属", note: "选择项目可用账号", icon: Database },
    { id: "groups", label: "群库归属", note: "选择项目可用群", icon: Boxes },
    { id: "staffing", label: "服务编组", note: "配置企微与个微客服", icon: UserCog },
    { id: "rules", label: "规则校验", note: "容量、负载与准入", icon: Settings2 },
  ];

  return (
    <div className="p-5 h-full overflow-auto min-w-[1080px]" style={{ background: C.bg }}>
      {message && <div className="fixed top-16 right-5 z-50 flex items-center gap-2 px-3 py-2 rounded-md shadow-xl" style={{ background: "#0f2f2b", border: "1px solid rgba(52,211,153,0.35)", color: C.green, fontSize: 11 }}><Check size={13} />{message}</div>}

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2"><h1 className="font-semibold" style={{ color: C.text, fontSize: 18 }}>项目资源配置</h1><span className="px-2 py-0.5 rounded-md" style={{ color: currentProject.accent, background: `${currentProject.accent}16`, fontSize: 9 }}>{currentProject.shortName}</span></div>
          <p className="mt-1" style={{ color: C.muted, fontSize: 11 }}>从统一账号库和企微群库中选择资源，再配置服务人员、容量和负载规则</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="px-3 py-2 rounded-md" style={{ background: C.panel, border: `1px solid ${C.border}` }}><span style={{ color: C.muted, fontSize: 9 }}>配置完成度</span><span className="ml-2 font-semibold" style={{ color: completion >= 90 ? C.green : C.amber, fontSize: 12 }}>{completion}%</span></div>
          <button onClick={() => flash(`${currentProject.shortName}资源方案已保存`)} className="px-3 py-2 rounded-md flex items-center gap-1.5" style={{ color: "white", background: C.primary, fontSize: 10 }}><Save size={12} />保存配置</button>
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
            const meta = typeMeta[account.type];
            const Icon = meta.icon;
            const assigned = account.projectIds.includes(currentProject.id);
            const load = account.type === "个人微信" ? Math.max(account.groups / rules.maxGroups, account.friends / rules.hardFriends) : 0;
            return <div key={account.id} className="grid grid-cols-[90px_1fr_1.2fr_90px_90px_120px_120px_96px] gap-2 px-3 py-2.5 items-center" style={{ borderTop: `1px solid ${C.border2}`, background: assigned ? "rgba(67,97,238,0.035)" : "transparent" }}><span className="flex items-center gap-1.5" style={{ color: meta.color, fontSize: 9 }}><Icon size={11} />{account.type}</span><span><span className="block font-medium" style={{ color: C.text, fontSize: 10 }}>{account.name}</span><span className="block mt-0.5" style={{ color: C.muted, fontSize: 8 }}>{account.id}</span></span><span className="truncate" style={{ color: C.text2, fontSize: 9 }}>{account.account}</span><span style={{ color: account.status === "异常" ? C.red : account.status === "库存" ? C.muted : C.green, fontSize: 9 }}>{account.status}</span><span style={{ color: C.text2, fontSize: 9 }}>{account.region}</span><select value={account.owner} onChange={event => updateAccount(account.id, { owner: event.target.value })} className="px-2 py-1.5 rounded-md outline-none" style={{ color: C.text2, background: C.bg, border: `1px solid ${C.border}`, fontSize: 9 }}><option>待分配</option>{staff.map(person => <option key={person.id}>{person.name}</option>)}<option>内容组</option></select><span>{account.type === "个人微信" ? <><span className="block" style={{ color: load >= .9 ? C.red : load >= .8 ? C.amber : C.text2, fontSize: 9 }}>{account.groups}/{rules.maxGroups} 群 · {account.friends}/{rules.hardFriends}</span><span className="block h-1 mt-1 rounded-full overflow-hidden" style={{ background: C.bg }}><span className="block h-full" style={{ width: `${Math.min(100, load * 100)}%`, background: load >= .9 ? C.red : load >= .8 ? C.amber : C.green }} /></span></> : <span style={{ color: C.muted, fontSize: 9 }}>资产可用</span>}</span><button onClick={() => toggleAccountProject(account.id, currentProject.id)} disabled={account.status === "异常" && !assigned} className="px-2 py-1.5 rounded-md disabled:opacity-40" style={{ color: assigned ? C.red : C.primary, background: assigned ? "rgba(248,113,113,0.1)" : "rgba(67,97,238,0.12)", fontSize: 9 }}>{assigned ? "移出项目" : "分配项目"}</button></div>;
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
            return <div key={group.id} className="grid grid-cols-[82px_1.4fr_110px_90px_150px_110px_110px_96px] gap-2 px-3 py-2.5 items-center" style={{ borderTop: `1px solid ${C.border2}`, background: assigned ? "rgba(67,97,238,0.035)" : "transparent" }}><span style={{ color: C.muted, fontSize: 9 }}>{group.id}</span><span className="font-medium" style={{ color: C.text, fontSize: 10 }}>{group.name}</span><span style={{ color: C.text2, fontSize: 9 }}>{group.type}</span><span style={{ color: C.text2, fontSize: 9 }}>{group.city}</span><select value={group.builder} onChange={event => updateGroup(group.id, { builder: event.target.value })} className="px-2 py-1.5 rounded-md outline-none" style={{ color: C.text2, background: C.bg, border: `1px solid ${C.border}`, fontSize: 9 }}>{enterpriseAccounts.map(account => <option key={account.id} value={account.id}>{account.name}</option>)}</select><span><span className="flex items-center gap-1"><span style={{ color: percent >= 90 ? C.red : C.text2, fontSize: 9 }}>{group.memberCount} /</span><input type="number" min={group.memberCount} value={group.targetCapacity} onChange={event => updateGroup(group.id, { targetCapacity: Math.max(group.memberCount, Number(event.target.value)) })} className="w-14 px-1.5 py-1 rounded outline-none" style={{ color: C.text, background: C.bg, border: `1px solid ${C.border}`, fontSize: 9 }} /></span><span className="block h-1 mt-1 rounded-full overflow-hidden" style={{ background: C.bg }}><span className="block h-full" style={{ width: `${Math.min(100, percent)}%`, background: percent >= 90 ? C.red : C.primary }} /></span></span><span style={{ color: group.status === "容量预警" ? C.red : group.status === "待配置" ? C.amber : C.green, fontSize: 9 }}>{group.status}</span><button onClick={() => updateGroup(group.id, { projectId: assigned ? null : currentProject.id })} className="px-2 py-1.5 rounded-md" style={{ color: assigned ? C.red : C.primary, background: assigned ? "rgba(248,113,113,0.1)" : "rgba(67,97,238,0.12)", fontSize: 9 }}>{assigned ? "移出项目" : "分配项目"}</button></div>;
          })}
        </section>
      )}

      {activeTab === "staffing" && (
        <section className="mt-3 rounded-md overflow-hidden" style={{ background: C.panel, border: `1px solid ${C.border}` }}>
          <div className="px-3 py-3 flex items-center justify-between" style={{ borderBottom: `1px solid ${C.border}` }}><div><h2 className="font-semibold" style={{ color: C.text, fontSize: 12 }}>群客服服务编组</h2><p className="mt-0.5" style={{ color: C.muted, fontSize: 9 }}>每个企微群配置企业微信客服和个人微信客服，并预测个微承接后的群数与好友负载</p></div><span className="px-2 py-1 rounded" style={{ color: C.amber, background: "rgba(251,191,36,0.12)", fontSize: 9 }}>默认 100 人/群 · 20 群/个微 · 2000 好友/个微</span></div>
          <div className="grid grid-cols-[1.35fr_115px_135px_170px_190px_110px] gap-2 px-3 py-2.5" style={{ color: C.muted, background: C.panel2, fontSize: 9 }}>{["项目群", "群容量", "企业微信客服", "个人微信客服", "分配后负载预测", "好友任务"].map(label => <span key={label}>{label}</span>)}</div>
          {assignedGroups.map(group => {
            const personal = personalAccounts.find(account => account.id === group.personalWechat);
            const projectedGroups = personal ? personal.groups + 1 : 0;
            const projectedFriends = personal ? personal.friends + group.memberCount : 0;
            const overload = projectedGroups > rules.maxGroups || projectedFriends > rules.hardFriends;
            const warning = projectedGroups / rules.maxGroups >= .8 || projectedFriends / rules.hardFriends >= .8;
            const taskCreated = taskGroups.includes(group.id);
            return <div key={group.id} className="grid grid-cols-[1.35fr_115px_135px_170px_190px_110px] gap-2 px-3 py-3 items-center" style={{ borderTop: `1px solid ${C.border2}` }}><span><span className="block font-medium" style={{ color: C.text, fontSize: 10 }}>{group.name}</span><span className="block mt-0.5" style={{ color: C.muted, fontSize: 8 }}>{group.builder} · {group.city} · {group.type}</span></span><span><span style={{ color: group.memberCount / group.targetCapacity >= .9 ? C.red : C.text2, fontSize: 9 }}>{group.memberCount}/{group.targetCapacity}</span><span className="block mt-1 h-1 rounded-full overflow-hidden" style={{ background: C.bg }}><span className="block h-full" style={{ width: `${Math.min(100, group.memberCount / group.targetCapacity * 100)}%`, background: group.memberCount / group.targetCapacity >= .9 ? C.red : C.primary }} /></span></span><select value={group.enterpriseService} onChange={event => updateGroup(group.id, { enterpriseService: event.target.value })} className="px-2 py-2 rounded-md outline-none" style={{ color: group.enterpriseService ? C.text2 : C.amber, background: C.bg, border: `1px solid ${C.border}`, fontSize: 9 }}><option value="">待配置</option>{staff.filter(person => person.role === "企微客服").map(person => <option key={person.id} value={person.id}>{person.name}</option>)}</select><select value={group.personalWechat} onChange={event => updateGroup(group.id, { personalWechat: event.target.value })} className="px-2 py-2 rounded-md outline-none" style={{ color: group.personalWechat ? C.text2 : C.amber, background: C.bg, border: `1px solid ${C.border}`, fontSize: 9 }}><option value="">待配置</option>{personalAccounts.filter(account => account.status === "使用中" && account.projectIds.includes(currentProject.id)).map(account => <option key={account.id} value={account.id}>{account.name} · {account.groups}/{rules.maxGroups}群</option>)}</select><span className="px-2.5 py-2 rounded-md" style={{ background: C.bg, border: `1px solid ${overload ? "rgba(248,113,113,0.4)" : warning ? "rgba(251,191,36,0.35)" : C.border}` }}>{personal ? <><span className="block" style={{ color: overload ? C.red : warning ? C.amber : C.green, fontSize: 9 }}>{projectedGroups}/{rules.maxGroups} 群 · {projectedFriends}/{rules.hardFriends} 好友</span><span className="block mt-1" style={{ color: C.muted, fontSize: 8 }}>预计新增 {group.memberCount} 位去重好友</span></> : <span style={{ color: C.muted, fontSize: 9 }}>选择个微后计算</span>}</span><button disabled={!group.personalWechat || overload} onClick={() => { createFriendTask(group.id); flash(`${group.name}加好友任务已生成`); }} className="px-2 py-2 rounded-md disabled:opacity-40" style={{ color: taskCreated ? C.green : C.primary, background: taskCreated ? "rgba(52,211,153,0.12)" : "rgba(67,97,238,0.12)", fontSize: 9 }}>{taskCreated ? "任务已生成" : overload ? "负载超限" : "生成任务"}</button></div>;
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
            <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: `1px solid ${C.border}` }}><span className="font-semibold" style={{ color: C.text, fontSize: 11 }}>配置校验</span><span style={{ color: issues.length ? C.amber : C.green, fontSize: 9 }}>{issues.length ? `${issues.length} 项待处理` : "全部通过"}</span></div>
            {issues.length ? issues.map((issue, index) => <div key={`${issue}-${index}`} className="px-4 py-3 flex items-start gap-2" style={{ borderTop: `1px solid ${C.border2}` }}><AlertTriangle size={12} className="mt-0.5 flex-shrink-0" style={{ color: C.amber }} /><span style={{ color: C.text2, fontSize: 9 }}>{issue}</span></div>) : <div className="p-6 text-center"><CheckCircle2 size={28} className="mx-auto" style={{ color: C.green }} /><div className="mt-2" style={{ color: C.text, fontSize: 11 }}>资源方案可以启用</div><div className="mt-1" style={{ color: C.muted, fontSize: 9 }}>账号、群组、人员和负载规则均已通过</div></div>}
            <button onClick={() => flash(issues.length ? "已重新执行配置校验" : "资源方案已启用")} className="m-3 px-3 py-2 rounded-md flex items-center justify-center gap-1.5" style={{ width: "calc(100% - 24px)", color: "white", background: issues.length ? C.panel2 : C.green, border: `1px solid ${C.border}`, fontSize: 9 }}>{issues.length ? <><Link2 size={11} />重新校验</> : <><Check size={11} />启用方案</>}</button>
          </aside>
        </div>
      )}
    </div>
  );
}
