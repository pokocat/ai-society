import { useEffect, useMemo, useState } from "react";
import { Plug, RefreshCw, Search, X, Check, AlertTriangle, Database } from "lucide-react";
import { listProjects, syncProject, ProjectRow } from "../../api/projects";
import { ApiError } from "../../api";

const L = {
  bg: "#0d1629", surface: "#131f35", surface2: "#1a2640", border: "rgba(255,255,255,0.075)", border2: "rgba(255,255,255,0.045)",
  text: "#e2e8f0", text2: "#94a3b8", muted: "#64748b", primary: "#4361ee", green: "#34d399", amber: "#fbbf24", red: "#f87171",
};

const AUTH_COLOR: Record<string, string> = { 已授权: L.green, 已连接: L.green, 待授权: L.amber, 授权失败: L.red, 未接入: L.muted };
const fmt = (s: string | null) => (s ? String(s).slice(0, 16).replace("T", " ") : "—");

/**
 * 项目接入中心：外部项目系统的对接状态（真实数据 GET /projects，含 api_type/endpoint/auth_status/
 * last_sync_at 等接入字段）。可对单个项目触发同步（POST /projects/{id}/sync）。
 */
export default function ProjectIntegrations() {
  const [rows, setRows] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [syncing, setSyncing] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    listProjects()
      .then(setRows)
      .catch(e => setError(e instanceof ApiError ? e.message : "加载失败"))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const flash = (m: string) => { setToast(m); window.setTimeout(() => setToast(null), 2200); };
  const doSync = async (p: ProjectRow) => {
    if (syncing) return;
    setSyncing(p.id);
    try { await syncProject(p.id); flash(`「${p.short_name}」同步已触发`); load(); }
    catch (e) { flash(e instanceof ApiError ? e.message : "同步失败"); }
    finally { setSyncing(null); }
  };

  const filtered = useMemo(() => rows.filter(p =>
    search === "" || p.name.includes(search) || p.code.includes(search) || (p.api_type ?? "").includes(search)),
  [rows, search]);

  const connected = rows.filter(p => p.auth_status === "已授权" || p.auth_status === "已连接").length;

  return (
    <div className="p-5 h-full flex flex-col gap-3 min-w-[920px]" style={{ background: L.bg }}>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-semibold" style={{ color: L.text, fontSize: 18 }}>项目接入中心</h1>
          <p className="mt-1" style={{ color: L.muted, fontSize: 11 }}>各项目对接的外部系统、数据范围与同步状态（数据来自后端项目域）</p>
        </div>
        <button onClick={load} className="px-3 py-2 rounded-md flex items-center gap-1.5" style={{ color: L.text2, background: L.surface, border: `1px solid ${L.border}`, fontSize: 11 }}>
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />刷新
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[["接入项目", rows.length, Plug, L.primary], ["已连接", connected, Check, L.green], ["待授权/异常", rows.length - connected, AlertTriangle, L.amber]].map(([label, value, Icon, color]) => {
          const I = Icon as typeof Plug;
          return <div key={label as string} className="p-3 rounded-md flex items-center gap-3" style={{ background: L.surface, border: `1px solid ${L.border}` }}><div className="w-9 h-9 rounded-md flex items-center justify-center" style={{ background: `${color}18` }}><I size={16} style={{ color: color as string }} /></div><div><div className="font-semibold" style={{ color: L.text, fontSize: 16 }}>{value as number}</div><div style={{ color: L.muted, fontSize: 9 }}>{label as string}</div></div></div>;
        })}
      </div>

      <div className="flex-1 px-3 py-2 rounded-md flex items-center gap-2" style={{ background: L.surface, border: `1px solid ${L.border}`, flexGrow: 0 }}>
        <Search size={12} style={{ color: L.muted }} />
        <input value={search} onChange={e => setSearch(e.target.value)} className="bg-transparent outline-none flex-1" style={{ color: L.text, fontSize: 10 }} placeholder="搜索项目名、编码或接入类型" />
        {search && <button onClick={() => setSearch("")} title="清除搜索"><X size={11} style={{ color: L.muted }} /></button>}
      </div>

      <section className="flex-1 rounded-md overflow-hidden flex flex-col" style={{ background: L.surface, border: `1px solid ${L.border}` }}>
        <div className="grid grid-cols-[1.2fr_0.9fr_1.3fr_0.9fr_1fr_0.7fr_80px] px-3 py-2.5" style={{ color: L.muted, background: L.surface2, fontSize: 9 }}>
          <span>项目</span><span>接入类型</span><span>接入范围 / 端点</span><span>数据规模</span><span>最近同步</span><span>授权</span><span>操作</span>
        </div>
        <div className="flex-1 overflow-auto" style={{ scrollbarWidth: "none" }}>
          {loading && <div className="py-16 text-center" style={{ color: L.muted, fontSize: 11 }}>加载中…</div>}
          {!loading && error && <div className="py-16 text-center" style={{ color: L.red, fontSize: 11 }}>{error}<button onClick={load} className="ml-2 underline">重试</button></div>}
          {!loading && !error && filtered.length === 0 && (
            <div className="py-20 text-center flex flex-col items-center gap-2">
              <Plug size={26} style={{ color: L.muted, opacity: 0.5 }} />
              <div style={{ color: L.text2, fontSize: 12 }}>{rows.length === 0 ? "暂无接入项目" : "无匹配结果"}</div>
            </div>
          )}
          {!loading && !error && filtered.map(p => (
            <div key={p.id} className="grid grid-cols-[1.2fr_0.9fr_1.3fr_0.9fr_1fr_0.7fr_80px] px-3 py-2.5 items-center" style={{ borderTop: `1px solid ${L.border2}` }}>
              <span className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.accent }} />
                <span className="min-w-0"><span className="block font-medium truncate" style={{ color: L.text, fontSize: 10 }}>{p.name}</span><span className="block mt-0.5 truncate" style={{ color: L.muted, fontSize: 8 }}>{p.code}</span></span>
              </span>
              <span style={{ color: p.api_type ? L.text2 : L.muted, fontSize: 9 }}>{p.api_type ?? "未接入"}</span>
              <span className="min-w-0"><span className="block truncate" style={{ color: L.text2, fontSize: 9 }}>{p.integration_scope ?? "—"}</span><span className="block mt-0.5 truncate font-mono" style={{ color: L.muted, fontSize: 8 }}>{p.endpoint ?? "—"}</span></span>
              <span className="flex items-center gap-1" style={{ color: L.text2, fontSize: 9 }}><Database size={9} style={{ color: L.muted }} />{p.member_count}人 / {p.group_count}群 / {p.account_count}号</span>
              <span style={{ color: L.muted, fontSize: 9 }}>{fmt(p.last_sync_at)}</span>
              <span><span className="px-1.5 py-0.5 rounded" style={{ color: AUTH_COLOR[p.auth_status ?? ""] ?? L.muted, background: L.surface2, fontSize: 8 }}>{p.auth_status ?? "未接入"}</span></span>
              <span><button disabled={!p.api_type || syncing === p.id} onClick={() => doSync(p)} className="px-2 py-1 rounded-md flex items-center gap-1 disabled:opacity-40" style={{ color: L.primary, background: "rgba(67,97,238,0.12)", fontSize: 8 }}><RefreshCw size={9} className={syncing === p.id ? "animate-spin" : ""} />同步</button></span>
            </div>
          ))}
        </div>
      </section>

      {toast && <div className="fixed left-1/2 -translate-x-1/2 bottom-8 z-[60] px-4 py-2 rounded-lg shadow-xl" style={{ background: "rgba(15,23,42,0.96)", color: "white", fontSize: 12, border: `1px solid ${L.border}` }}>{toast}</div>}
    </div>
  );
}
