import { useState, useEffect, useCallback } from "react";
import { Search, Plus, AlertTriangle, X, Phone, Mail, MessageCircle, Globe, ChevronDown, Filter, ExternalLink, Upload, CreditCard, Eye, EyeOff, CheckCircle, Loader2, Check, ArrowLeftRight } from "lucide-react";
import { accountsApi, employeesApi, ApiError } from "../../api";
import type { AccountRow } from "../../api/accounts";
import type { EmployeeRow } from "../../api/employees";

const S = { surface: "#ffffff", border: "rgba(5,8,5,0.14)", borderLight: "rgba(5,8,5,0.1)", muted: "#68705a", bg: "#ffffff", primary: "#b6ff00", primaryBg: "rgba(182,255,0,0.24)", text: "#050805", textSec: "#2f3a29", surface2: "#f7ffd9" };

// UI 沿用「异常」文案（后端状态机为「风险」，标红一致）
const displayStatus = (s: string) => (s === "风险" ? "异常" : s);
const riskOf = (status: string): "high" | "warning" | "normal" =>
  status === "风险" || status === "异常" ? "high" : status === "待交接" ? "warning" : "normal";

type Notify = (text: string, kind?: "success" | "error") => void;

/** 详情面板通用：状态流转（合法迁移下拉）+ 发起交接（审批协同）。样式贴合深色详情面板。 */
function AccountActions({ account, employees, onReload, notify }: {
  account: AccountRow;
  employees: EmployeeRow[];
  onReload: () => void;
  notify: Notify;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [handoverOpen, setHandoverOpen] = useState(false);
  const [toEmp, setToEmp] = useState("");
  const [reason, setReason] = useState("");
  const legal = accountsApi.ACCOUNT_STATUS_TRANSITIONS[account.status] ?? [];
  const inp = { background: "#1a2640", border: "1px solid rgba(99,102,241,0.15)", color: "#e2e8f0" };

  const changeStatus = async (target: string) => {
    setBusy(true); setErr(""); setMenuOpen(false);
    try {
      await accountsApi.changeAccountStatus(account.id, target, "手动流转");
      notify(`状态已更新为「${displayStatus(target)}」`);
      onReload();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "状态流转失败（可能为非法迁移）");
    } finally { setBusy(false); }
  };

  const submitHandover = async () => {
    if (!toEmp) { setErr("请选择交接对象"); return; }
    setBusy(true); setErr("");
    try {
      const r = await accountsApi.createHandover(account.id, Number(toEmp), reason.trim() || "发起交接");
      notify(`已提交交接审批 #${r.approvalId}`);
      setHandoverOpen(false); setToEmp(""); setReason("");
      onReload();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "发起交接失败");
    } finally { setBusy(false); }
  };

  return (
    <div className="flex flex-col gap-2">
      {err && <div className="text-xs px-2 py-1.5 rounded-lg" style={{ background: "rgba(239,68,68,0.1)", color: "#fca5a5" }}>{err}</div>}

      {/* 状态流转（合法迁移菜单） */}
      <div className="relative">
        <button disabled={busy} onClick={() => setMenuOpen(o => !o)}
          className="w-full py-2 rounded-lg text-xs flex items-center justify-center gap-1.5 disabled:opacity-60"
          style={{ background: "rgba(99,102,241,0.08)", color: "#4361ee" }}>
          {busy ? <Loader2 size={12} className="animate-spin" /> : <ArrowLeftRight size={12} />} 状态流转
          <span style={{ color: S.muted }}>· 当前 {displayStatus(account.status)}</span>
        </button>
        {menuOpen && (
          <div className="absolute left-0 right-0 bottom-full mb-1 z-30 rounded-lg overflow-hidden shadow-2xl" style={{ background: "#131f35", border: "1px solid rgba(99,102,241,0.25)" }}>
            {legal.length === 0 ? (
              <div className="px-3 py-2 text-xs" style={{ color: S.muted }}>无可用流转</div>
            ) : legal.map(target => (
              <button key={target} onClick={() => changeStatus(target)}
                className="w-full px-3 py-2 text-left text-xs flex items-center justify-between hover:opacity-90"
                style={{ color: "#e2e8f0", borderBottom: "1px solid rgba(99,102,241,0.1)" }}>
                <span>{displayStatus(target)}</span>
                <ChevronDown size={11} style={{ color: S.muted, transform: "rotate(-90deg)" }} />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 发起交接（走审批） */}
      {!handoverOpen ? (
        <button disabled={busy} onClick={() => { setHandoverOpen(true); setErr(""); }}
          className="w-full py-2 rounded-lg text-xs disabled:opacity-60" style={{ background: "rgba(245,158,11,0.15)", color: "#fbbf24" }}>
          发起交接
        </button>
      ) : (
        <div className="rounded-lg p-2.5 flex flex-col gap-2" style={{ background: "#1a2640", border: "1px solid rgba(99,102,241,0.15)" }}>
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: "#4361ee" }}>发起账号交接</span>
            <X size={12} style={{ color: S.muted, cursor: "pointer" }} onClick={() => setHandoverOpen(false)} />
          </div>
          <select className="w-full px-2 py-1.5 rounded-md text-xs outline-none" style={inp} value={toEmp} onChange={e => setToEmp(e.target.value)}>
            <option value="" style={{ background: "#131f35" }}>选择交接对象…</option>
            {employees.map(emp => <option key={emp.id} value={emp.id} style={{ background: "#131f35" }}>{emp.name}（{emp.job_role}）</option>)}
          </select>
          <input className="w-full px-2 py-1.5 rounded-md text-xs outline-none" style={inp} placeholder="交接原因（必填审批依据）" value={reason} onChange={e => setReason(e.target.value)} />
          <button disabled={busy} onClick={submitHandover} className="w-full py-1.5 rounded-md text-xs text-white flex items-center justify-center gap-1.5 disabled:opacity-60" style={{ background: "linear-gradient(135deg, #4361ee, #3451d1)" }}>
            {busy ? <Loader2 size={12} className="animate-spin" /> : null} 提交交接审批
          </button>
        </div>
      )}
    </div>
  );
}

interface TabProps {
  search: string;
  accounts: AccountRow[];
  employees: EmployeeRow[];
  onReload: () => void;
  notify: Notify;
}

// ─── 后端 AccountRow → 各 Tab 展示行（mock 专有字段无后端来源→占位 "—"，不臆造） ───
const isoDay = (iso: string | null) => (iso ? new Date(iso).toISOString().slice(0, 10) : "—");

interface PhoneRow {
  id: string; number: string; carrier: string; region: string; idOwner: string; idNumber: string;
  // 证件上传状态无后端字段：null=未登记（不臆造成确定的「未上传」红态）
  idFront: boolean | null; idBack: boolean | null; assignedTo: string; assignedProject: string; registrations: string[];
  manager: string; status: string; risk: string; note: string;
}
function toPhoneRow(a: AccountRow): PhoneRow {
  return {
    id: a.id,
    number: a.phone ?? a.identifier ?? a.name,
    carrier: "—",                                   // 运营商：无后端来源
    region: a.region ?? a.city ?? "—",
    idOwner: "—",                                   // 身份证信息：无后端来源
    idNumber: "—",
    idFront: null, idBack: null,                    // 证件：无后端来源 → 未登记
    assignedTo: a.user_name ?? "—",
    assignedProject: a.project_ids?.[0] ?? "—",
    registrations: [],                              // 关联注册账号：无后端来源
    manager: a.custodian_name ?? a.user_name ?? "—",
    status: displayStatus(a.status),
    risk: riskOf(a.status),
    note: a.risk_note ?? "",
  };
}

interface WechatRow {
  id: string; wechatId: string; boundPhone: string; friendCount: number; groupCount: number;
  groups: string[]; manager: string; project: string; status: string; risk: string; lastLogin: string; accountType: string;
}
function toWechatRow(a: AccountRow): WechatRow {
  return {
    id: a.id,
    wechatId: a.identifier ?? a.name,
    boundPhone: a.phone ?? "—（未绑定手机）",
    friendCount: a.friend_count,
    groupCount: a.serving_group_count,
    groups: [],                                     // 群名单：需下钻，列表不展开
    manager: a.custodian_name ?? a.user_name ?? "—",
    project: a.project_ids?.[0] ?? "—",
    status: displayStatus(a.status),
    risk: riskOf(a.status),
    lastLogin: isoDay(a.last_login_at),
    accountType: a.account_type,
  };
}

const MEDIA_STYLE: Record<string, { emoji: string; color: string; colorBg: string }> = {
  "小红书": { emoji: "📕", color: "#ef4444", colorBg: "rgba(239,68,68,0.1)" },
  "抖音":   { emoji: "🎵", color: "#ec4899", colorBg: "rgba(236,72,153,0.1)" },
  "公众号": { emoji: "📢", color: "#10b981", colorBg: "rgba(16,185,129,0.1)" },
  "视频号": { emoji: "🎬", color: "#6366f1", colorBg: "rgba(99,102,241,0.1)" },
  "微博":   { emoji: "🐦", color: "#f59e0b", colorBg: "rgba(245,158,11,0.1)" },
  "B站":    { emoji: "📺", color: "#60a5fa", colorBg: "rgba(96,165,250,0.1)" },
  "知乎":   { emoji: "🔵", color: "#3b82f6", colorBg: "rgba(59,130,246,0.1)" },
};
const DEFAULT_MEDIA_STYLE = { emoji: "📱", color: "#6366f1", colorBg: "rgba(99,102,241,0.1)" };
function mediaPlatform(a: AccountRow): string {
  for (const key of Object.keys(MEDIA_STYLE)) if (a.name.includes(key)) return key;
  const hay = `${a.name} ${a.identifier ?? ""}`.toLowerCase();
  if (hay.includes("xhs") || hay.includes("redbook")) return "小红书";
  if (hay.includes("douyin")) return "抖音";
  return "媒体账号";
}

interface MediaItem {
  id: string; group: string; platform: string; emoji: string; color: string; colorBg: string;
  name: string; verified: boolean; loginType: string; loginId: string; pwdStore: string;
  followers: string; contentCount: string; lastPost: string; engagement: string;
  manager: string; status: string; risk: string; note: string; tags: string[];
}
function toMediaItem(a: AccountRow): MediaItem {
  const platform = mediaPlatform(a);
  const st = MEDIA_STYLE[platform] ?? DEFAULT_MEDIA_STYLE;
  return {
    id: a.id, group: "内容平台", platform, emoji: st.emoji, color: st.color, colorBg: st.colorBg,
    name: a.name, verified: a.real_name_verified,
    // 粉丝/内容/互动率/登录凭证：无后端来源→占位 "—"
    loginType: "—", loginId: a.identifier ?? "—", pwdStore: "—",
    followers: "—", contentCount: "—", lastPost: isoDay(a.last_login_at), engagement: "—",
    manager: a.custodian_name ?? a.user_name ?? "—", status: displayStatus(a.status), risk: riskOf(a.status),
    note: a.risk_note ?? "", tags: [],
  };
}

interface EmailRow { id: string; type: string; identifier: string; usedFor: string; manager: string; status: string; risk: string; }
function toEmailRow(a: AccountRow): EmailRow {
  return {
    id: a.id, type: a.account_type, identifier: a.identifier ?? a.name, usedFor: a.risk_note ?? "—",
    manager: a.custodian_name ?? a.user_name ?? "—", status: displayStatus(a.status), risk: riskOf(a.status),
  };
}

const MAIN_TYPES = ["手机号", "个人微信", "企业微信", "媒体账号"];

// ─── 工具 ────────────────────────────────────────────────────
const statusStyle: Record<string, { bg: string; color: string }> = {
  "使用中": { bg: "rgba(34,197,94,0.16)", color: "#047a32" },
  "空闲":   { bg: "#f7ffd9", color: "#050805" },
  "异常":   { bg: "rgba(255,77,79,0.14)", color: "#d92d20" },
  "待交接": { bg: "rgba(242,182,0,0.18)", color: "#9a6b00" },
  "库存":   { bg: "rgba(5,8,5,0.08)", color: "#2f3a29" },
};

// 账号状态筛选可选值：对齐后端真实状态机（displayStatus 把「风险」显示为「异常」），不含「空闲」等后端不存在的词；
// 下拉再按当前数据实际出现的状态收敛，确保每个选项都能筛出结果。
const STATUS_FILTER_ORDER = ["可用", "使用中", "异常", "待交接", "冻结", "待激活", "库存", "已停用", "已归档"];

const platformIcon: Record<string, string> = {
  "公众号": "📢", "视频号": "🎬", "抖音": "🎵", "小红书": "📕", "微博": "🐦", "B站": "📺",
};

function StatusBadge({ status }: { status: string }) {
  const s = statusStyle[status] || { bg: "rgba(182,255,0,0.22)", color: "#050805" };
  return (
    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs w-fit font-medium" style={{ background: s.bg, color: s.color }}>
      <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: s.color }} />
      {status}
    </span>
  );
}

