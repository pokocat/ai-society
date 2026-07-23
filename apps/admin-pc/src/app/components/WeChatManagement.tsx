import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Building2, Check, MessageCircle, Plus, RefreshCw, Search, Settings2, ShieldCheck, Smartphone, Users, X } from "lucide-react";
import { useProject } from "../contexts/ProjectContext";
import {
  listAccounts, createAccount, changeAccountStatus, assignToProject, revokeFromProject, createHandover,
  ACCOUNT_STATUS_TRANSITIONS, AccountRow,
} from "../../api/accounts";
import { listEmployees, EmployeeRow } from "../../api/employees";
import { ApiError } from "../../api";

const L = {
  bg: "#0d1629", surface: "#131f35", surface2: "#1a2640", border: "rgba(255,255,255,0.075)", border2: "rgba(255,255,255,0.045)",
  text: "#e2e8f0", text2: "#94a3b8", muted: "#64748b", primary: "#4361ee", green: "#34d399", amber: "#fbbf24", red: "#f87171", cyan: "#22d3ee", purple: "#7c3aed",
};

const SYNC_COLOR: Record<string, string> = { 已同步: L.green, 同步失败: L.red, 待同步: L.amber };
// 真实账号九态（与 ACCOUNT_STATUS_TRANSITIONS 一致）
const STATUS_COLOR: Record<string, string> = {
  库存: L.muted, 待激活: L.amber, 可用: L.green, 使用中: L.cyan, 风险: L.red,
  冻结: L.amber, 待交接: L.purple, 已停用: L.muted, 已归档: L.muted,
};
const WECHAT_TYPES = ["个人微信", "企业微信"];
const TYPE_SHORT: Record<string, string> = { 企业微信: "企微", 个人微信: "个微" };
const custodian = (a: AccountRow) => a.custodian_name ?? a.user_name ?? "—";

/**
 * 微信管理：企微/个微账号（真实数据 GET /accounts + 完整管理写操作）。
 * 写操作全部走后端真实接口（均带 @Perm 鉴权、状态机校验、交接走审批）：
 *   新建账号 createAccount / 状态流转 changeAccountStatus（后端强制 ACCOUNT_STATUS_TRANSITIONS）/
 *   项目授权 assignToProject·撤销 revokeFromProject / 客服交接 createHandover（走审批单）。
 * 无假成功：所有 toast 均在 await 接口成功后触发，失败走 catch 显示真实错误。
 */
