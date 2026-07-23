import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Building2, MessageCircle, RefreshCw, Search, ShieldCheck, Smartphone, Users, X } from "lucide-react";
import { useProject } from "../contexts/ProjectContext";
import { listAccounts, AccountRow } from "../../api/accounts";
import { ApiError } from "../../api";

const L = {
  bg: "#0d1629", surface: "#131f35", surface2: "#1a2640", border: "rgba(255,255,255,0.075)", border2: "rgba(255,255,255,0.045)",
  text: "#e2e8f0", text2: "#94a3b8", muted: "#64748b", primary: "#4361ee", green: "#34d399", amber: "#fbbf24", red: "#f87171", cyan: "#22d3ee", purple: "#7c3aed",
};

const SYNC_COLOR: Record<string, string> = { 已同步: L.green, 同步失败: L.red, 待同步: L.amber };
const STATUS_COLOR: Record<string, string> = { 正常: L.green, 异常: L.red, 停用: L.muted, 待配置: L.amber };

const fmtDate = (s: string | null) => (s ? String(s).slice(0, 10) : "—");
const custodian = (a: AccountRow) => a.custodian_name ?? a.user_name ?? "—";

/**
 * 微信管理：企微/个微账号（只读真实数据，GET /accounts）。
 * 账号的创建/绑定变更走「账号与人员」的专门流程与审批，本页不放会“假成功”的写操作。
 * 全部字段来自后端账号域——好友数、服务群数、同步状态、归属客服、企业/部门都是真实值；
 * 无数据时显示空态，不再渲染任何演示账号。
 */