function RiskIcon({ risk }: { risk: string }) {
  if (risk === "high") return <AlertTriangle size={12} style={{ color: "#ef4444" }} />;
  if (risk === "warning") return <AlertTriangle size={12} style={{ color: "#f59e0b" }} />;
  return null;
}

function Row({ children, selected, onClick }: { children: React.ReactNode; selected: boolean; onClick: () => void }) {
  return (
    <div
      className="flex items-center px-4 py-2.5 cursor-pointer transition-all gap-4"
      style={{ background: selected ? S.primaryBg : "transparent", borderBottom: `1px solid ${S.borderLight}`, borderLeft: selected ? `2px solid ${S.primary}` : "2px solid transparent" }}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

function ColHead({ children, width }: { children: React.ReactNode; width: string }) {
  return <div className="flex-shrink-0 text-xs font-medium" style={{ color: S.muted, width }}>{children}</div>;
}

function Col({ children, width, highlight }: { children: React.ReactNode; width: string; highlight?: boolean }) {
  return <div className="flex-shrink-0 text-xs" style={{ width, color: highlight ? S.text : S.textSec }}>{children}</div>;
}

// ─── 总览 Tab ────────────────────────────────────────────────
interface OverviewRow { id: string; type: string; identifier: string; detail: string; manager: string; status: string; risk: string; }
function toOverviewRow(a: AccountRow): OverviewRow {
  let detail: string;
  if (a.account_type === "手机号") detail = a.region ?? a.city ?? "—";
  else if (a.account_type.includes("微信")) detail = `好友 ${a.friend_count} · 承接 ${a.serving_group_count} 群`;
  else detail = a.identifier ?? a.region ?? "—";
  return {
    id: a.id, type: a.account_type, identifier: a.identifier ?? a.name,
    detail, manager: a.custodian_name ?? a.user_name ?? "—",
    status: displayStatus(a.status), risk: riskOf(a.status),
  };
}

const typeColors: Record<string, { bg: string; color: string }> = {
  "手机号":   { bg: "#ecffc4", color: "#050805" },
  "微信号":   { bg: "rgba(34,197,94,0.14)", color: "#047a32" },
  "个人微信": { bg: "rgba(34,197,94,0.14)", color: "#047a32" },
  "企业微信": { bg: "rgba(34,197,94,0.14)", color: "#047a32" },
  "媒体账号": { bg: "#f7ffd9", color: "#050805" },
  "公众号":   { bg: "#f7ffd9", color: "#050805" },
  "视频号":   { bg: "#f7ffd9", color: "#050805" },
  "抖音":     { bg: "#f7ffd9", color: "#050805" },
  "小红书":   { bg: "#f7ffd9", color: "#050805" },
  "邮箱":     { bg: "#f7ffd9", color: "#050805" },
  "苹果ID":   { bg: "rgba(5,8,5,0.08)", color: "#050805" },
  "云账号":   { bg: "rgba(242,182,0,0.18)", color: "#9a6b00" },
};

function OverviewTab({ search, accounts, employees, onReload, notify }: TabProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const rows = accounts.map(toOverviewRow);
  const filtered = rows.filter(a =>
    a.identifier.toLowerCase().includes(search.toLowerCase()) ||
    a.manager.includes(search) || a.type.includes(search)
  );
  const detail = rows.find(a => a.id === selected);
  const detailAccount = accounts.find(a => a.id === selected);

  return (
    <div className="flex gap-4 flex-1 min-h-0">
      <div className="flex-1 rounded-xl overflow-hidden flex flex-col" style={{ background: S.surface, border: `1px solid ${S.border}` }}>
        <div className="flex items-center px-4 py-2.5 gap-4 flex-shrink-0" style={{ background: S.surface2, borderBottom: `1px solid ${S.border}` }}>
          <ColHead width="80px">类型</ColHead>
          <ColHead width="200px">账号标识</ColHead>
          <ColHead width="220px">详情</ColHead>
          <ColHead width="100px">保管人</ColHead>
          <ColHead width="80px">状态</ColHead>
          <ColHead width="40px">风险</ColHead>
        </div>
        <div className="overflow-auto flex-1">
          {filtered.map(a => {
            const tc = typeColors[a.type] || { bg: "#f7ffd9", color: "#050805" };
            return (
              <Row key={a.id} selected={selected === a.id} onClick={() => setSelected(selected === a.id ? null : a.id)}>
                <span className="flex-shrink-0 px-2 py-0.5 rounded-full text-xs" style={{ background: tc.bg, color: tc.color, width: "80px" }}>{a.type}</span>
                <Col width="200px" highlight><div className="flex items-center gap-1"><RiskIcon risk={a.risk} />{a.identifier}</div></Col>
                <Col width="220px">{a.detail}</Col>
                <Col width="100px">{a.manager}</Col>
                <div style={{ width: "80px" }}><StatusBadge status={a.status} /></div>
                <Col width="40px">{a.risk !== "normal" && <RiskIcon risk={a.risk} />}</Col>
              </Row>
            );
          })}
        </div>
      </div>

      {detail && (
        <div className="w-64 flex-shrink-0 rounded-xl p-4 flex flex-col gap-3" style={{ background: S.surface, border: `1px solid ${S.border}` }}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium" style={{ color: S.text }}>账号详情</span>
            <button onClick={() => setSelected(null)}><X size={13} style={{ color: S.muted }} /></button>
          </div>
          <div className="py-3 rounded-xl text-center" style={{ background: "rgba(99,102,241,0.06)" }}>
            <div className="text-2xl mb-1">{platformIcon[detail.type] || "📱"}</div>
            <div className="text-sm font-semibold" style={{ color: S.text }}>{detail.identifier}</div>
            <div className="text-xs mt-1" style={{ color: S.muted }}>{detail.type}</div>
            <div className="mt-2"><StatusBadge status={detail.status} /></div>
          </div>
          {[["保管人", detail.manager], ["详情", detail.detail]].map(([k, v]) => (
            <div key={k} className="flex justify-between py-1.5" style={{ borderBottom: `1px solid ${S.border}` }}>
              <span className="text-xs" style={{ color: S.muted }}>{k}</span>
              <span className="text-xs text-right max-w-[140px]" style={{ color: S.text }}>{v}</span>
            </div>
          ))}
          <div className="flex flex-col gap-2 mt-2">
            <button disabled title="M2 接线" className="w-full py-2 rounded-lg text-xs text-white opacity-50 cursor-not-allowed" style={{ background: "linear-gradient(135deg, #4361ee, #3451d1)" }}>编辑</button>
            {detailAccount && <AccountActions account={detailAccount} employees={employees} onReload={onReload} notify={notify} />}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 新增手机号弹窗 ──────────────────────────────────────────
function NewPhoneModal({ onClose, onCreated }: { onClose: () => void; onCreated: (msg: string) => void }) {
  // 只收集后端 createAccount 真正接收的字段（id/accountType/name/identifier/phone/region）；
  // 运营商/身份证所有人/身份证号/证件正反面/分配给谁/归属项目/备注等后端不接收，已从弹窗移除，不再假装保存。
  const [form, setForm] = useState({ number: "", region: "" });
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const inp = { background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.15)", color: "#e2e8f0" };
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");

  const submit = async () => {
    setErr("");
    if (!form.number.trim()) { setErr("请填写手机号码"); return; }
    setSubmitting(true);
    try {
      await accountsApi.createAccount({
        id: `TEL-${Date.now().toString().slice(-8)}`,
        accountType: "手机号",
        name: form.number.trim(),
        identifier: form.number.trim(),
        phone: form.number.trim(),
        region: form.region || undefined,
      });
      onCreated(`已新增手机号 ${form.number.trim()}`);
      onClose();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "新增失败，请重试");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}>
      <div className="w-[560px] rounded-2xl overflow-hidden shadow-2xl" style={{ background: "#131f35", border: "1px solid rgba(99,102,241,0.25)" }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid rgba(99,102,241,0.15)" }}>
          <span className="text-white font-semibold">新增手机号</span>
          <button onClick={onClose}><X size={16} style={{ color: S.muted }} /></button>
        </div>

        <div className="p-6 space-y-5" style={{ maxHeight: "70vh", overflowY: "auto" }}>
          {/* 基本信息（仅后端接收字段） */}
          <div>
            <div className="text-xs font-medium mb-3 flex items-center gap-2" style={{ color: "#4361ee" }}>
              <Phone size={13} /> 号码基本信息
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs mb-1.5" style={{ color: S.muted }}>手机号码 *</label>
                <input className="w-full px-3 py-2 rounded-lg text-xs outline-none" style={inp} placeholder="138-xxxx-xxxx" value={form.number} onChange={e => set("number", e.target.value)} />
              </div>
              <div className="col-span-2">
                <label className="block text-xs mb-1.5" style={{ color: S.muted }}>号码归属区域</label>
                <input className="w-full px-3 py-2 rounded-lg text-xs outline-none" style={inp} placeholder="如 北京市朝阳区" value={form.region} onChange={e => set("region", e.target.value)} />
              </div>
            </div>
            <div className="mt-3 text-xs flex items-start gap-1.5" style={{ color: S.muted }}>
              <AlertTriangle size={12} style={{ marginTop: 1, flexShrink: 0 }} />
              运营商 / 身份证 / 证件上传 / 分配归属等尚未接入后端（M2），暂不在此录入，避免收集后无法保存。
            </div>
          </div>
        </div>

        {err && <div className="px-6 pt-3 text-xs" style={{ color: "#f87171" }}>{err}</div>}
        <div className="flex gap-3 px-6 py-4" style={{ borderTop: "1px solid rgba(99,102,241,0.15)" }}>
          <button onClick={onClose} disabled={submitting} className="flex-1 py-2.5 rounded-xl text-sm disabled:opacity-50" style={{ background: "rgba(99,102,241,0.08)", color: "#4361ee" }}>取消</button>
          <button onClick={submit} disabled={submitting} className="flex-1 py-2.5 rounded-xl text-sm text-white font-medium flex items-center justify-center gap-1.5 disabled:opacity-60" style={{ background: "linear-gradient(135deg, #4361ee, #3451d1)" }}>
            {submitting && <Loader2 size={14} className="animate-spin" />}保存
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── 手机号 Tab ──────────────────────────────────────────────
function PhoneTab({ search, accounts, employees, onReload, notify }: TabProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [showIdNum, setShowIdNum] = useState<Record<string, boolean>>({});
  const [showNewModal, setShowNewModal] = useState(false);

  const rows = accounts.map(toPhoneRow);
  const filtered = rows.filter(p =>
    p.number.includes(search) || p.manager.includes(search) ||
    p.carrier.includes(search) || p.region.includes(search) ||
    p.idOwner.includes(search) || p.assignedTo.includes(search) ||
    p.assignedProject.includes(search)
  );
  const detail = rows.find(p => p.id === selected);
  const detailAccount = accounts.find(a => a.id === selected);

  const maskId = (id: string) => id === "—" ? "—" : `${id.slice(0, 6)}****${id.slice(-4)}`;

  return (
    <div className="flex gap-4 flex-1 min-h-0">
      {showNewModal && <NewPhoneModal onClose={() => setShowNewModal(false)} onCreated={(msg) => { notify(msg); onReload(); }} />}

      <div className="flex-1 flex flex-col gap-3 min-w-0">
        {/* 操作栏 */}
        <div className="flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3 text-xs" style={{ color: S.muted }}>
            <span>共 <b style={{ color: S.text }}>{filtered.length}</b> 个手机号</span>
            <span style={{ color: "#ef4444" }}>● 风险：{rows.filter(p => p.risk === "high").length} 个</span>
            <span style={{ color: "#f59e0b" }}>● 待分配：{rows.filter(p => p.assignedTo === "—").length} 个</span>
          </div>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white" style={{ background: "linear-gradient(135deg, #4361ee, #3451d1)" }} onClick={() => setShowNewModal(true)}>
            <Plus size={13} /> 新增手机号
          </button>
        </div>

        {/* 表格 */}
        <div className="flex-1 rounded-xl overflow-hidden flex flex-col" style={{ background: S.surface, border: `1px solid ${S.border}` }}>
          {/* 表头 */}
          <div className="flex items-center px-4 py-2.5 flex-shrink-0" style={{ background: "#1a2640", borderBottom: `1px solid ${S.border}`, minWidth: "fit-content" }}>
            {([["手机号码",140],["运营商",80],["归属区域",120],["身份证人",90],["身份证号",150],["证件",64],["分配给",90],["归属项目",130],["已注册账号",200],["状态",80]] as [string,number][]).map(([l,w]) => (
              <div key={l} className="flex-shrink-0 text-xs" style={{ width: w, color: S.muted }}>{l}</div>
            ))}
          </div>

          {/* 表体 */}
          <div className="overflow-auto flex-1">
            {filtered.map((p, idx) => {
              const isSelected = selected === p.id;
              return (
                <div
                  key={p.id}
                  className="flex items-center px-4 py-2.5 cursor-pointer transition-all"
                  style={{ background: isSelected ? "rgba(99,102,241,0.08)" : idx % 2 === 0 ? "transparent" : "rgba(99,102,241,0.02)", borderBottom: `1px solid ${S.border}`, borderLeft: isSelected ? "2px solid #6366f1" : "2px solid transparent", minWidth: "fit-content" }}
                  onClick={() => setSelected(isSelected ? null : p.id)}
                >
                  {/* 手机号 */}
                  <div className="flex-shrink-0 flex items-center gap-1.5 text-xs" style={{ width: 140 }}>
                    <RiskIcon risk={p.risk} />
                    <Phone size={11} style={{ color: "#60a5fa" }} />
                    <span style={{ color: S.text }}>{p.number}</span>
                  </div>
                  {/* 运营商 */}
                  <div className="flex-shrink-0 text-xs" style={{ width: 80, color: S.textSec }}>{p.carrier}</div>
                  {/* 归属区域 */}
                  <div className="flex-shrink-0 text-xs" style={{ width: 120, color: S.textSec }}>{p.region}</div>
                  {/* 身份证人 */}
                  <div className="flex-shrink-0 text-xs font-medium" style={{ width: 90, color: S.text }}>{p.idOwner}</div>
                  {/* 身份证号 */}
                  <div className="flex-shrink-0 flex items-center gap-1.5 text-xs" style={{ width: 150 }}>
                    <span style={{ color: "#64748b", fontFamily: "monospace" }}>
                      {showIdNum[p.id] ? p.idNumber : maskId(p.idNumber)}
                    </span>
                    {p.idNumber !== "—" && (
                      <button onClick={e => { e.stopPropagation(); setShowIdNum(v => ({ ...v, [p.id]: !v[p.id] })); }}>
                        {showIdNum[p.id] ? <EyeOff size={10} style={{ color: S.muted }} /> : <Eye size={10} style={{ color: S.muted }} />}
                      </button>
                    )}
                  </div>
                  {/* 证件状态：无后端来源 → 中性「未登记」，不臆造为确定负态 */}
                  <div className="flex-shrink-0 text-xs" style={{ width: 64, color: S.muted, fontSize: "10px" }}>
                    {p.idFront == null && p.idBack == null ? "未登记" : `${p.idFront ? "✓" : "✗"}正 ${p.idBack ? "✓" : "✗"}反`}
                  </div>
                  {/* 分配给 */}
                  <div className="flex-shrink-0 text-xs" style={{ width: 90, color: p.assignedTo === "—" ? "#f59e0b" : S.textSec }}>{p.assignedTo}</div>
                  {/* 归属项目 */}
                  <div className="flex-shrink-0 text-xs" style={{ width: 130, color: p.assignedProject === "—" ? S.muted : "#a5b4fc" }}>{p.assignedProject}</div>
                  {/* 已注册账号 */}
                  <div className="flex-shrink-0" style={{ width: 200 }}>
                    {p.registrations.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {p.registrations.map((r, i) => (
                          <span key={i} className="px-1.5 py-0.5 rounded-full" style={{ background: "rgba(99,102,241,0.1)", color: "#4361ee", fontSize: "10px" }}>{r}</span>
                        ))}
                      </div>
                    ) : <span style={{ color: S.muted, fontSize: "11px" }}>暂无</span>}
                  </div>
                  {/* 状态 */}
                  <div className="flex-shrink-0" style={{ width: 80 }}><StatusBadge status={p.status} /></div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 右侧详情面板 */}
      {detail && (
        <div className="w-[300px] flex-shrink-0 rounded-xl flex flex-col overflow-hidden" style={{ background: S.surface, border: `1px solid ${S.border}` }}>
          {/* 面板头 */}
          <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" style={{ borderBottom: `1px solid ${S.border}` }}>
            <span className="text-sm font-medium" style={{ color: S.text }}>手机号详情</span>
            <button onClick={() => setSelected(null)}><X size={13} style={{ color: S.muted }} /></button>
          </div>

          <div className="flex-1 overflow-auto p-4 space-y-4">
            {/* 号码卡 */}
            <div className="py-4 rounded-xl text-center" style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)" }}>
              <Phone size={20} className="mx-auto mb-2" style={{ color: "#60a5fa" }} />
              <div className="text-lg font-semibold" style={{ color: S.text }}>{detail.number}</div>
              <div className="text-xs mt-0.5" style={{ color: S.muted }}>{detail.carrier} · {detail.region}</div>
              <div className="mt-2"><StatusBadge status={detail.status} /></div>
            </div>

            {/* 身份证信息 */}
            <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${S.border}` }}>
              <div className="px-3 py-2 flex items-center gap-2" style={{ background: "rgba(99,102,241,0.08)", borderBottom: `1px solid ${S.border}` }}>
                <CreditCard size={13} style={{ color: "#4361ee" }} />
                <span className="text-xs font-medium" style={{ color: "#4361ee" }}>注册身份证</span>
                {detail.idFront == null && detail.idBack == null
                  ? <span className="ml-auto text-xs" style={{ color: S.muted }}>未登记</span>
                  : detail.idFront && detail.idBack
                    ? <span className="ml-auto text-xs flex items-center gap-1" style={{ color: "#10b981" }}><CheckCircle size={11} /> 已完整上传</span>
                    : <span className="ml-auto text-xs flex items-center gap-1" style={{ color: "#ef4444" }}><AlertTriangle size={11} /> 资料不完整</span>
                }
              </div>
              <div className="p-3 space-y-2">
                <div className="flex justify-between text-xs">
                  <span style={{ color: S.muted }}>身份证所有人</span>
                  <span style={{ color: S.text }}>{detail.idOwner}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span style={{ color: S.muted }}>身份证号码</span>
                  <div className="flex items-center gap-1.5">
                    <span style={{ color: S.text, fontFamily: "monospace" }}>
                      {showIdNum[detail.id] ? detail.idNumber : (detail.idNumber !== "—" ? `${detail.idNumber.slice(0,6)}****${detail.idNumber.slice(-4)}` : "—")}
                    </span>
                    {detail.idNumber !== "—" && (
                      <button onClick={() => setShowIdNum(v => ({ ...v, [detail.id]: !v[detail.id] }))}>
                        {showIdNum[detail.id] ? <EyeOff size={11} style={{ color: S.muted }} /> : <Eye size={11} style={{ color: S.muted }} />}
                      </button>
                    )}
                  </div>
                </div>

                {/* 证件正反面：无后端来源 → 中性「未登记」占位；true/false 分支保留供 M2 接线后使用 */}
                <div className="grid grid-cols-2 gap-2 mt-3">
                  {([["正面（人像面）", detail.idFront], ["反面（国徽面）", detail.idBack]] as [string, boolean | null][]).map(([label, state]) => (
                    <div key={label}>
                      <div className="text-xs mb-1.5 flex items-center gap-1" style={{ color: S.muted }}>
                        {label}
                        {state === true && <CheckCircle size={10} style={{ color: "#10b981" }} />}
                      </div>
                      {state === true ? (
                        <div className="h-20 rounded-lg flex flex-col items-center justify-center gap-1" style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)" }}>
                          <CreditCard size={20} style={{ color: "#10b981" }} />
                          <span className="text-xs" style={{ color: "#10b981" }}>已上传</span>
                        </div>
                      ) : state === false ? (
                        <div className="h-20 rounded-lg border-dashed flex flex-col items-center justify-center gap-1" style={{ border: "1px dashed rgba(239,68,68,0.4)", background: "rgba(239,68,68,0.04)" }}>
                          <Upload size={16} style={{ color: "#ef4444" }} />
                          <span className="text-xs" style={{ color: "#ef4444" }}>未上传</span>
                        </div>
                      ) : (
                        <div className="h-20 rounded-lg border-dashed flex flex-col items-center justify-center gap-1" style={{ border: `1px dashed ${S.border}`, background: S.surface2 }}>
                          <CreditCard size={18} style={{ color: S.muted }} />
                          <span className="text-xs" style={{ color: S.muted }}>未登记</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 分配信息 */}
            <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${S.border}` }}>
              <div className="px-3 py-2" style={{ background: "rgba(99,102,241,0.08)", borderBottom: `1px solid ${S.border}` }}>
                <span className="text-xs font-medium" style={{ color: "#4361ee" }}>分配 & 使用</span>
              </div>
              <div className="p-3 space-y-2">
                {[
                  ["分配给", detail.assignedTo],
                  ["归属项目", detail.assignedProject],
                  ["保管人", detail.manager],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between text-xs py-1" style={{ borderBottom: `1px solid rgba(99,102,241,0.08)` }}>
                    <span style={{ color: S.muted }}>{k}</span>
                    <span style={{ color: v === "—" ? "#f59e0b" : S.text }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 已注册账号 */}
            <div>
              <div className="text-xs mb-2" style={{ color: S.muted }}>
                已注册 {detail.registrations.length} 个平台账号
              </div>
              {detail.registrations.length > 0 ? detail.registrations.map((r, i) => (
                <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg mb-1.5" style={{ background: "rgba(99,102,241,0.06)", border: `1px solid ${S.border}` }}>
                  <Globe size={11} style={{ color: "#4361ee" }} />
                  <span className="text-xs" style={{ color: "#64748b" }}>{r}</span>
                </div>
              )) : (
                <div className="text-xs px-2.5 py-2 rounded-lg" style={{ background: "#1a2640", color: S.muted }}>该手机号尚未注册任何平台账号</div>
              )}
            </div>

            {/* 备注 */}
            {detail.note && (
              <div className="p-3 rounded-xl text-xs" style={{ background: "#1a2640", border: `1px solid ${S.border}`, color: "#64748b", lineHeight: 1.6 }}>
                {detail.note}
              </div>
            )}

            {/* 风险提示 */}
            {detail.risk !== "normal" && (
              <div className="flex items-start gap-2 p-3 rounded-xl" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                <AlertTriangle size={12} style={{ color: "#ef4444", marginTop: 1, flexShrink: 0 }} />
                <span className="text-xs" style={{ color: "#fca5a5" }}>
                  {detail.risk === "high" ? "账号存在异常，请尽快处理" : "存在交接风险，请及时处理"}
                </span>
              </div>
            )}
          </div>

          {/* 操作按钮 */}
          <div className="p-4 flex flex-col gap-2 flex-shrink-0" style={{ borderTop: `1px solid ${S.border}` }}>
            <button disabled title="M2 接线" className="w-full py-2 rounded-lg text-xs text-white opacity-50 cursor-not-allowed" style={{ background: "linear-gradient(135deg, #4361ee, #3451d1)" }}>编辑信息</button>
            {detailAccount && <AccountActions account={detailAccount} employees={employees} onReload={onReload} notify={notify} />}
            <button disabled title="M2 接线" className="py-2 rounded-lg text-xs opacity-50 cursor-not-allowed" style={{ background: "rgba(99,102,241,0.08)", color: "#4361ee" }}>登记关联账号</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 微信号 Tab（含个人微信 + 企业微信） ─────────────────────────
function WechatTab({ search, accounts, employees, onReload, notify }: TabProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const rows = accounts.map(toWechatRow);
  const filtered = rows.filter(w => w.wechatId.includes(search) || w.manager.includes(search) || w.project.includes(search) || w.accountType.includes(search));
  const detail = rows.find(w => w.id === selected);
  const detailAccount = accounts.find(a => a.id === selected);

  return (
    <div className="flex gap-4 flex-1 min-h-0">
      <div className="flex-1 rounded-xl overflow-hidden flex flex-col" style={{ background: S.surface, border: `1px solid ${S.border}` }}>
        <div className="flex items-center px-4 py-2.5 gap-4 flex-shrink-0" style={{ background: "#1a2640", borderBottom: `1px solid ${S.border}` }}>
          <ColHead width="160px">微信号</ColHead>
          <ColHead width="160px">绑定手机</ColHead>
          <ColHead width="70px">好友数</ColHead>
          <ColHead width="60px">群数量</ColHead>
          <ColHead width="100px">保管人</ColHead>
          <ColHead width="120px">归属项目</ColHead>
          <ColHead width="80px">状态</ColHead>
          <ColHead width="80px">最近登录</ColHead>
        </div>
        <div className="overflow-auto flex-1">
          {filtered.map(w => {
            const daysAgo = w.lastLogin !== "—" ? Math.floor((Date.now() - new Date(w.lastLogin).getTime()) / 86400000) : null;
            const loginRisk = daysAgo !== null && daysAgo > 7;
            return (
              <Row key={w.id} selected={selected === w.id} onClick={() => setSelected(selected === w.id ? null : w.id)}>
                <Col width="160px" highlight>
                  <div className="flex items-center gap-1.5">
                    <RiskIcon risk={w.risk} />
                    <MessageCircle size={12} style={{ color: w.accountType === "企业微信" ? "#4361ee" : "#10b981" }} />
                    {w.wechatId}
                    <span className="px-1 py-0.5 rounded" style={{ background: "rgba(99,102,241,0.1)", color: S.muted, fontSize: "9px" }}>{w.accountType === "企业微信" ? "企微" : "个微"}</span>
                  </div>
                </Col>
                <Col width="160px">
                  {w.boundPhone === "—（未绑定手机）" ? (
                    <span className="px-1.5 py-0.5 rounded text-xs" style={{ background: "rgba(245,158,11,0.15)", color: "#fbbf24", fontSize: "10px" }}>未绑定手机号</span>
                  ) : w.boundPhone}
                </Col>
                <Col width="70px">{w.friendCount}</Col>
                <Col width="60px">{w.groupCount} 个</Col>
                <Col width="100px">{w.manager}</Col>
                <Col width="120px">{w.project}</Col>
                <div style={{ width: "80px" }}><StatusBadge status={w.status} /></div>
                <Col width="80px">
                  <span style={{ color: loginRisk ? "#ef4444" : S.textSec }}>
                    {daysAgo !== null ? `${daysAgo}天前` : "—"}
                  </span>
                </Col>
              </Row>
            );
          })}
        </div>
      </div>

      {detail && (
        <div className="w-64 flex-shrink-0 rounded-xl p-4 flex flex-col gap-3" style={{ background: S.surface, border: `1px solid ${S.border}` }}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium" style={{ color: S.text }}>微信号详情</span>
            <button onClick={() => setSelected(null)}><X size={13} style={{ color: S.muted }} /></button>
          </div>
          <div className="py-3 rounded-xl text-center" style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)" }}>
            <MessageCircle size={20} className="mx-auto mb-1" style={{ color: "#10b981" }} />
            <div className="text-sm font-semibold" style={{ color: S.text }}>{detail.wechatId}</div>
            {detail.boundPhone === "—（未绑定手机）" ? (
              <span className="mt-1 inline-block px-2 py-0.5 rounded-full text-xs" style={{ background: "rgba(245,158,11,0.15)", color: "#fbbf24" }}>未绑定手机号</span>
            ) : <div className="text-xs mt-1" style={{ color: S.muted }}>{detail.boundPhone}</div>}
            <div className="mt-2"><StatusBadge status={detail.status} /></div>
          </div>
          {detail.groupCount > 0 && (
            <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg" style={{ background: "rgba(16,185,129,0.06)" }}>
              <span className="text-xs" style={{ color: "#6ee7b7" }}>承接 {detail.groupCount} 个服务群</span>
            </div>
          )}
          {[["账号类型", detail.accountType], ["保管人", detail.manager], ["归属项目", detail.project], ["好友数", `${detail.friendCount} 人`], ["最近登录", detail.lastLogin]].map(([k, v]) => (
            <div key={k} className="flex justify-between py-1.5" style={{ borderBottom: `1px solid ${S.border}` }}>
              <span className="text-xs" style={{ color: S.muted }}>{k}</span>
              <span className="text-xs" style={{ color: S.text }}>{v}</span>
            </div>
          ))}
          <div className="flex flex-col gap-2 mt-auto">
            <button disabled title="M2 接线" className="w-full py-2 rounded-lg text-xs text-white opacity-50 cursor-not-allowed" style={{ background: "linear-gradient(135deg, #4361ee, #3451d1)" }}>编辑信息</button>
            {detailAccount && <AccountActions account={detailAccount} employees={employees} onReload={onReload} notify={notify} />}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 媒体账号 Tab ─────────────────────────────────────────────
function MediaTab({ search, accounts, employees, onReload, notify }: TabProps) {
  const [selected, setSelected] = useState<string | null>(null);

  const items = accounts.map(toMediaItem);
  const filtered = items.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.platform.includes(search) ||
    m.manager.includes(search) ||
    m.loginId.includes(search)
  );
  const detail = items.find(m => m.id === selected);
  const detailAccount = accounts.find(a => a.id === selected);

  const wechatGroup = filtered.filter(m => m.group === "微信生态");
  const contentGroup = filtered.filter(m => m.group === "内容平台");

  const totalFollowers = 0;   // 粉丝数无后端来源
  const activeCount = items.filter(m => m.status === "使用中").length;
  const idleCount = items.filter(m => m.status === "空闲").length;

  function PlatformCard({ m }: { m: MediaItem }) {
    const isSelected = selected === m.id;
    return (
      <div
        className="rounded-xl p-4 cursor-pointer transition-all"
        style={{
          background: isSelected ? `${m.colorBg}` : S.surface,
          border: isSelected ? `1px solid ${m.color}40` : `1px solid ${S.border}`,
          boxShadow: isSelected ? `0 0 16px ${m.color}18` : "none",
        }}
        onClick={() => setSelected(isSelected ? null : m.id)}
      >
        {/* 顶部：平台标识 + 状态 */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
              style={{ background: m.colorBg, border: `1px solid ${m.color}30` }}>
              {m.emoji}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold" style={{ color: m.color }}>{m.platform}</span>
                {m.verified && (
                  <span className="px-1 py-0.5 rounded text-xs" style={{ background: `${m.color}20`, color: m.color, fontSize: "9px" }}>✓ 认证</span>
                )}
              </div>
              <div className="text-sm font-medium mt-0.5" style={{ color: S.text }}>{m.name}</div>
            </div>
          </div>
          <StatusBadge status={m.status} />
        </div>

        {/* 核心数据：粉丝、内容量、互动率 */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="rounded-lg px-2 py-1.5 text-center" style={{ background: "rgba(99,102,241,0.06)" }}>
            <div className="font-semibold" style={{ color: m.color, fontSize: "13px" }}>{m.followers}</div>
            <div className="text-xs mt-0.5" style={{ color: S.muted, fontSize: "10px" }}>粉丝</div>
          </div>
          <div className="rounded-lg px-2 py-1.5 text-center" style={{ background: "rgba(99,102,241,0.06)" }}>
            <div className="font-semibold" style={{ fontSize: "13px", color: S.text }}>{m.contentCount}</div>
            <div className="text-xs mt-0.5" style={{ color: S.muted, fontSize: "10px" }}>内容</div>
          </div>
          <div className="rounded-lg px-2 py-1.5 text-center" style={{ background: "rgba(99,102,241,0.06)" }}>
            <div className="font-semibold" style={{ color: "#10b981", fontSize: "13px" }}>{m.engagement}</div>
            <div className="text-xs mt-0.5" style={{ color: S.muted, fontSize: "10px" }}>互动率</div>
          </div>
        </div>

        {/* 标签 */}
        <div className="flex flex-wrap gap-1 mb-3">
          {m.tags.map(t => (
            <span key={t} className="px-1.5 py-0.5 rounded-full" style={{ background: "rgba(99,102,241,0.08)", color: "#4361ee", fontSize: "10px" }}>{t}</span>
          ))}
        </div>

        {/* 底部：登录方式 + 保管人 + 最近发布 */}
        <div className="pt-2.5 space-y-1.5" style={{ borderTop: `1px solid ${S.border}` }}>
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: S.muted }}>登录方式</span>
            <span className="px-1.5 py-0.5 rounded text-xs" style={{ background: "rgba(99,102,241,0.08)", color: "#4361ee", fontSize: "10px" }}>{m.loginType}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: S.muted }}>保管人</span>
            <span className="text-xs" style={{ color: "#64748b" }}>{m.manager}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: S.muted }}>最近发布</span>
            <span className="text-xs" style={{ color: m.status === "空闲" ? "#ef4444" : S.textSec }}>{m.lastPost}</span>
          </div>
        </div>
      </div>
    );
  }

  function GroupSection({ title, accounts, accentColor }: { title: string; accounts: MediaItem[]; accentColor: string }) {
    if (accounts.length === 0) return null;
    return (
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1 h-4 rounded-full" style={{ background: accentColor }} />
          <span className="text-sm font-medium" style={{ color: S.text }}>{title}</span>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(99,102,241,0.08)", color: S.muted }}>{accounts.length} 个账号</span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {accounts.map(m => <PlatformCard key={m.id} m={m} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-4 flex-1 min-h-0">
      {/* 左侧主区域 */}
      <div className="flex-1 flex flex-col gap-4 min-w-0 overflow-auto">
        {/* 汇总数据条 */}
        <div className="grid grid-cols-4 gap-3 flex-shrink-0">
          {[
            { label: "媒体账号总数", value: items.length, color: "#6366f1" },
            { label: "全平台粉丝合计", value: "—", color: "#10b981" },
            { label: "正常运营", value: activeCount, color: "#3b82f6" },
            { label: "暂停/空闲", value: idleCount, color: "#f59e0b" },
          ].map(s => (
            <div key={s.label} className="rounded-xl px-3 py-2.5 flex-shrink-0" style={{ background: S.surface, border: `1px solid ${S.border}` }}>
              <div className="text-xs" style={{ color: S.muted }}>{s.label}</div>
              <div className="font-semibold mt-0.5" style={{ color: s.color, fontSize: "18px" }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* 分组卡片 */}
        <div className="space-y-6 pb-4">
          <GroupSection title="微信生态" accounts={wechatGroup} accentColor="#10b981" />
          <GroupSection title="内容平台" accounts={contentGroup} accentColor="#6366f1" />
          {filtered.length === 0 && (
            <div className="text-center py-12" style={{ color: S.muted }}>
              <div className="text-2xl mb-2">🔍</div>
              <div className="text-sm">未找到匹配的媒体账号</div>
            </div>
          )}
        </div>
      </div>

      {/* 右侧详情面板 */}
      {detail && (
        <div className="w-72 flex-shrink-0 rounded-xl p-4 flex flex-col gap-3 overflow-auto" style={{ background: S.surface, border: `1px solid ${S.border}` }}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium" style={{ color: S.text }}>账号详情</span>
            <button onClick={() => setSelected(null)}><X size={13} style={{ color: S.muted }} /></button>
          </div>

          {/* 平台头 */}
          <div className="py-4 rounded-xl text-center" style={{ background: detail.colorBg, border: `1px solid ${detail.color}30` }}>
            <div className="text-4xl mb-2">{detail.emoji}</div>
            <div className="text-sm font-semibold" style={{ color: S.text }}>{detail.name}</div>
            <div className="text-xs mt-0.5" style={{ color: S.muted }}>{detail.platform}</div>
            <div className="flex items-center justify-center gap-2 mt-2">
              <StatusBadge status={detail.status} />
              {detail.verified && (
                <span className="px-1.5 py-0.5 rounded text-xs" style={{ background: `${detail.color}20`, color: detail.color, fontSize: "10px" }}>✓ 已认证</span>
              )}
            </div>
          </div>

          {/* 数据指标 */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "粉丝", value: detail.followers, color: detail.color },
              { label: "内容", value: detail.contentCount, color: S.text },
              { label: "互动率", value: detail.engagement, color: "#10b981" },
            ].map(s => (
              <div key={s.label} className="rounded-lg px-2 py-2 text-center" style={{ background: "rgba(99,102,241,0.06)" }}>
                <div className="text-xs font-semibold" style={{ color: s.color }}>{s.value}</div>
                <div className="text-xs mt-0.5" style={{ color: S.muted, fontSize: "10px" }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* 标签 */}
          <div className="flex flex-wrap gap-1">
            {detail.tags.map(t => (
              <span key={t} className="px-2 py-0.5 rounded-full text-xs" style={{ background: "rgba(67,97,238,0.12)", color: "#4361ee" }}>{t}</span>
            ))}
          </div>

          {/* 账号凭证 */}
          <div className="rounded-xl p-3 space-y-2" style={{ background: "rgba(99,102,241,0.06)", border: `1px solid ${S.border}` }}>
            <div className="text-xs font-medium mb-1" style={{ color: "#4361ee" }}>登录凭证</div>
            <div className="flex justify-between">
              <span className="text-xs" style={{ color: S.muted }}>登录方式</span>
              <span className="text-xs" style={{ color: S.text }}>{detail.loginType}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs" style={{ color: S.muted }}>登录 ID</span>
              <span className="text-xs text-right max-w-[160px]" style={{ color: S.text }}>{detail.loginId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs" style={{ color: S.muted }}>密码保管</span>
              <span className="text-xs text-right max-w-[160px]" style={{ color: "#92400e" }}>{detail.pwdStore}</span>
            </div>
          </div>

          {/* 运营信息 */}
          {[
            ["保管人", detail.manager],
            ["最近发布", detail.lastPost],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between py-1.5" style={{ borderBottom: `1px solid ${S.border}` }}>
              <span className="text-xs" style={{ color: S.muted }}>{k}</span>
              <span className="text-xs" style={{ color: S.text }}>{v}</span>
            </div>
          ))}

          {/* 备注 */}
          {detail.note && (
            <div className="p-3 rounded-xl text-xs" style={{ background: "rgba(99,102,241,0.05)", color: "#64748b", lineHeight: 1.6 }}>
              {detail.note}
            </div>
          )}

          <div className="flex flex-col gap-2 mt-auto">
            <button disabled title="M2 接线" className="w-full py-2 rounded-lg text-xs text-white opacity-50 cursor-not-allowed" style={{ background: "linear-gradient(135deg, #4361ee, #3451d1)" }}>编辑信息</button>
            {detailAccount && <AccountActions account={detailAccount} employees={employees} onReload={onReload} notify={notify} />}
            <button disabled title="M2 接线" className="w-full py-2 rounded-lg text-xs flex items-center justify-center gap-1 opacity-50 cursor-not-allowed" style={{ background: "rgba(99,102,241,0.08)", color: "#4361ee" }}>
              <ExternalLink size={11} /> 打开平台后台
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 邮箱/其他 Tab ────────────────────────────────────────────
function EmailOtherTab({ search, accounts }: TabProps) {
  // 邮箱/苹果ID/云账号等非四大主类账号（当前无种子 → 空态）
  const rows = accounts.filter(a => !MAIN_TYPES.includes(a.account_type)).map(toEmailRow);
  const filtered = rows.filter(e => e.identifier.includes(search) || e.manager.includes(search) || e.type.includes(search) || e.usedFor.includes(search));
  return (
    <div className="flex-1 rounded-xl overflow-hidden flex flex-col" style={{ background: S.surface, border: `1px solid ${S.border}` }}>
      <div className="flex items-center px-4 py-2.5 gap-4 flex-shrink-0" style={{ background: "#1a2640", borderBottom: `1px solid ${S.border}` }}>
        <ColHead width="90px">账号类型</ColHead>
        <ColHead width="230px">账号标识</ColHead>
        <ColHead width="280px">用于哪些平台/用途</ColHead>
        <ColHead width="100px">保管人</ColHead>
        <ColHead width="80px">状态</ColHead>
      </div>
      <div className="overflow-auto flex-1">
        {filtered.map(e => {
          const tc = typeColors[e.type] || { bg: "rgba(99,102,241,0.1)", color: "#4361ee" };
          return (
            <div key={e.id} className="flex items-center px-4 py-3 gap-4" style={{ borderBottom: `1px solid ${S.border}` }}>
              <span className="flex-shrink-0 px-2 py-0.5 rounded-full text-xs" style={{ background: tc.bg, color: tc.color, width: "90px" }}>{e.type}</span>
              <Col width="230px" highlight>
                <div className="flex items-center gap-1.5">
                  {e.risk !== "normal" && <RiskIcon risk={e.risk} />}
                  <Mail size={11} style={{ color: "#c4b5fd" }} />
                  {e.identifier}
                </div>
              </Col>
              <Col width="280px">{e.usedFor}</Col>
              <Col width="100px">{e.manager}</Col>
              <div style={{ width: "80px" }}><StatusBadge status={e.status} /></div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="flex items-center justify-center py-16 text-xs" style={{ color: S.muted }}>暂无邮箱及其他类账号</div>
        )}
      </div>
    </div>
  );
}

// ─── 主组件 ──────────────────────────────────────────────────
const tabs = [
  { id: "all",   label: "总览",    icon: Globe },
  { id: "phone", label: "手机号",  icon: Phone },
  { id: "wx",    label: "微信号",  icon: MessageCircle },
  { id: "media", label: "媒体账号", icon: Globe },
  { id: "other", label: "邮箱/其他", icon: Mail },
];

export default function AccountAssets() {
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("全部状态");
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<{ text: string; kind: "success" | "error" } | null>(null);
  const notify: Notify = (text, kind = "success") => setToast({ text, kind });
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(t);
  }, [toast]);

  const reload = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [acc, emp] = await Promise.all([accountsApi.listAccounts(), employeesApi.listEmployees()]);
      setAccounts(acc); setEmployees(emp);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "加载账号资产失败");
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { reload(); }, [reload]);

  // 后端 /accounts 的 accountType 过滤未生效（后端读的是 type 参数）→ 前端按 account_type 分流
  const scoped = accounts.filter(a => statusFilter === "全部状态" || displayStatus(a.status) === statusFilter);
  const tabAccounts: Record<string, AccountRow[]> = {
    all: scoped,
    phone: scoped.filter(a => a.account_type === "手机号"),
    wx: scoped.filter(a => a.account_type.includes("微信")),
    media: scoped.filter(a => a.account_type === "媒体账号"),
    other: scoped.filter(a => !MAIN_TYPES.includes(a.account_type)),
  };
  const counts: Record<string, number> = {
    all: scoped.length, phone: tabAccounts.phone.length, wx: tabAccounts.wx.length,
    media: tabAccounts.media.length, other: tabAccounts.other.length,
  };
  const riskCount = accounts.filter(a => riskOf(a.status) !== "normal").length;
  const activeAccounts = tabAccounts[activeTab] ?? scoped;
  const tabProps: TabProps = { search, accounts: activeAccounts, employees, onReload: reload, notify };
  // 筛选下拉只列出当前数据实际存在的状态（经 displayStatus 展示词），避免出现筛不出结果的死选项（如原「空闲」）
  const statusOptions = ["全部状态", ...STATUS_FILTER_ORDER.filter(s => accounts.some(a => displayStatus(a.status) === s))];

  return (
    <div className="p-6 h-full flex flex-col gap-4">
      {toast && (
        <div className="fixed top-16 left-1/2 z-[80] -translate-x-1/2 px-4 py-2.5 rounded-lg shadow-2xl flex items-center gap-2"
          style={{ background: "#131f35", border: "1px solid rgba(99,102,241,0.25)", color: toast.kind === "success" ? "#34d399" : "#f87171", fontSize: 12 }}>
          {toast.kind === "success" ? <Check size={14} /> : <AlertTriangle size={14} />}{toast.text}
        </div>
      )}
      {/* 页头 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold" style={{ color: S.text }}>账号资产中心</h2>
          <p className="text-xs mt-0.5" style={{ color: S.muted }}>统一管理手机号、微信号、媒体账号和其他凭证，支持跨平台关联查看</p>
        </div>
        <div className="flex gap-2">
          {riskCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#fca5a5" }}>
              <AlertTriangle size={12} /> {riskCount} 个账号存在风险
            </div>
          )}
          <button disabled title="M2 接线：新增账号请到「手机号」Tab 内使用「新增手机号」" className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs text-white opacity-50 cursor-not-allowed" style={{ background: "linear-gradient(135deg, #4361ee, #3451d1)" }}>
            <Plus size={13} /> 新增账号
          </button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: "账号总数", value: accounts.length, color: "#6366f1" },
          { label: "手机号", value: tabAccounts.phone.length, color: "#60a5fa" },
          { label: "微信号", value: tabAccounts.wx.length, color: "#10b981" },
          { label: "媒体账号", value: tabAccounts.media.length, color: "#a78bfa" },
          { label: "⚠ 风险账号", value: riskCount, color: "#ef4444" },
        ].map(s => (
          <div key={s.label} className="rounded-xl px-3 py-2.5" style={{ background: S.surface, border: `1px solid ${S.border}` }}>
            <div className="text-xs" style={{ color: S.muted }}>{s.label}</div>
            <div className="font-semibold mt-0.5" style={{ color: s.color, fontSize: "20px" }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Tab 栏 + 搜索 */}
      <div className="flex items-center gap-2">
        <div className="flex gap-1 p-1 rounded-xl flex-shrink-0" style={{ background: S.surface, border: `1px solid ${S.border}` }}>
          {tabs.map(t => (
            <button
              key={t.id}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all"
              style={{ background: activeTab === t.id ? "linear-gradient(135deg, #6366f1, #4f46e5)" : "transparent", color: activeTab === t.id ? "white" : S.muted }}
              onClick={() => setActiveTab(t.id)}
            >
              {t.label}
              <span className="px-1.5 py-0.5 rounded-full" style={{ background: activeTab === t.id ? "rgba(255,255,255,0.2)" : "rgba(99,102,241,0.12)", color: activeTab === t.id ? "white" : "#a5b4fc", fontSize: "10px" }}>
                {counts[t.id]}
              </span>
            </button>
          ))}
        </div>

        <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: S.surface, border: `1px solid ${S.border}` }}>
          <Search size={13} style={{ color: S.muted }} />
          <input
            className="bg-transparent outline-none text-xs flex-1"
            style={{ color: "#64748b" }}
            placeholder={activeTab === "phone" ? "搜索手机号、运营商、保管人..." : activeTab === "wx" ? "搜索微信号、保管人、项目..." : activeTab === "media" ? "搜索平台、账号名称、登录ID..." : "搜索账号、保管人..."}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && <button onClick={() => setSearch("")}><X size={12} style={{ color: S.muted }} /></button>}
        </div>

        <div className="relative flex-shrink-0">
          <select
            className="appearance-none px-3 py-2 pr-7 rounded-xl text-xs outline-none cursor-pointer"
            style={{ background: S.surface, border: `1px solid ${S.border}`, color: "#64748b" }}
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            {statusOptions.map(o => (
              <option key={o} value={o} style={{ background: "#111228" }}>{o}</option>
            ))}
          </select>
          <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: S.muted }} />
        </div>

        <button disabled title="M2 接线" className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs flex-shrink-0 opacity-50 cursor-not-allowed" style={{ background: S.surface, border: `1px solid ${S.border}`, color: "#64748b" }}>
          <Filter size={12} /> 导出
        </button>
      </div>

      {/* Tab 内容 */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center text-sm" style={{ color: S.muted }}>
          <Loader2 size={16} className="animate-spin mr-2" /> 加载账号资产…
        </div>
      ) : error ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-sm" style={{ color: "#ef4444" }}>
          <div className="flex items-center gap-2"><AlertTriangle size={16} /> {error}</div>
          <button onClick={reload} className="px-3 py-1.5 rounded-lg text-xs" style={{ background: S.surface, border: `1px solid ${S.border}`, color: "#64748b" }}>重试</button>
        </div>
      ) : (
        <>
          {activeTab === "all"   && <OverviewTab {...tabProps} />}
          {activeTab === "phone" && <PhoneTab {...tabProps} />}
          {activeTab === "wx"    && <WechatTab {...tabProps} />}
          {activeTab === "media" && <MediaTab {...tabProps} />}
          {activeTab === "other" && <EmailOtherTab {...tabProps} />}
        </>
      )}
    </div>
  );
}
