import { useEffect, useMemo, useState } from "react";
import { MessageCircle, RefreshCw, Search, ShieldCheck, UserRoundCog, Users2, X } from "lucide-react";
import { listEmployees, EmployeeRow } from "../../api/employees";
import { ApiError } from "../../api";

const C = {
  bg: "#0d1629", panel: "#131f35", panel2: "#1a2640", border: "rgba(255,255,255,0.075)", border2: "rgba(255,255,255,0.045)",
  text: "#e2e8f0", text2: "#94a3b8", muted: "#64748b", purple: "#7c3aed", indigo: "#6366f1", green: "#34d399", amber: "#fbbf24", red: "#f87171", cyan: "#22d3ee",
};

const STATUS_COLOR: Record<string, string> = { 在职: C.green, 停用: C.muted, 离职: C.muted };

/**
 * 员工与资源绑定：只读真实数据（GET /employees）。
 * 员工域后端目前只提供列表查询；创建/绑定变更尚无落库接口，故本页不放任何会“假成功”的写操作，
 * 展示字段全部来自后端（在职状态、服务大区、服务群数、使用微信号）——后端没有的字段（在线状态、
 * 成员容量）不再编造。
 */
export default function StaffManagement() {
  const [rows, setRows] = useState<EmployeeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("全部");

  const load = () => {
    setLoading(true);
    setError(null);
    listEmployees()
      .then(setRows)
      .catch(e => setError(e instanceof ApiError ? e.message : "加载失败"))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const filtered = useMemo(() => rows.filter(item =>
    (status === "全部" || item.employment_status === status) &&
    (search === "" || item.name.includes(search) || item.emp_no.includes(search) ||
      (item.department ?? "").includes(search) || item.using_accounts.some(a => a.includes(search)))),
  [rows, search, status]);

  const stat = (pred: (e: EmployeeRow) => boolean) => rows.filter(pred).length;

  return (
    <div className="p-5 h-full flex flex-col gap-3 min-w-[900px]" style={{ background: C.bg }}>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-semibold" style={{ color: C.text, fontSize: 18 }}>员工与资源绑定</h1>
          <p className="mt-1" style={{ color: C.muted, fontSize: 11 }}>客服/运营员工的岗位、服务大区、社群与微信号绑定（数据来自后端员工域）</p>
        </div>
        <button onClick={load} className="px-3 py-2 rounded-md flex items-center gap-1.5" style={{ color: C.text2, background: C.panel, border: `1px solid ${C.border}`, fontSize: 11 }}>
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />刷新
        </button>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {[["员工总数", rows.length, UserRoundCog, C.purple], ["在职", stat(e => e.employment_status === "在职"), Users2, C.green], ["已绑微信号", stat(e => e.using_accounts.length > 0), MessageCircle, C.cyan], ["带服务群", stat(e => e.serving_groups.length > 0), ShieldCheck, C.amber]].map(([label, value, Icon, color]) => {
          const I = Icon as typeof Users2;
          return <div key={label as string} className="p-3 rounded-md flex items-center gap-3" style={{ background: C.panel, border: `1px solid ${C.border}` }}><div className="w-9 h-9 rounded-md flex items-center justify-center" style={{ background: `${color}18` }}><I size={16} style={{ color: color as string }} /></div><div><div className="font-semibold" style={{ color: C.text, fontSize: 16 }}>{value as number}</div><div style={{ color: C.muted, fontSize: 9 }}>{label as string}</div></div></div>;
        })}
      </div>

      <div className="flex items-center gap-2">
        <div className="flex-1 px-3 py-2 rounded-md flex items-center gap-2" style={{ background: C.panel, border: `1px solid ${C.border}` }}>
          <Search size={12} style={{ color: C.muted }} />
          <input value={search} onChange={e => setSearch(e.target.value)} className="bg-transparent outline-none flex-1" style={{ color: C.text, fontSize: 10 }} placeholder="搜索姓名、工号、部门或微信号" />
          {search && <button onClick={() => setSearch("")} title="清除搜索"><X size={11} style={{ color: C.muted }} /></button>}
        </div>
        <div className="relative">
          <select value={status} onChange={e => setStatus(e.target.value)} className="appearance-none pl-3 pr-8 py-2 rounded-md outline-none" style={{ color: C.text2, background: C.panel, border: `1px solid ${C.border}`, fontSize: 9 }}>
            <option>全部</option><option>在职</option><option>停用</option><option>离职</option>
          </select>
        </div>
      </div>

      <section className="flex-1 rounded-md overflow-hidden flex flex-col" style={{ background: C.panel, border: `1px solid ${C.border}` }}>
        <div className="grid grid-cols-[1.2fr_1fr_0.9fr_1.4fr_0.7fr_0.7fr] px-3 py-2.5" style={{ color: C.muted, background: C.panel2, fontSize: 9 }}>
          <span>员工</span><span>部门 / 岗位</span><span>服务大区</span><span>使用微信号</span><span>服务群</span><span>在职状态</span>
        </div>
        <div className="flex-1 overflow-auto" style={{ scrollbarWidth: "none" }}>
          {loading && <div className="py-16 text-center" style={{ color: C.muted, fontSize: 11 }}>加载中…</div>}
          {!loading && error && <div className="py-16 text-center" style={{ color: C.red, fontSize: 11 }}>{error}<button onClick={load} className="ml-2 underline">重试</button></div>}
          {!loading && !error && filtered.length === 0 && (
            <div className="py-20 text-center flex flex-col items-center gap-2">
              <UserRoundCog size={26} style={{ color: C.muted, opacity: 0.5 }} />
              <div style={{ color: C.text2, fontSize: 12 }}>{rows.length === 0 ? "暂无员工" : "无匹配结果"}</div>
              <div style={{ color: C.muted, fontSize: 9 }}>{rows.length === 0 ? "在「账号与人员」中录入员工后在此展示" : "调整搜索或筛选条件"}</div>
            </div>
          )}
          {!loading && !error && filtered.map(item => (
            <div key={item.id} className="grid grid-cols-[1.2fr_1fr_0.9fr_1.4fr_0.7fr_0.7fr] px-3 py-2.5 items-center" style={{ borderTop: `1px solid ${C.border2}` }}>
              <span className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-full flex items-center justify-center font-semibold" style={{ color: C.text, background: "rgba(124,58,237,0.18)", fontSize: 10 }}>{item.name.slice(-1)}</span>
                <span><span className="block font-medium" style={{ color: C.text, fontSize: 10 }}>{item.name}</span><span className="block mt-0.5" style={{ color: C.muted, fontSize: 8 }}>{item.emp_no}</span></span>
              </span>
              <span><span className="block" style={{ color: C.text2, fontSize: 9 }}>{item.department ?? "—"}</span><span className="block mt-0.5" style={{ color: C.muted, fontSize: 8 }}>{item.job_role}</span></span>
              <span style={{ color: item.service_region ? C.text2 : C.muted, fontSize: 9 }}>{item.service_region ?? "—"}</span>
              <span className="flex flex-wrap gap-1">
                {item.using_accounts.length === 0 ? <span style={{ color: C.muted, fontSize: 9 }}>—</span> :
                  item.using_accounts.map(a => <span key={a} className="px-1.5 py-0.5 rounded flex items-center gap-1" style={{ color: C.cyan, background: "rgba(34,211,238,0.1)", fontSize: 8 }}><MessageCircle size={9} />{a}</span>)}
              </span>
              <span style={{ color: C.text2, fontSize: 9 }}>{item.serving_groups.length} 个</span>
              <span><span className="px-1.5 py-0.5 rounded" style={{ color: STATUS_COLOR[item.employment_status] ?? C.text2, background: C.panel2, fontSize: 8 }}>{item.employment_status}</span></span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