export default function WeChatManagement() {
  const { currentProject } = useProject();
  const [rows, setRows] = useState<AccountRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scope, setScope] = useState<"current" | "all">("current");
  const [typeFilter, setTypeFilter] = useState("全部");
  const [search, setSearch] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    listAccounts(scope === "current" ? { projectId: currentProject.id } : {})
      .then(setRows)
      .catch(e => setError(e instanceof ApiError ? e.message : "加载失败"))
      .finally(() => setLoading(false));
  }, [scope, currentProject.id]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => rows.filter(a =>
    (typeFilter === "全部" || a.account_type === typeFilter) &&
    (search === "" || a.name.includes(search) || (a.identifier ?? "").includes(search) ||
      (a.corp_name ?? "").includes(search) || custodian(a).includes(search))),
  [rows, typeFilter, search]);

  const stat = (pred: (a: AccountRow) => boolean) => rows.filter(pred).length;

  return (
    <div className="p-5 h-full flex flex-col gap-3 min-w-[960px]" style={{ background: L.bg }}>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-semibold" style={{ color: L.text, fontSize: 18 }}>微信管理</h1>
          <p className="mt-1" style={{ color: L.muted, fontSize: 11 }}>企微 / 个微账号的归属、好友负载、服务群与同步状态（数据来自后端账号域）</p>
        </div>
        <button onClick={load} className="px-3 py-2 rounded-md flex items-center gap-1.5" style={{ color: L.text2, background: L.surface, border: `1px solid ${L.border}`, fontSize: 11 }}>
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />刷新
        </button>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {[["账号总数", rows.length, Users, L.purple], ["企微", stat(a => a.account_type === "企微"), Building2, L.cyan], ["个微", stat(a => a.account_type === "个微"), Smartphone, L.primary], ["同步异常", stat(a => a.sync_status === "同步失败"), AlertTriangle, L.red]].map(([label, value, Icon, color]) => {
          const I = Icon as typeof Users;
          return <div key={label as string} className="p-3 rounded-md flex items-center gap-3" style={{ background: L.surface, border: `1px solid ${L.border}` }}><div className="w-9 h-9 rounded-md flex items-center justify-center" style={{ background: `${color}18` }}><I size={16} style={{ color: color as string }} /></div><div><div className="font-semibold" style={{ color: L.text, fontSize: 16 }}>{value as number}</div><div style={{ color: L.muted, fontSize: 9 }}>{label as string}</div></div></div>;
        })}
      </div>

      <div className="flex items-center gap-2">
        <div className="flex p-1 rounded-md" style={{ background: L.surface, border: `1px solid ${L.border}` }}>
          <button onClick={() => setScope("current")} className="px-3 py-1.5 rounded" style={{ color: scope === "current" ? L.text : L.muted, background: scope === "current" ? L.surface2 : "transparent", fontSize: 9 }}>当前项目</button>
          <button onClick={() => setScope("all")} className="px-3 py-1.5 rounded" style={{ color: scope === "all" ? L.text : L.muted, background: scope === "all" ? L.surface2 : "transparent", fontSize: 9 }}>全部项目</button>
        </div>
        <div className="flex-1 px-3 py-2 rounded-md flex items-center gap-2" style={{ background: L.surface, border: `1px solid ${L.border}` }}>
          <Search size={12} style={{ color: L.muted }} />
          <input value={search} onChange={e => setSearch(e.target.value)} className="bg-transparent outline-none flex-1" style={{ color: L.text, fontSize: 10 }} placeholder="搜索账号名、微信号、企业或归属客服" />
          {search && <button onClick={() => setSearch("")} title="清除搜索"><X size={11} style={{ color: L.muted }} /></button>}
        </div>
        <div className="relative">
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="appearance-none pl-3 pr-8 py-2 rounded-md outline-none" style={{ color: L.text2, background: L.surface, border: `1px solid ${L.border}`, fontSize: 9 }}>
            <option>全部</option><option>企微</option><option>个微</option>
          </select>
        </div>
      </div>

      <section className="flex-1 rounded-md overflow-hidden flex flex-col" style={{ background: L.surface, border: `1px solid ${L.border}` }}>
        <div className="grid grid-cols-[1.3fr_0.6fr_1fr_1.1fr_0.8fr_0.6fr_0.8fr_0.7fr] px-3 py-2.5" style={{ color: L.muted, background: L.surface2, fontSize: 9 }}>
          <span>账号</span><span>类型</span><span>归属客服</span><span>企业 / 部门</span><span>好友数</span><span>服务群</span><span>同步</span><span>状态</span>
        </div>
        <div className="flex-1 overflow-auto" style={{ scrollbarWidth: "none" }}>
          {loading && <div className="py-16 text-center" style={{ color: L.muted, fontSize: 11 }}>加载中…</div>}
          {!loading && error && <div className="py-16 text-center" style={{ color: L.red, fontSize: 11 }}>{error}<button onClick={load} className="ml-2 underline">重试</button></div>}
          {!loading && !error && filtered.length === 0 && (
            <div className="py-20 text-center flex flex-col items-center gap-2">
              <MessageCircle size={26} style={{ color: L.muted, opacity: 0.5 }} />
              <div style={{ color: L.text2, fontSize: 12 }}>{rows.length === 0 ? "暂无微信账号" : "无匹配结果"}</div>
              <div style={{ color: L.muted, fontSize: 9 }}>{rows.length === 0 ? "在「账号与人员」中录入企微/个微账号后在此展示" : "调整搜索或筛选条件"}</div>
            </div>
          )}
          {!loading && !error && filtered.map(a => {
            const isWecom = a.account_type === "企微";
            return (
              <div key={a.id} className="grid grid-cols-[1.3fr_0.6fr_1fr_1.1fr_0.8fr_0.6fr_0.8fr_0.7fr] px-3 py-2.5 items-center" style={{ borderTop: `1px solid ${L.border2}` }}>
                <span className="flex items-center gap-2 min-w-0">
                  <span className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: isWecom ? "rgba(34,211,238,0.15)" : "rgba(67,97,238,0.15)" }}>
                    {isWecom ? <Building2 size={14} style={{ color: L.cyan }} /> : <Smartphone size={14} style={{ color: L.primary }} />}
                  </span>
                  <span className="min-w-0"><span className="block font-medium truncate" style={{ color: L.text, fontSize: 10 }}>{a.name}</span><span className="block mt-0.5 truncate" style={{ color: L.muted, fontSize: 8 }}>{a.identifier ?? "—"}</span></span>
                </span>
                <span><span className="px-1.5 py-0.5 rounded" style={{ color: isWecom ? L.cyan : L.primary, background: isWecom ? "rgba(34,211,238,0.1)" : "rgba(67,97,238,0.1)", fontSize: 8 }}>{a.account_type}</span></span>
                <span className="truncate flex items-center gap-1" style={{ color: L.text2, fontSize: 9 }}>{custodian(a) !== "—" && <ShieldCheck size={10} style={{ color: L.muted }} />}{custodian(a)}</span>
                <span className="min-w-0"><span className="block truncate" style={{ color: L.text2, fontSize: 9 }}>{a.corp_name ?? "—"}</span><span className="block mt-0.5 truncate" style={{ color: L.muted, fontSize: 8 }}>{a.dept ?? (a.city ?? "—")}</span></span>
                <span style={{ color: L.text2, fontSize: 9 }}>{a.friend_count.toLocaleString()}</span>
                <span style={{ color: L.text2, fontSize: 9 }}>{a.serving_group_count} 个</span>
                <span><span className="px-1.5 py-0.5 rounded" style={{ color: SYNC_COLOR[a.sync_status ?? ""] ?? L.muted, background: L.surface2, fontSize: 8 }}>{a.sync_status ?? "—"}</span></span>
                <span><span className="px-1.5 py-0.5 rounded" style={{ color: STATUS_COLOR[a.status] ?? L.text2, background: L.surface2, fontSize: 8 }}>{a.status}</span></span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
