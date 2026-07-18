import { FormEvent, useMemo, useState } from "react";
import { Check, ChevronDown, MessageCircle, Plus, Search, ShieldCheck, UserRoundCog, Users2, X } from "lucide-react";
import { useProject } from "../contexts/ProjectContext";

const C = {
  bg: "#0d1629", panel: "#131f35", panel2: "#1a2640", border: "rgba(255,255,255,0.075)", border2: "rgba(255,255,255,0.045)",
  text: "#e2e8f0", text2: "#94a3b8", muted: "#64748b", purple: "#7c3aed", indigo: "#6366f1", green: "#34d399", amber: "#fbbf24", red: "#f87171", cyan: "#22d3ee",
};

interface StaffItem {
  id: number;
  name: string;
  no: string;
  department: string;
  role: string;
  projectIds: string[];
  wechat: string;
  serviceRegion: string;
  accountStatus: "已启用" | "未启用" | "停用";
  groups: number;
  members: number;
  capacity: number;
  pending: number;
  status: "在线" | "离线" | "停用";
}

const initialStaff: StaffItem[] = [
  { id: 1, name: "周小七", no: "YG-0018", department: "运营部", role: "社群运营", projectIds: ["flm-membership", "experience-camp"], wechat: "FLM-OPS-07", serviceRegion: "华东区", accountStatus: "已启用", groups: 8, members: 786, capacity: 900, pending: 5, status: "在线" },
  { id: 2, name: "林小五", no: "YG-0021", department: "客服部", role: "售后客服", projectIds: ["flm-membership"], wechat: "FLM-CS-05", serviceRegion: "华北区", accountStatus: "已启用", groups: 4, members: 462, capacity: 600, pending: 3, status: "在线" },
  { id: 3, name: "陈卓", no: "YG-0012", department: "技术部", role: "技术支持", projectIds: ["flm-membership", "experience-camp", "city-partner"], wechat: "FLM-TECH-02", serviceRegion: "全国", accountStatus: "已启用", groups: 2, members: 128, capacity: 300, pending: 2, status: "离线" },
  { id: 4, name: "李梦华", no: "YG-0007", department: "渠道部", role: "城市负责人", projectIds: ["city-partner"], wechat: "FLM-CITY-01", serviceRegion: "华南区", accountStatus: "已启用", groups: 6, members: 648, capacity: 650, pending: 2, status: "在线" },
  { id: 5, name: "王安然", no: "YG-0032", department: "课程部", role: "班主任", projectIds: ["experience-camp"], wechat: "FLM-CAMP-03", serviceRegion: "西南区", accountStatus: "已启用", groups: 5, members: 412, capacity: 520, pending: 0, status: "在线" },
  { id: 6, name: "郑远", no: "YG-0015", department: "运营部", role: "内容运营", projectIds: ["brand-live"], wechat: "待绑定", serviceRegion: "待配置", accountStatus: "未启用", groups: 0, members: 0, capacity: 0, pending: 0, status: "停用" },
];

