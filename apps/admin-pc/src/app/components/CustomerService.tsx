import { useEffect, useMemo, useState } from "react";
import { Headphones, MessageCircle, Phone, RefreshCw, Search, X } from "lucide-react";
import { listEmployees, EmployeeRow } from "../../api/employees";
import { ApiError } from "../../api";

const L = {
  bg: "#0d1629", surface: "#131f35", surface2: "#1a2640", border: "rgba(255,255,255,0.075)", border2: "rgba(255,255,255,0.045)",
  text: "#e2e8f0", text2: "#94a3b8", muted: "#64748b", primary: "#4361ee", green: "#34d399", cyan: "#22d3ee", muted2: "#64748b",
};

const STATUS_COLOR: Record<string, string> = { 在职: L.green, 停用: L.muted, 离职: L.muted };
const maskPhone = (p: string | null) => (p && p.length >= 7 ? `${p.slice(0, 3)}****${p.slice(-4)}` : (p ?? "—"));

/**
 * 客服与服务资源：从后端员工域读取一线客服/服务人员及其绑定的服务资源（微信号 / 服务群）。
 * 只读真实数据（GET /employees）；手机号做脱敏展示；无数据时空态，不再渲染任何演示客服。
 */
export default function CustomerService() {
  const [rows, setRows] = useState<EmployeeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const load = () => {
    setLoading(true);
    setError(null);
    listEmployees()
      .then(setRows)
      .catch(e => setError(e instanceof ApiError ? e.message : "加载失败"))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const filtered = useMemo(() => rows.filter(e =>
    search === "" || e.name.includes(search) || e.emp_no.includes(search) ||
    (e.service_region ?? "").includes(search) || e.using_accounts.some(a => a.includes(search))),
  [rows, search]);

  return (
    <div className="p-5 h-full flex flex-col gap-3 min-w-[900px]" style={{ background: L.bg }}>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-semibold" style={{ color: L.text, fontSize: 18 }}>客服与服务资源</h1>
          <p className="mt-1" style={{ color: L.muted, fontSize: 11 }}>一线客服/服务人员及其绑定的微信号与服务群（数据来自后端员工域）</p>
        </div>
        <button onClick={load} className="px-3 py-2 rounded-md flex items-center gap-1.5" style={{ color: L.text2, background: L.surface, border: `1px solid ${L.border}`, fontSize: 11 }}>
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />刷新
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[["客服人数", rows.length, Headphones, L.primary], ["已绑微信号", rows.filter(e => e.using_accounts.length > 0).length, MessageCircle, L.cyan], ["在职", rows.filter(e => e.employment_status === "在职").length, Headphones, L.green]].map(([label, value, Icon, color]) => {
          const I = Icon as typeof Headphones;
          return <div key={label as string} className="p-3 rounded-md flex items-center gap-3" style={{ background: L.surface, border: `1px solid ${L.border}` }}><div className="w-9 h-9 rounded-md flex items-center justify-center" style={{ background: `${color}18` }}><I size={16} style={{ color: color as string }} /></div><div><div className="font-semibold" style={{ color: L.text, fontSize: 16 }}>{value as number}</div><div style={{ color: L.muted, fontSize: 9 }}>{label as string}</div></div></div>;
        })}
      </div>

      <div className="flex items-center gap-2">
        <div className="flex-1 px-3 py-2 rounded-md flex items-center gap-2" style={{ background: L.surface, border: `1px solid ${L.border}` }}>
          <Search size={12} style={{ color: L.muted }} />
          <input value={search} onChange={e => setSearch(e.target.value)} className="bg-transparent outline-none flex-1" style={{ color: L.text, fontSize: 10 }} placeholder="搜索姓名、工号、服务大区或微信号" />
          {search && <button onClick={() => setSearch("")} title="清除搜索"><X size={11} style={{ color: L.muted }} /></button>}
        </div>
      </div>

      <section className="flex-1 rounded-md overflow-hidden flex flex-col" style={{ background: L.surface, border: `1px solid ${L.border}` }}>
        <div className="grid grid-cols-[1.2fr_1fr_0.9fr_1.5fr_0.7fr_0.7fr] px-3 py-2.5" style={{ color: L.muted, background: L.surface2, fontSize: 9 }}>
          <span>客服</span><span>联系方式</span><span>服务大区</span><span>绑定微信号</span><span>服务群</span><span>状态</span>
        </div>
        <div className="flex-1 overflow-auto" style={{ scrollbarWidth: "none" }}>
          {loading && <div className="py-16 text-center" style={{ color: L.muted, fontSize: 11 }}>加载中…</div>}
          {!loading && error && <div className="py-16 text-center" style={{ color: "#f87171", fontSize: 11 }}>{error}<button onClick={load} className="ml-2 underline">重试</button></div>}
          {!loading && !error && filtered.length === 0 && (
            <div className="py-20 text-center flex flex-col items-center gap-2">
              <Headphones size={26} style={{ color: L.muted, opacity: 0.5 }} />
              <div style={{ color: L.text2, fontSize: 12 }}>{rows.length === 0 ? "暂无客服人员" : "无匹配结果"}</div>
              <div style={{ color: L.muted, fontSize: 9 }}>{rows.length === 0 ? "在「账号与人员」中录入客服/服务人员后在此展示" : "调整搜索或筛选条件"}</div>
            </div>
          )}
          {!loading && !error && filtered.map(e => (
            <div key={e.id} className="grid grid-cols-[1.2fr_1fr_0.9fr_1.5fr_0.7fr_0.7fr] px-3 py-2.5 items-center" style={{ borderTop: `1px solid ${L.border2}` }}>
              <span className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-full flex items-center justify-center font-semibold" style={{ color: L.text, background: "rgba(67,97,238,0.18)", fontSize: 10 }}>{e.name.slice(-1)}</span>
                <span><span className="block font-medium" style={{ color: L.text, fontSize: 10 }}>{e.name}</span><span className="block mt-0.5" style={{ color: L.muted, fontSize: 8 }}>{e.emp_no} · {e.job_role}</span></span>
              </span>
              <span className="flex items-center gap-1" style={{ color: L.text2, fontSize: 9 }}>{e.phone && <Phone size={9} style={{ color: L.muted }} />}{maskPhone(e.phone)}</span>
              <span style={{ color: e.service_region ? L.text2 : L.muted, fontSize: 9 }}>{e.service_region ?? "—"}</span>
              <span className="flex flex-wrap gap-1">
                {e.using_accounts.length === 0 ? <span style={{ color: L.muted, fontSize: 9 }}>—</span> :
                  e.using_accounts.map(a => <span key={a} className="px-1.5 py-0.5 rounded flex items-center gap-1" style={{ color: L.cyan, background: "rgba(34,211,238,0.1)", fontSize: 8 }}><MessageCircle size={9} />{a}</span>)}
              </span>
              <span style={{ color: L.text2, fontSize: 9 }}>{e.serving_groups.length} 个</span>
              <span><span className="px-1.5 py-0.5 rounded" style={{ color: STATUS_COLOR[e.employment_status] ?? L.text2, background: L.surface2, fontSize: 8 }}>{e.employment_status}</span></span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
