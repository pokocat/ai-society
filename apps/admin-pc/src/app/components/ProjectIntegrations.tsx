import { FormEvent, useState } from "react";
import {
  Activity, Check, CheckCircle2, Database, KeyRound, Link2, LoaderCircle,
  MessageCircle, Plus, RefreshCw, Server, Settings2, ShieldCheck, Users2, X,
} from "lucide-react";
import { ProjectItem, useProject } from "../contexts/ProjectContext";

const C = {
  bg: "#0d1629", panel: "#131f35", panel2: "#1a2640",
  border: "rgba(255,255,255,0.075)", border2: "rgba(255,255,255,0.045)",
  text: "#e2e8f0", text2: "#94a3b8", muted: "#64748b",
  purple: "#7c3aed", indigo: "#6366f1", green: "#34d399", amber: "#fbbf24", red: "#f87171", cyan: "#22d3ee",
};

const statusMap = {
  connected: { color: C.green, label: "已连接" },
  warning: { color: C.amber, label: "需处理" },
  configuring: { color: C.muted, label: "配置中" },
};

const sourceRows = [
  { resource: "统一成员档案", source: "用户中心 / 订单系统", key: "mobile + union_id", direction: "双向", update: "实时", status: "正常" },
  { resource: "微信号资产", source: "企微助手", key: "wechat_account_id", direction: "项目 → 中台", update: "5 分钟", status: "正常" },
  { resource: "员工与部门", source: "组织权限系统", key: "employee_no", direction: "项目 → 中台", update: "30 分钟", status: "正常" },
  { resource: "社群与成员", source: "群管理模块", key: "group_id + member_id", direction: "双向", update: "实时", status: "正常" },
  { resource: "回访与工单", source: "客户服务系统", key: "user_id + project_id", direction: "中台 → 项目", update: "实时", status: "待确认" },
];