export default function StaffManagement() {
  const { projects, currentProject } = useProject();
  const [staff] = useState(initialStaff);
  const [scope, setScope] = useState<"current" | "all">("current");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("全部");
  const [accountFilter, setAccountFilter] = useState("全部账号");
  const [editing, setEditing] = useState<StaffItem | null>(null);

  const filtered = useMemo(() => staff.filter(item =>
    (scope === "all" || item.projectIds.includes(currentProject.id)) &&
    (status === "全部" || item.status === status) &&
    (accountFilter === "全部账号" || item.accountStatus === accountFilter) &&
    (item.name.includes(search) || item.no.includes(search) || item.wechat.includes(search) || item.department.includes(search))),
  [staff, scope, currentProject.id, search, status, accountFilter]);

  // 员工域目前只有 listEmployees（只读）接口，无创建/更新绑定的真实接口，
  // 保存动作禁止在本地悄悄伪造成功，保存按钮已 disabled，这里仅阻止表单默认提交
  const saveBinding = (event: FormEvent) => {
    event.preventDefault();
  };

  return (
    <div className="p-5 h-full flex flex-col gap-3 min-w-[960px]" style={{ background: C.bg }}>
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(2,6,23,0.72)" }}>
          <form onSubmit={saveBinding} className="w-[500px] rounded-md overflow-hidden shadow-2xl" style={{ background: C.panel, border: `1px solid ${C.border}` }}>
            <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: `1px solid ${C.border}` }}><div><h2 className="font-semibold" style={{ color: C.text, fontSize: 14 }}>调整员工资源绑定</h2><p className="mt-1" style={{ color: C.muted, fontSize: 9 }}>{editing.name} · {editing.no}</p></div><button type="button" onClick={() => setEditing(null)} title="关闭" className="w-7 h-7 rounded-md flex items-center justify-center" style={{ background: C.panel2 }}><X size={14} style={{ color: C.muted }} /></button></div>
            <div className="p-4 grid grid-cols-2 gap-3">
              <label><span style={{ color: C.text2, fontSize: 10 }}>所属部门</span><select value={editing.department} onChange={event => setEditing({ ...editing, department: event.target.value })} className="mt-1.5 w-full px-3 py-2 rounded-md outline-none" style={{ color: C.text, background: C.panel2, border: `1px solid ${C.border}`, fontSize: 10 }}><option>运营部</option><option>客服部</option><option>技术部</option><option>渠道部</option><option>课程部</option></select></label>
              <label><span style={{ color: C.text2, fontSize: 10 }}>岗位角色</span><input value={editing.role} onChange={event => setEditing({ ...editing, role: event.target.value })} className="mt-1.5 w-full px-3 py-2 rounded-md outline-none" style={{ color: C.text, background: C.panel2, border: `1px solid ${C.border}`, fontSize: 10 }} /></label>
              <label><span style={{ color: C.text2, fontSize: 10 }}>服务大区</span><select value={editing.serviceRegion} onChange={event => setEditing({ ...editing, serviceRegion: event.target.value })} className="mt-1.5 w-full px-3 py-2 rounded-md outline-none" style={{ color: C.text, background: C.panel2, border: `1px solid ${C.border}`, fontSize: 10 }}><option>全国</option><option>华北区</option><option>华东区</option><option>华南区</option><option>西南区</option><option>待配置</option></select></label>
              <label><span style={{ color: C.text2, fontSize: 10 }}>员工账号</span><select value={editing.accountStatus} onChange={event => setEditing({ ...editing, accountStatus: event.target.value as StaffItem["accountStatus"] })} className="mt-1.5 w-full px-3 py-2 rounded-md outline-none" style={{ color: C.text, background: C.panel2, border: `1px solid ${C.border}`, fontSize: 10 }}><option>已启用</option><option>未启用</option><option>停用</option></select></label>
              <label className="col-span-2"><span style={{ color: C.text2, fontSize: 10 }}>绑定微信号</span><input value={editing.wechat} onChange={event => setEditing({ ...editing, wechat: event.target.value })} className="mt-1.5 w-full px-3 py-2 rounded-md outline-none" style={{ color: C.text, background: C.panel2, border: `1px solid ${C.border}`, fontSize: 10 }} /></label>
              <div className="col-span-2"><span style={{ color: C.text2, fontSize: 10 }}>可服务项目</span><div className="grid grid-cols-2 gap-2 mt-2">{projects.map(project => { const checked = editing.projectIds.includes(project.id); return <label key={project.id} className="px-2.5 py-2 rounded-md flex items-center gap-2 cursor-pointer" style={{ background: checked ? `${project.accent}12` : C.panel2, border: `1px solid ${checked ? `${project.accent}35` : C.border}` }}><input type="checkbox" checked={checked} onChange={() => setEditing({ ...editing, projectIds: checked ? editing.projectIds.filter(id => id !== project.id) : [...editing.projectIds, project.id] })} /><span className="w-1.5 h-1.5 rounded-full" style={{ background: project.accent }} /><span style={{ color: C.text2, fontSize: 9 }}>{project.name}</span></label>; })}</div></div>
            </div>
            <div className="px-4 py-3 flex justify-end gap-2" style={{ borderTop: `1px solid ${C.border}` }}><button type="button" onClick={() => setEditing(null)} className="px-3 py-2 rounded-md" style={{ color: C.text2, background: C.panel2, fontSize: 10 }}>取消</button><button type="submit" disabled title="接线中" className="px-3 py-2 rounded-md flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed" style={{ color: "white", background: C.indigo, fontSize: 10 }}><Check size={12} />保存绑定</button></div>
          </form>
        </div>
      )}

      <div className="flex items-start justify-between">
        <div><div className="flex items-center gap-2"><h1 className="font-semibold" style={{ color: C.text, fontSize: 18 }}>员工与资源绑定</h1><span className="px-2 py-0.5 rounded-md" style={{ color: currentProject.accent, background: `${currentProject.accent}15`, fontSize: 9 }}>{scope === "current" ? currentProject.shortName : "全部项目"}</span></div><p className="mt-1" style={{ color: C.muted, fontSize: 11 }}>管理员工在不同项目中的角色、微信号、社群和成员服务范围</p></div>
        <button onClick={() => setEditing({ id: Date.now(), name: "新员工", no: `YG-${String(staff.length + 1).padStart(4, "0")}`, department: "运营部", role: "社群运营", projectIds: [currentProject.id], wechat: "待绑定", serviceRegion: "待配置", accountStatus: "未启用", groups: 0, members: 0, capacity: 0, pending: 0, status: "在线" })} className="px-3 py-2 rounded-md flex items-center gap-1.5" style={{ color: "white", background: C.indigo, fontSize: 11 }}><Plus size={13} />添加员工</button>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {[["当前员工", filtered.length, UserRoundCog, C.purple], ["已启用账号", filtered.filter(item => item.accountStatus === "已启用").length, Users2, C.green], ["未启用账号", filtered.filter(item => item.accountStatus === "未启用").length, ShieldCheck, C.amber], ["已绑定微信号", filtered.filter(item => item.wechat !== "待绑定").length, MessageCircle, C.cyan]].map(([label, value, Icon, color]) => { const I = Icon as typeof Users2; return <div key={label as string} className="p-3 rounded-md flex items-center gap-3" style={{ background: C.panel, border: `1px solid ${C.border}` }}><div className="w-9 h-9 rounded-md flex items-center justify-center" style={{ background: `${color}18` }}><I size={16} style={{ color: color as string }} /></div><div><div className="font-semibold" style={{ color: C.text, fontSize: 16 }}>{value as number}</div><div style={{ color: C.muted, fontSize: 9 }}>{label as string}</div></div></div>; })}
      </div>

      <div className="px-3 py-2 rounded-md flex items-center justify-between" style={{ background: "rgba(99,102,241,0.09)", border: `1px solid ${C.border}` }}>
        <span style={{ color: C.text2, fontSize: 10 }}>启用状态来自微信号配置：员工与任一微信号或社群建立绑定关系后为已启用，未绑定任何群为未启用。</span>
        <span style={{ color: C.muted, fontSize: 9 }}>与微信管理保持同一口径</span>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex p-1 rounded-md" style={{ background: C.panel, border: `1px solid ${C.border}` }}><button onClick={() => setScope("current")} className="px-3 py-1.5 rounded" style={{ color: scope === "current" ? C.text : C.muted, background: scope === "current" ? C.panel2 : "transparent", fontSize: 9 }}>当前项目</button><button onClick={() => setScope("all")} className="px-3 py-1.5 rounded" style={{ color: scope === "all" ? C.text : C.muted, background: scope === "all" ? C.panel2 : "transparent", fontSize: 9 }}>全部项目</button></div>
        <div className="flex-1 px-3 py-2 rounded-md flex items-center gap-2" style={{ background: C.panel, border: `1px solid ${C.border}` }}><Search size={12} style={{ color: C.muted }} /><input value={search} onChange={event => setSearch(event.target.value)} className="bg-transparent outline-none flex-1" style={{ color: C.text, fontSize: 10 }} placeholder="搜索姓名、员工编号、部门或微信号" />{search && <button onClick={() => setSearch("")} title="清除搜索"><X size={11} style={{ color: C.muted }} /></button>}</div>
        <div className="relative"><select value={accountFilter} onChange={event => setAccountFilter(event.target.value)} className="appearance-none pl-3 pr-8 py-2 rounded-md outline-none" style={{ color: C.text2, background: C.panel, border: `1px solid ${C.border}`, fontSize: 9 }}><option>全部账号</option><option>已启用</option><option>未启用</option><option>停用</option></select><ChevronDown size={11} className="absolute right-2.5 top-2.5 pointer-events-none" style={{ color: C.muted }} /></div>
        <div className="relative"><select value={status} onChange={event => setStatus(event.target.value)} className="appearance-none pl-3 pr-8 py-2 rounded-md outline-none" style={{ color: C.text2, background: C.panel, border: `1px solid ${C.border}`, fontSize: 9 }}><option>全部</option><option>在线</option><option>离线</option><option>停用</option></select><ChevronDown size={11} className="absolute right-2.5 top-2.5 pointer-events-none" style={{ color: C.muted }} /></div>
      </div>

      <section className="flex-1 rounded-md overflow-hidden flex flex-col" style={{ background: C.panel, border: `1px solid ${C.border}` }}>
        <div className="grid grid-cols-[1.15fr_0.9fr_1.2fr_0.8fr_1fr_70px_100px_72px_76px_86px] px-3 py-2.5" style={{ color: C.muted, background: C.panel2, fontSize: 9 }}><span>员工</span><span>部门 / 角色</span><span>可服务项目</span><span>服务大区</span><span>绑定微信号</span><span>社群</span><span>成员 / 容量</span><span>账号</span><span>状态</span><span>操作</span></div>
        <div className="flex-1 overflow-auto" style={{ scrollbarWidth: "none" }}>
          {filtered.map(item => {
            const load = item.capacity ? item.members / item.capacity : 0;
            return <div key={item.id} className="grid grid-cols-[1.15fr_0.9fr_1.2fr_0.8fr_1fr_70px_100px_72px_76px_86px] px-3 py-2.5 items-center" style={{ borderTop: `1px solid ${C.border2}` }}><span className="flex items-center gap-2"><span className="w-8 h-8 rounded-full flex items-center justify-center font-semibold" style={{ color: C.text, background: "rgba(124,58,237,0.18)", fontSize: 10 }}>{item.name.slice(-1)}</span><span><span className="block font-medium" style={{ color: C.text, fontSize: 10 }}>{item.name}</span><span className="block mt-0.5" style={{ color: C.muted, fontSize: 8 }}>{item.no}</span></span></span><span><span className="block" style={{ color: C.text2, fontSize: 9 }}>{item.department}</span><span className="block mt-0.5" style={{ color: C.muted, fontSize: 8 }}>{item.role}</span></span><span className="flex flex-wrap gap-1">{item.projectIds.map(id => { const project = projects.find(p => p.id === id); return project ? <span key={id} className="px-1.5 py-0.5 rounded" style={{ color: project.accent, background: `${project.accent}14`, fontSize: 8 }}>{project.shortName}</span> : null; })}</span><span style={{ color: item.serviceRegion === "待配置" ? C.amber : C.text2, fontSize: 9 }}>{item.serviceRegion}</span><span className="flex items-center gap-1.5" style={{ color: item.wechat === "待绑定" ? C.amber : C.cyan, fontSize: 9 }}><MessageCircle size={10} />{item.wechat}</span><span style={{ color: C.text2, fontSize: 9 }}>{item.groups} 个</span><span><span className="block" style={{ color: load >= 0.9 ? C.red : C.text2, fontSize: 9 }}>{item.members.toLocaleString()} / {item.capacity || "-"}</span><span className="block mt-1 h-1 rounded-full overflow-hidden" style={{ background: C.panel2 }}><span className="block h-full rounded-full" style={{ width: `${Math.min(100, load * 100)}%`, background: load >= 0.9 ? C.red : C.green }} /></span></span><span><span className="px-1.5 py-0.5 rounded" style={{ color: item.accountStatus === "已启用" ? C.green : item.accountStatus === "未启用" ? C.amber : C.muted, background: item.accountStatus === "已启用" ? "rgba(52,211,153,0.12)" : item.accountStatus === "未启用" ? "rgba(251,191,36,0.12)" : C.panel2, fontSize: 8 }}>{item.accountStatus}</span></span><span><span className="px-1.5 py-0.5 rounded" style={{ color: item.status === "在线" ? C.green : item.status === "离线" ? C.amber : C.muted, background: item.status === "在线" ? "rgba(52,211,153,0.12)" : item.status === "离线" ? "rgba(251,191,36,0.12)" : C.panel2, fontSize: 8 }}>{item.status}</span></span><button onClick={() => setEditing(item)} className="px-2 py-1.5 rounded-md" style={{ color: C.purple, background: "rgba(124,58,237,0.12)", fontSize: 8 }}>调整绑定</button></div>;
          })}
        </div>
      </section>
    </div>
  );
}