export default function WeChatManagement() {
  const { currentProject, projects } = useProject();
  const [rows, setRows] = useState<AccountRow[]>([]);
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scope, setScope] = useState<"current" | "all">("current");
  const [typeFilter, setTypeFilter] = useState("全部");
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState<{ msg: string; err?: boolean } | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [manageRow, setManageRow] = useState<AccountRow | null>(null);

  const flash = (msg: string, err = false) => { setToast({ msg, err }); window.setTimeout(() => setToast(null), 2200); };

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    listAccounts(scope === "current" ? { projectId: currentProject.id } : {})
      .then(setRows)
      .catch(e => setError(e instanceof ApiError ? e.message : "加载失败"))
      .finally(() => setLoading(false));
  }, [scope, currentProject.id]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { listEmployees().then(setEmployees).catch(() => {}); }, []);

  // 管理面板打开时，用最新 rows 里的同 id 记录刷新（操作后即时反映）
  const manage = manageRow ? (rows.find(r => r.id === manageRow.id) ?? manageRow) : null;

  const base = useMemo(() => rows.filter(a => WECHAT_TYPES.includes(a.account_type)), [rows]);
  const filtered = useMemo(() => base.filter(a =>
    (typeFilter === "全部" || a.account_type === typeFilter) &&
    (search === "" || a.name.includes(search) || (a.identifier ?? "").includes(search) ||
      (a.corp_name ?? "").includes(search) || custodian(a).includes(search))),
  [base, typeFilter, search]);

  const stat = (pred: (a: AccountRow) => boolean) => base.filter(pred).length;

  return (
    <div className="p-5 h-full flex flex-col gap-3 min-w-[960px]" style={{ background: L.bg }}>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-semibold" style={{ color: L.text, fontSize: 18 }}>微信管理</h1>
          <p className="mt-1" style={{ color: L.muted, fontSize: 11 }}>企微 / 个微账号的归属、好友负载、服务群、同步状态与生命周期管理（数据+操作均走后端账号域）</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="px-3 py-2 rounded-md flex items-center gap-1.5" style={{ color: L.text2, background: L.surface, border: `1px solid ${L.border}`, fontSize: 11 }}>
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />刷新
          </button>
          <button onClick={() => setCreateOpen(true)} className="px-3 py-2 rounded-md flex items-center gap-1.5" style={{ color: "white", background: L.primary, fontSize: 11 }}>
            <Plus size={13} />新建账号
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {[["微信账号", base.length, Users, L.purple], ["企微", stat(a => a.account_type === "企业微信"), Building2, L.cyan], ["个微", stat(a => a.account_type === "个人微信"), Smartphone, L.primary], ["同步异常", stat(a => a.sync_status === "同步失败"), AlertTriangle, L.red]].map(([label, value, Icon, color]) => {
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
            <option value="全部">全部</option><option value="企业微信">企微</option><option value="个人微信">个微</option>
          </select>
        </div>
      </div>

      <section className="flex-1 rounded-md overflow-hidden flex flex-col" style={{ background: L.surface, border: `1px solid ${L.border}` }}>
        <div className="grid grid-cols-[1.3fr_0.6fr_1fr_1fr_0.7fr_0.6fr_0.7fr_0.7fr_64px] px-3 py-2.5" style={{ color: L.muted, background: L.surface2, fontSize: 9 }}>
          <span>账号</span><span>类型</span><span>归属客服</span><span>企业 / 部门</span><span>好友数</span><span>服务群</span><span>同步</span><span>状态</span><span>操作</span>
        </div>
        <div className="flex-1 overflow-auto" style={{ scrollbarWidth: "none" }}>
          {loading && <div className="py-16 text-center" style={{ color: L.muted, fontSize: 11 }}>加载中…</div>}
          {!loading && error && <div className="py-16 text-center" style={{ color: L.red, fontSize: 11 }}>{error}<button onClick={load} className="ml-2 underline">重试</button></div>}
          {!loading && !error && filtered.length === 0 && (
            <div className="py-20 text-center flex flex-col items-center gap-2">
              <MessageCircle size={26} style={{ color: L.muted, opacity: 0.5 }} />
              <div style={{ color: L.text2, fontSize: 12 }}>{rows.length === 0 ? "暂无微信账号" : "无匹配结果"}</div>
              <div style={{ color: L.muted, fontSize: 9 }}>{rows.length === 0 ? "点右上角「新建账号」录入企微/个微账号" : "调整搜索或筛选条件"}</div>
            </div>
          )}
          {!loading && !error && filtered.map(a => {
            const isWecom = a.account_type === "企业微信";
            return (
              <div key={a.id} className="grid grid-cols-[1.3fr_0.6fr_1fr_1fr_0.7fr_0.6fr_0.7fr_0.7fr_64px] px-3 py-2.5 items-center" style={{ borderTop: `1px solid ${L.border2}` }}>
                <span className="flex items-center gap-2 min-w-0">
                  <span className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: isWecom ? "rgba(34,211,238,0.15)" : "rgba(67,97,238,0.15)" }}>
                    {isWecom ? <Building2 size={14} style={{ color: L.cyan }} /> : <Smartphone size={14} style={{ color: L.primary }} />}
                  </span>
                  <span className="min-w-0"><span className="block font-medium truncate" style={{ color: L.text, fontSize: 10 }}>{a.name}</span><span className="block mt-0.5 truncate" style={{ color: L.muted, fontSize: 8 }}>{a.identifier ?? "—"}</span></span>
                </span>
                <span><span className="px-1.5 py-0.5 rounded" style={{ color: isWecom ? L.cyan : L.primary, background: isWecom ? "rgba(34,211,238,0.1)" : "rgba(67,97,238,0.1)", fontSize: 8 }}>{TYPE_SHORT[a.account_type] ?? a.account_type}</span></span>
                <span className="truncate flex items-center gap-1" style={{ color: L.text2, fontSize: 9 }}>{custodian(a) !== "—" && <ShieldCheck size={10} style={{ color: L.muted }} />}{custodian(a)}</span>
                <span className="min-w-0"><span className="block truncate" style={{ color: L.text2, fontSize: 9 }}>{a.corp_name ?? "—"}</span><span className="block mt-0.5 truncate" style={{ color: L.muted, fontSize: 8 }}>{a.dept ?? (a.city ?? "—")}</span></span>
                <span style={{ color: L.text2, fontSize: 9 }}>{a.friend_count.toLocaleString()}</span>
                <span style={{ color: L.text2, fontSize: 9 }}>{a.serving_group_count} 个</span>
                <span><span className="px-1.5 py-0.5 rounded" style={{ color: SYNC_COLOR[a.sync_status ?? ""] ?? L.muted, background: L.surface2, fontSize: 8 }}>{a.sync_status ?? "—"}</span></span>
                <span><span className="px-1.5 py-0.5 rounded" style={{ color: STATUS_COLOR[a.status] ?? L.text2, background: L.surface2, fontSize: 8 }}>{a.status}</span></span>
                <span><button onClick={() => setManageRow(a)} className="px-2 py-1 rounded-md flex items-center gap-1" style={{ color: L.primary, background: "rgba(67,97,238,0.12)", fontSize: 8 }}><Settings2 size={10} />管理</button></span>
              </div>
            );
          })}
        </div>
      </section>

      {createOpen && (
        <CreateAccountModal
          onClose={() => setCreateOpen(false)}
          onDone={(msg) => { setCreateOpen(false); flash(msg); load(); }}
          onErr={(m) => flash(m, true)}
        />
      )}

      {manage && (
        <ManagePanel
          account={manage}
          projects={projects}
          employees={employees}
          onClose={() => setManageRow(null)}
          onDone={(msg) => { flash(msg); load(); }}
          onErr={(m) => flash(m, true)}
        />
      )}

      {toast && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-8 z-[60] px-4 py-2 rounded-lg shadow-xl" style={{ background: toast.err ? "rgba(239,68,68,0.95)" : "rgba(15,23,42,0.96)", color: "white", fontSize: 12, border: `1px solid ${toast.err ? "rgba(239,68,68,0.4)" : L.border}` }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

// ─── 新建账号 ───────────────────────────────────────────────
function CreateAccountModal({ onClose, onDone, onErr }: { onClose: () => void; onDone: (msg: string) => void; onErr: (m: string) => void }) {
  const [f, setF] = useState({ id: "", accountType: "企业微信", name: "", identifier: "", phone: "", region: "", city: "" });
  const [busy, setBusy] = useState(false);
  const valid = f.id.trim() && f.name.trim();
  const submit = async () => {
    if (!valid || busy) return;
    setBusy(true);
    try {
      await createAccount({ id: f.id.trim(), accountType: f.accountType, name: f.name.trim(), identifier: f.identifier || undefined, phone: f.phone || undefined, region: f.region || undefined, city: f.city || undefined });
      onDone(`账号「${f.name}」已创建`);
    } catch (e) {
      onErr(e instanceof ApiError ? e.message : "创建失败");
    } finally { setBusy(false); }
  };
  const field = (k: keyof typeof f, label: string, ph = "") => (
    <label><span style={{ color: L.text2, fontSize: 10 }}>{label}</span>
      <input value={f[k]} onChange={e => setF({ ...f, [k]: e.target.value })} placeholder={ph} className="mt-1.5 w-full px-3 py-2 rounded-md outline-none" style={{ color: L.text, background: L.surface2, border: `1px solid ${L.border}`, fontSize: 10 }} />
    </label>
  );
  return (
    <Modal title="新建微信账号" sub="录入企微/个微账号，创建后可分配项目、绑定客服、发起交接" onClose={onClose}>
      <div className="p-4 grid grid-cols-2 gap-3">
        <label><span style={{ color: L.text2, fontSize: 10 }}>账号类型</span>
          <select value={f.accountType} onChange={e => setF({ ...f, accountType: e.target.value })} className="mt-1.5 w-full px-3 py-2 rounded-md outline-none" style={{ color: L.text, background: L.surface2, border: `1px solid ${L.border}`, fontSize: 10 }}>
            <option value="企业微信">企业微信（企微）</option><option value="个人微信">个人微信（个微）</option>
          </select>
        </label>
        {field("id", "账号 ID *", "唯一标识，如 wecom_bj_01")}
        {field("name", "账号名称 *", "对内显示名")}
        {field("identifier", "微信号 / 企微 ID")}
        {field("phone", "绑定手机号")}
        {field("region", "大区")}
        {field("city", "城市")}
      </div>
      <div className="px-4 py-3 flex justify-end gap-2" style={{ borderTop: `1px solid ${L.border}` }}>
        <button onClick={onClose} className="px-3 py-2 rounded-md" style={{ color: L.text2, background: L.surface2, fontSize: 10 }}>取消</button>
        <button onClick={submit} disabled={!valid || busy} className="px-3 py-2 rounded-md flex items-center gap-1.5 disabled:opacity-40" style={{ color: "white", background: L.primary, fontSize: 10 }}><Check size={12} />{busy ? "创建中…" : "创建账号"}</button>
      </div>
    </Modal>
  );
}

// ─── 行内管理面板：状态流转 / 项目授权 / 客服交接 ──────────────
function ManagePanel({ account, projects, employees, onClose, onDone, onErr }: {
  account: AccountRow; projects: { id: string; name: string; shortName: string; accent: string }[]; employees: EmployeeRow[];
  onClose: () => void; onDone: (msg: string) => void; onErr: (m: string) => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [handoverTo, setHandoverTo] = useState<number | "">("");
  const transitions = ACCOUNT_STATUS_TRANSITIONS[account.status] ?? [];

  const run = async (key: string, fn: () => Promise<unknown>, msg: string) => {
    if (busy) return;
    setBusy(key);
    try { await fn(); onDone(msg); } catch (e) { onErr(e instanceof ApiError ? e.message : "操作失败"); } finally { setBusy(null); }
  };

  return (
    <Modal title={`管理账号 · ${account.name}`} sub={`${account.account_type} · ${account.identifier ?? "—"} · 当前状态 ${account.status}`} onClose={onClose} wide>
      <div className="p-4 space-y-4" style={{ maxHeight: "70vh", overflow: "auto" }}>
        {/* 状态流转 */}
        <Block title="状态流转" desc="按后端状态机执行；变更留审计。填写原因（选填）">
          <input value={reason} onChange={e => setReason(e.target.value)} placeholder="变更原因（选填）" className="w-full px-3 py-2 rounded-md outline-none mb-2" style={{ color: L.text, background: L.surface2, border: `1px solid ${L.border}`, fontSize: 10 }} />
          <div className="flex flex-wrap gap-2">
            {transitions.length === 0 && <span style={{ color: L.muted, fontSize: 10 }}>当前状态「{account.status}」无可用流转</span>}
            {transitions.map(to => (
              <button key={to} disabled={!!busy} onClick={() => run("st-" + to, () => changeAccountStatus(account.id, to, reason), `已置为「${to}」`)}
                className="px-3 py-1.5 rounded-md disabled:opacity-40" style={{ color: STATUS_COLOR[to] ?? L.text, background: L.surface2, border: `1px solid ${L.border}`, fontSize: 10 }}>
                → {to}
              </button>
            ))}
          </div>
        </Block>

        {/* 项目授权 */}
        <Block title="项目授权" desc="控制该账号可服务哪些项目">
          <div className="flex flex-wrap gap-2">
            {projects.map(p => {
              const on = account.project_ids.includes(p.id);
              return (
                <button key={p.id} disabled={!!busy}
                  onClick={() => on
                    ? run("rv-" + p.id, () => revokeFromProject(account.id, p.id), `已撤销「${p.shortName}」授权`)
                    : run("as-" + p.id, () => assignToProject(account.id, p.id), `已授权「${p.shortName}」`)}
                  className="px-3 py-1.5 rounded-md flex items-center gap-1.5 disabled:opacity-40"
                  style={{ color: on ? p.accent : L.muted, background: on ? `${p.accent}18` : L.surface2, border: `1px solid ${on ? `${p.accent}45` : L.border}`, fontSize: 10 }}>
                  {on ? <Check size={11} /> : <Plus size={11} />}{p.shortName}
                </button>
              );
            })}
          </div>
        </Block>

        {/* 客服交接 */}
        <Block title="客服交接" desc="将账号交接给另一名员工——发起后走审批单，账号即刻置「待交接」，审批通过后归属变更">
          <div className="flex items-center gap-2">
            <select value={handoverTo} onChange={e => setHandoverTo(e.target.value ? Number(e.target.value) : "")} className="flex-1 px-3 py-2 rounded-md outline-none" style={{ color: L.text, background: L.surface2, border: `1px solid ${L.border}`, fontSize: 10 }}>
              <option value="">选择接手员工…</option>
              {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}（{emp.emp_no}{emp.department ? " · " + emp.department : ""}）</option>)}
            </select>
            <button disabled={!handoverTo || !!busy} onClick={() => run("ho", () => createHandover(account.id, Number(handoverTo), reason), "交接已发起（待审批）")}
              className="px-3 py-2 rounded-md disabled:opacity-40" style={{ color: "white", background: L.purple, fontSize: 10 }}>
              发起交接
            </button>
          </div>
          {employees.length === 0 && <div className="mt-1.5" style={{ color: L.muted, fontSize: 9 }}>暂无员工，先到「账号与人员」录入员工</div>}
        </Block>
      </div>
      <div className="px-4 py-3 flex justify-end" style={{ borderTop: `1px solid ${L.border}` }}>
        <button onClick={onClose} className="px-3 py-2 rounded-md" style={{ color: L.text2, background: L.surface2, fontSize: 10 }}>完成</button>
      </div>
    </Modal>
  );
}

function Block({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md p-3" style={{ background: L.bg, border: `1px solid ${L.border}` }}>
      <div className="mb-2"><div style={{ color: L.text, fontSize: 12, fontWeight: 600 }}>{title}</div><div style={{ color: L.muted, fontSize: 9, marginTop: 2 }}>{desc}</div></div>
      {children}
    </div>
  );
}

function Modal({ title, sub, onClose, wide, children }: { title: string; sub: string; onClose: () => void; wide?: boolean; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(2,6,23,0.72)" }} onClick={onClose}>
      <div className="rounded-lg overflow-hidden shadow-2xl" style={{ width: wide ? 560 : 500, background: L.surface, border: `1px solid ${L.border}` }} onClick={e => e.stopPropagation()}>
        <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: `1px solid ${L.border}` }}>
          <div><h2 className="font-semibold" style={{ color: L.text, fontSize: 14 }}>{title}</h2><p className="mt-1" style={{ color: L.muted, fontSize: 9 }}>{sub}</p></div>
          <button onClick={onClose} title="关闭" className="w-7 h-7 rounded-md flex items-center justify-center" style={{ background: L.surface2 }}><X size={14} style={{ color: L.muted }} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