export default function ProjectIntegrations() {
  const { projects, currentProjectId, setCurrentProjectId, syncProject, addProject } = useProject();
  const [syncing, setSyncing] = useState<string | null>(null);
  const [showConnect, setShowConnect] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ name: "", code: "", category: "会员业务", endpoint: "", apiType: "OpenAPI" });

  const runSync = (project: ProjectItem) => {
    setSyncing(project.id);
    window.setTimeout(() => {
      syncProject(project.id);
      setSyncing(null);
      setMessage(`${project.shortName}的数据已完成同步`);
      window.setTimeout(() => setMessage(""), 2400);
    }, 900);
  };

  const submitProject = (event: FormEvent) => {
    event.preventDefault();
    if (!form.name.trim() || !form.code.trim() || !form.endpoint.trim()) return;
    addProject({
      code: form.code.toUpperCase(), name: form.name, shortName: form.name.replace("项目", ""),
      category: form.category, status: "configuring", statusText: "等待鉴权", accent: C.cyan,
      apiType: form.apiType, endpoint: form.endpoint, lastSync: "尚未同步",
      users: 0, groups: 0, wechatAccounts: 0, employees: 0,
    });
    setShowConnect(false);
    setMessage(`${form.name}已加入接入队列`);
    setForm({ name: "", code: "", category: "会员业务", endpoint: "", apiType: "OpenAPI" });
    window.dispatchEvent(new CustomEvent("flm:navigate", { detail: "resourceconfig" }));
  };

  return (
    <div className="p-5 h-full overflow-auto min-w-[980px]" style={{ background: C.bg }}>
      {message && (
        <div className="fixed top-16 right-5 z-50 flex items-center gap-2 px-3 py-2 rounded-md shadow-xl"
          style={{ background: "#0f2f2b", border: "1px solid rgba(52,211,153,0.35)", color: C.green, fontSize: 11 }}>
          <Check size={13} />{message}
        </div>
      )}

      {showConnect && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(2,6,23,0.72)" }}>
          <form onSubmit={submitProject} className="w-[460px] rounded-md overflow-hidden shadow-2xl" style={{ background: C.panel, border: `1px solid ${C.border}` }}>
            <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: `1px solid ${C.border}` }}>
              <div><h2 className="font-semibold" style={{ color: C.text, fontSize: 14 }}>接入新的项目系统</h2><p className="mt-1" style={{ color: C.muted, fontSize: 9 }}>先创建连接，鉴权与字段映射可在下一步完成</p></div>
              <button type="button" onClick={() => setShowConnect(false)} className="w-7 h-7 rounded-md flex items-center justify-center" style={{ background: C.panel2 }} title="关闭"><X size={14} style={{ color: C.muted }} /></button>
            </div>
            <div className="p-4 grid grid-cols-2 gap-3">
              <label className="col-span-2"><span style={{ color: C.text2, fontSize: 10 }}>项目名称</span><input value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} className="mt-1.5 w-full px-3 py-2 rounded-md outline-none" style={{ color: C.text, background: C.panel2, border: `1px solid ${C.border}`, fontSize: 11 }} placeholder="例如：新品体验官项目" /></label>
              <label><span style={{ color: C.text2, fontSize: 10 }}>项目编码</span><input value={form.code} onChange={event => setForm({ ...form, code: event.target.value })} className="mt-1.5 w-full px-3 py-2 rounded-md outline-none" style={{ color: C.text, background: C.panel2, border: `1px solid ${C.border}`, fontSize: 11 }} placeholder="FLM-NEW" /></label>
              <label><span style={{ color: C.text2, fontSize: 10 }}>业务类型</span><select value={form.category} onChange={event => setForm({ ...form, category: event.target.value })} className="mt-1.5 w-full px-3 py-2 rounded-md outline-none" style={{ color: C.text, background: C.panel2, border: `1px solid ${C.border}`, fontSize: 11 }}><option>会员业务</option><option>课程活动</option><option>渠道合伙</option><option>内容获客</option></select></label>
              <label><span style={{ color: C.text2, fontSize: 10 }}>连接方式</span><select value={form.apiType} onChange={event => setForm({ ...form, apiType: event.target.value })} className="mt-1.5 w-full px-3 py-2 rounded-md outline-none" style={{ color: C.text, background: C.panel2, border: `1px solid ${C.border}`, fontSize: 11 }}><option>OpenAPI</option><option>REST API</option><option>Webhook</option><option>数据库只读</option></select></label>
              <label><span style={{ color: C.text2, fontSize: 10 }}>数据权限</span><select className="mt-1.5 w-full px-3 py-2 rounded-md outline-none" style={{ color: C.text, background: C.panel2, border: `1px solid ${C.border}`, fontSize: 11 }}><option>双向读写</option><option>仅读取项目数据</option><option>仅回写任务结果</option></select></label>
              <label className="col-span-2"><span style={{ color: C.text2, fontSize: 10 }}>API 地址</span><input value={form.endpoint} onChange={event => setForm({ ...form, endpoint: event.target.value })} className="mt-1.5 w-full px-3 py-2 rounded-md outline-none" style={{ color: C.text, background: C.panel2, border: `1px solid ${C.border}`, fontSize: 11 }} placeholder="https://api.example.com/open/v1" /></label>
            </div>
            <div className="px-4 py-3 flex justify-end gap-2" style={{ borderTop: `1px solid ${C.border}` }}>
              <button type="button" onClick={() => setShowConnect(false)} className="px-3 py-2 rounded-md" style={{ color: C.text2, background: C.panel2, fontSize: 10 }}>取消</button>
              <button type="submit" className="px-3 py-2 rounded-md flex items-center gap-1.5" style={{ color: "white", background: C.indigo, fontSize: 10 }}><Link2 size={12} />创建连接</button>
            </div>
          </form>
        </div>
      )}

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2"><h1 className="font-semibold" style={{ color: C.text, fontSize: 18 }}>项目接入中心</h1><span className="px-2 py-0.5 rounded-md" style={{ color: C.cyan, background: "rgba(34,211,238,0.12)", fontSize: 9 }}>跨项目数据底座</span></div>
          <p className="mt-1" style={{ color: C.muted, fontSize: 11 }}>连接业务系统，统一成员、员工、微信号、社群和服务记录</p>
        </div>
        <button onClick={() => setShowConnect(true)} className="px-3 py-2 rounded-md flex items-center gap-1.5" style={{ color: "white", background: C.indigo, fontSize: 11 }}><Plus size={13} />接入项目</button>
      </div>

      <div className="grid grid-cols-4 gap-2 mt-4">
        {[
          ["已接入项目", projects.length.toString(), `${projects.filter(project => project.status === "connected").length} 个运行正常`, Link2, C.purple],
          ["统一成员", projects.reduce((sum, project) => sum + project.users, 0).toLocaleString(), "跨项目去重后 4,186", Users2, C.cyan],
          ["微信号资产", projects.reduce((sum, project) => sum + project.wechatAccounts, 0).toString(), "38 个在线", MessageCircle, C.green],
          ["今日同步事件", "12,680", "2 条需要人工确认", Activity, C.amber],
        ].map(([label, value, detail, Icon, color]) => {
          const IconComponent = Icon as typeof Link2;
          return <div key={label as string} className="p-3 rounded-md flex items-center gap-3" style={{ background: C.panel, border: `1px solid ${C.border}` }}><div className="w-9 h-9 rounded-md flex items-center justify-center" style={{ background: `${color}18` }}><IconComponent size={16} style={{ color: color as string }} /></div><div><div className="font-semibold" style={{ color: C.text, fontSize: 16 }}>{value as string}</div><div className="mt-0.5" style={{ color: C.text2, fontSize: 9 }}>{label as string} · <span style={{ color: color as string }}>{detail as string}</span></div></div></div>;
        })}
      </div>

      <div className="grid grid-cols-2 gap-3 mt-3">
        {projects.map(project => {
          const status = statusMap[project.status];
          const active = currentProjectId === project.id;
          return (
            <section key={project.id} className="rounded-md overflow-hidden" style={{ background: C.panel, border: `1px solid ${active ? `${project.accent}70` : C.border}` }}>
              <div className="h-1" style={{ background: project.accent }} />
              <div className="p-3.5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-md flex items-center justify-center font-semibold" style={{ color: project.accent, background: `${project.accent}18`, fontSize: 11 }}>{project.code.split("-").pop()}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2"><h2 className="font-semibold" style={{ color: C.text, fontSize: 13 }}>{project.name}</h2><span className="px-1.5 py-0.5 rounded" style={{ color: status.color, background: `${status.color}16`, fontSize: 8 }}>{status.label}</span></div>
                    <div className="mt-1 flex items-center gap-2" style={{ color: C.muted, fontSize: 9 }}><span>{project.code}</span><span>·</span><span>{project.category}</span><span>·</span><span>{project.apiType}</span></div>
                  </div>
                  {active && <span className="flex items-center gap-1" style={{ color: project.accent, fontSize: 8 }}><CheckCircle2 size={11} />当前项目</span>}
                </div>
                <div className="grid grid-cols-4 gap-1.5 mt-3">
                  {[["成员", project.users], ["微信群", project.groups], ["微信号", project.wechatAccounts], ["员工", project.employees]].map(([label, value]) => <div key={label as string} className="p-2 rounded-md text-center" style={{ background: C.bg }}><div className="font-semibold" style={{ color: C.text, fontSize: 11 }}>{value as number}</div><div className="mt-0.5" style={{ color: C.muted, fontSize: 8 }}>{label as string}</div></div>)}
                </div>
                <div className="mt-3 px-2.5 py-2 rounded-md flex items-center gap-2" style={{ background: C.panel2 }}><Server size={11} style={{ color: C.muted }} /><span className="truncate flex-1" style={{ color: C.text2, fontSize: 9 }}>{project.endpoint}</span><span style={{ color: status.color, fontSize: 8 }}>{project.statusText}</span></div>
                <div className="mt-3 flex items-center justify-between">
                  <span style={{ color: C.muted, fontSize: 8 }}>最近同步：{project.lastSync}</span>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => setCurrentProjectId(project.id)} className="px-2.5 py-1.5 rounded-md" style={{ color: active ? project.accent : C.text2, background: C.panel2, border: `1px solid ${C.border}`, fontSize: 9 }}>{active ? "正在使用" : "设为当前"}</button>
                    <button onClick={() => { setCurrentProjectId(project.id); window.dispatchEvent(new CustomEvent("flm:navigate", { detail: "resourceconfig" })); }} className="px-2.5 py-1.5 rounded-md" style={{ color: C.cyan, background: "rgba(34,211,238,0.1)", border: `1px solid ${C.border}`, fontSize: 9 }}>配置资源</button>
                    <button onClick={() => runSync(project)} disabled={syncing === project.id} className="px-2.5 py-1.5 rounded-md flex items-center gap-1 disabled:opacity-60" style={{ color: "white", background: project.accent, fontSize: 9 }}>{syncing === project.id ? <LoaderCircle size={11} className="animate-spin" /> : <RefreshCw size={11} />}同步</button>
                    <button title="连接设置" onClick={() => setMessage(`${project.shortName}的连接设置已打开`)} className="w-7 h-7 rounded-md flex items-center justify-center" style={{ background: C.panel2, border: `1px solid ${C.border}` }}><Settings2 size={12} style={{ color: C.muted }} /></button>
                  </div>
                </div>
              </div>
            </section>
          );
        })}
      </div>

      <section className="mt-3 rounded-md overflow-hidden" style={{ background: C.panel, border: `1px solid ${C.border}` }}>
        <div className="px-3 py-2.5 flex items-center justify-between" style={{ borderBottom: `1px solid ${C.border}` }}><div><h2 className="font-semibold" style={{ color: C.text, fontSize: 12 }}>统一数据映射</h2><p className="mt-0.5" style={{ color: C.muted, fontSize: 9 }}>项目系统保留业务主数据，社群中台维护跨项目关系与运营记录</p></div><div className="flex items-center gap-3" style={{ color: C.muted, fontSize: 8 }}><span className="flex items-center gap-1"><ShieldCheck size={11} style={{ color: C.green }} />字段已脱敏</span><span className="flex items-center gap-1"><KeyRound size={11} style={{ color: C.cyan }} />按项目授权</span></div></div>
        <div className="grid grid-cols-[1.1fr_1.3fr_1fr_90px_80px_70px] px-3 py-2" style={{ color: C.muted, background: C.panel2, fontSize: 9 }}><span>中台资源</span><span>项目数据源</span><span>匹配主键</span><span>同步方向</span><span>更新频率</span><span>状态</span></div>
        {sourceRows.map(row => <div key={row.resource} className="grid grid-cols-[1.1fr_1.3fr_1fr_90px_80px_70px] px-3 py-2.5 items-center" style={{ color: C.text2, borderTop: `1px solid ${C.border2}`, fontSize: 9 }}><span className="flex items-center gap-2"><Database size={11} style={{ color: C.purple }} />{row.resource}</span><span>{row.source}</span><code style={{ color: C.cyan, fontSize: 8 }}>{row.key}</code><span>{row.direction}</span><span>{row.update}</span><span style={{ color: row.status === "正常" ? C.green : C.amber }}>{row.status}</span></div>)}
      </section>
    </div>
  );
}
