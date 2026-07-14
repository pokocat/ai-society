import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import {
  Check, X, ChevronRight, Clock, AlertTriangle, FileText,
  CreditCard, UserCheck, UserPlus, ArrowRightLeft, Shield,
  MessageSquare, RotateCcw, Loader2, RefreshCw
} from "lucide-react";
import { approvalsApi, ApiError } from "../../api";
import type { ApprovalRow, ApprovalDetail } from "../../api/approvals";

const L = {
  bg: "#0d1629", surface: "#131f35", border: "rgba(255,255,255,0.07)", borderLight: "rgba(255,255,255,0.04)",
  primary: "#4361ee", primaryBg: "rgba(67,97,238,0.15)", text: "#e2e8f0", textSec: "#94a3b8",
  muted: "#64748b", mutedLight: "#475569", surface2: "#1a2640",
};

const STATUS_CONFIG: Record<string, { bg: string; color: string }> = {
  "待审批": { bg: "rgba(245,158,11,0.15)", color: "#fbbf24" },
  "审批中": { bg: "rgba(67,97,238,0.15)", color: "#818cf8" },
  "已同意": { bg: "rgba(16,185,129,0.15)", color: "#34d399" },
  "已拒绝": { bg: "rgba(239,68,68,0.15)", color: "#f87171" },
};
const DEFAULT_STATUS_CFG = { bg: "rgba(100,116,139,0.15)", color: "#94a3b8" };
const statusCfg = (s: string) => STATUS_CONFIG[s] ?? DEFAULT_STATUS_CFG;

const TYPE_CONFIG: Record<string, { bg: string; color: string; icon: ReactNode }> = {
  "退款协同": { bg: "rgba(239,68,68,0.15)", color: "#f87171", icon: <CreditCard size={14} /> },
  "退款申请": { bg: "rgba(239,68,68,0.15)", color: "#f87171", icon: <CreditCard size={14} /> },
  "账号交接": { bg: "rgba(245,158,11,0.15)", color: "#fbbf24", icon: <ArrowRightLeft size={14} /> },
  "新账号申请": { bg: "rgba(67,97,238,0.15)", color: "#818cf8", icon: <UserPlus size={14} /> },
  "提现审批": { bg: "rgba(16,185,129,0.15)", color: "#34d399", icon: <FileText size={14} /> },
  "权限变更": { bg: "rgba(100,116,139,0.15)", color: "#94a3b8", icon: <Shield size={14} /> },
};
const DEFAULT_TYPE_CFG = { bg: "rgba(100,116,139,0.15)", color: "#94a3b8", icon: <FileText size={14} /> };
const typeCfg = (t: string) => TYPE_CONFIG[t] ?? DEFAULT_TYPE_CFG;

const PENDING_STATUSES = ["待审批", "审批中"];
const isPending = (status: string) => PENDING_STATUSES.includes(status);

function relTime(iso: string | null): string {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const diff = Date.now() - t;
  if (diff < 60_000) return "刚刚";
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins} 分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} 天前`;
  return new Date(t).toLocaleDateString("zh-CN");
}

/** 由 detail 键值对拼一个简短副标题 */
function summary(detail: Record<string, string>): string {
  return Object.entries(detail)
    .slice(0, 2)
    .map(([k, v]) => `${k} ${v}`)
    .join(" · ");
}

interface Toast { text: string; kind: "success" | "error"; }

export default function ApprovalCenter() {
  const [approvals, setApprovals] = useState<ApprovalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<ApprovalDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [comment, setComment] = useState("");
  const [deciding, setDeciding] = useState(false);
  const [selectedType, setSelectedType] = useState("全部审批");
  const [bottomTab, setBottomTab] = useState<"pending" | "history">("pending");
  const [toast, setToast] = useState<Toast | null>(null);

  const pushToast = useCallback((text: string, kind: "success" | "error" = "success") => {
    setToast({ text, kind });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const loadApprovals = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const rows = await approvalsApi.listApprovals();
      setApprovals(rows);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "加载审批列表失败";
      console.error("[ApprovalCenter] 加载审批失败：", msg);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadApprovals(); }, [loadApprovals]);

  // 选中项 → 拉详情（含流转记录）
  useEffect(() => {
    if (selectedId == null) { setDetail(null); return; }
    let cancelled = false;
    setDetailLoading(true);
    approvalsApi.getApproval(selectedId)
      .then(d => { if (!cancelled) setDetail(d); })
      .catch(err => {
        if (cancelled) return;
        const msg = err instanceof ApiError ? err.message : "加载审批详情失败";
        console.error("[ApprovalCenter] 加载详情失败：", msg);
        pushToast(msg, "error");
      })
      .finally(() => { if (!cancelled) setDetailLoading(false); });
    return () => { cancelled = true; };
  }, [selectedId, pushToast]);

  const pendingCount = useMemo(() => approvals.filter(a => isPending(a.status)).length, [approvals]);

  // 类型计数由数据计算
  const typeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const a of approvals) counts.set(a.approval_type, (counts.get(a.approval_type) ?? 0) + 1);
    const arr: { type: string; count: number }[] = [{ type: "全部审批", count: approvals.length }];
    for (const [type, count] of counts) arr.push({ type, count });
    return arr;
  }, [approvals]);

  const filtered = useMemo(() => approvals.filter(a => {
    const matchType = selectedType === "全部审批" || a.approval_type === selectedType;
    const matchTab = bottomTab === "history" ? !isPending(a.status) : isPending(a.status);
    return matchType && matchTab;
  }), [approvals, selectedType, bottomTab]);

  const selected = approvals.find(a => a.id === selectedId) ?? null;
  const selectedStatus = detail?.status ?? selected?.status ?? null;

  async function decide(id: number, approve: boolean, commentText: string) {
    setDeciding(true);
    try {
      await approvalsApi.decideApproval(id, approve, commentText);
      pushToast(approve ? "已同意该审批，回调已执行" : "已拒绝该审批", "success");
      setComment("");
      await loadApprovals();
      // 刷新详情以拿到最新流转记录
      if (selectedId === id) {
        try {
          const d = await approvalsApi.getApproval(id);
          setDetail(d);
        } catch { /* 详情刷新失败不阻断主流程 */ }
      }
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "审批操作失败";
      console.error("[ApprovalCenter] 审批决策失败：", msg);
      pushToast(msg, "error");
    } finally {
      setDeciding(false);
    }
  }

  const detailData = detail?.detail ?? selected?.detail ?? {};

  return (
    <div className="h-full flex flex-col" style={{ background: L.bg }}>
      {/* Toast */}
      {toast && (
        <div className="fixed top-16 left-1/2 z-[80] -translate-x-1/2 px-4 py-2.5 rounded-lg shadow-2xl flex items-center gap-2"
          style={{
            fontSize: 12,
            color: toast.kind === "success" ? "#34d399" : "#f87171",
            background: L.surface,
            border: `1px solid ${toast.kind === "success" ? "rgba(16,185,129,0.4)" : "rgba(239,68,68,0.4)"}`,
          }}>
          {toast.kind === "success" ? <Check size={14} /> : <AlertTriangle size={14} />}
          {toast.text}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4" style={{ background: L.surface, borderBottom: `1px solid ${L.border}` }}>
        <div className="flex items-center gap-3">
          <h2 className="font-semibold text-base" style={{ color: L.text }}>审批中心</h2>
          {pendingCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-bold"
              style={{ background: "rgba(239,68,68,0.15)", color: "#f87171" }}>
              {pendingCount} 待处理
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button onClick={loadApprovals} title="刷新" className="flex items-center gap-1 text-xs px-2 py-1 rounded-md" style={{ color: L.textSec, background: L.surface2, border: `1px solid ${L.border}` }}>
            <RefreshCw size={11} className={loading ? "animate-spin" : ""} /> 刷新
          </button>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#ef4444" }} />
            <span className="text-xs" style={{ color: L.muted }}>实时同步</span>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar */}
        <div className="w-52 flex-shrink-0 flex flex-col gap-1 p-3 overflow-y-auto" style={{ background: L.surface, borderRight: `1px solid ${L.border}` }}>
          <div className="text-xs font-semibold px-2 py-1 mb-1" style={{ color: L.muted }}>审批类型</div>
          {typeCounts.map(tc => {
            const isAll = tc.type === "全部审批";
            const cfg = isAll ? { bg: L.primaryBg, color: L.primary } : typeCfg(tc.type);
            const active = selectedType === tc.type;
            return (
              <button key={tc.type}
                onClick={() => { setSelectedType(tc.type); setSelectedId(null); }}
                className="flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left"
                style={active
                  ? { background: L.primaryBg, color: L.primary }
                  : { color: L.textSec, background: "transparent" }}>
                <div className="flex items-center gap-2">
                  {isAll
                    ? <UserCheck size={14} style={{ color: active ? L.primary : L.muted }} />
                    : <span style={{ color: cfg.color }}>{typeCfg(tc.type).icon}</span>}
                  <span>{tc.type}</span>
                </div>
                {tc.count > 0 ? (
                  <span className="text-xs px-1.5 py-0.5 rounded-full font-bold"
                    style={{ background: cfg.bg, color: cfg.color }}>
                    {tc.count}
                  </span>
                ) : (
                  <span className="text-xs px-1.5 py-0.5 rounded-full"
                    style={{ background: L.borderLight, color: L.mutedLight }}>0</span>
                )}
              </button>
            );
          })}

          <div className="my-2" style={{ borderTop: `1px solid ${L.border}` }} />

          <button onClick={() => setBottomTab("pending")}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
            style={bottomTab === "pending" ? { background: L.primaryBg, color: L.primary } : { color: L.textSec }}>
            <Clock size={14} /> 待处理
          </button>
          <button onClick={() => setBottomTab("history")}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
            style={bottomTab === "history" ? { background: L.primaryBg, color: L.primary } : { color: L.textSec }}>
            <RotateCcw size={14} /> 审批历史
          </button>
        </div>

        {/* Main content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Approval list */}
          <div className="flex flex-col overflow-y-auto" style={{ width: selected ? "42%" : "100%", borderRight: selected ? `1px solid ${L.border}` : "none" }}>
            <div className="px-4 py-3 flex items-center justify-between sticky top-0 z-10" style={{ background: L.bg, borderBottom: `1px solid ${L.border}` }}>
              <span className="text-xs font-medium" style={{ color: L.muted }}>
                {bottomTab === "history" ? "审批历史" : "待处理"} · {filtered.length} 条
              </span>
            </div>
            <div className="flex flex-col gap-0">
              {loading && (
                <div className="py-16 flex items-center justify-center gap-2" style={{ color: L.muted }}>
                  <Loader2 size={16} className="animate-spin" /> <span className="text-sm">正在加载审批…</span>
                </div>
              )}
              {!loading && error && (
                <div className="py-16 text-center" style={{ color: "#f87171" }}>
                  <AlertTriangle size={24} className="mx-auto mb-2" />
                  <div className="text-sm">{error}</div>
                  <button onClick={loadApprovals} className="mt-3 text-xs px-3 py-1.5 rounded-lg" style={{ border: `1px solid ${L.border}`, color: L.textSec }}>重试</button>
                </div>
              )}
              {!loading && !error && filtered.length === 0 && (
                <div className="py-16 text-center" style={{ color: L.muted }}>
                  <div className="text-3xl mb-2">🎉</div>
                  <div className="text-sm">暂无{bottomTab === "history" ? "历史" : "待审批"}记录</div>
                </div>
              )}
              {!loading && !error && filtered.map(a => {
                const tCfg = typeCfg(a.approval_type);
                const sCfg = statusCfg(a.status);
                const isSelected = selectedId === a.id;
                return (
                  <div key={a.id}
                    onClick={() => setSelectedId(isSelected ? null : a.id)}
                    className="px-4 py-3.5 cursor-pointer transition-colors"
                    style={{
                      background: isSelected ? L.primaryBg : L.surface,
                      borderBottom: `1px solid ${L.borderLight}`,
                      borderLeft: isSelected ? `3px solid ${L.primary}` : "3px solid transparent",
                    }}>
                    <div className="flex items-start justify-between mb-1.5">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {a.urgent && (
                          <AlertTriangle size={13} className="flex-shrink-0" style={{ color: "#ef4444" }} />
                        )}
                        <span className="text-sm font-medium truncate" style={{ color: L.text }}>{a.title}</span>
                      </div>
                      <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
                        <span className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                          style={{ background: sCfg.bg, color: sCfg.color }}>
                          {a.status}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs px-1.5 py-0.5 rounded-full flex items-center gap-1 font-medium"
                        style={{ background: tCfg.bg, color: tCfg.color }}>
                        {tCfg.icon} {a.approval_type}
                      </span>
                      <span className="text-xs" style={{ color: L.muted }}>{a.submitter}</span>
                      <span className="text-xs" style={{ color: L.mutedLight }}>·</span>
                      <span className="text-xs" style={{ color: L.mutedLight }}>{relTime(a.created_at)}</span>
                    </div>
                    <p className="text-xs line-clamp-1" style={{ color: L.muted }}>{summary(a.detail)}</p>
                    {a.status === "待审批" && (
                      <div className="flex gap-2 mt-2.5" onClick={e => e.stopPropagation()}>
                        <button onClick={() => decide(a.id, true, "")} disabled={deciding}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium hover:opacity-80 transition-opacity disabled:opacity-50"
                          style={{ background: "rgba(16,185,129,0.15)", color: "#34d399" }}>
                          <Check size={11} /> 同意
                        </button>
                        <button onClick={() => decide(a.id, false, "")} disabled={deciding}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium hover:opacity-80 transition-opacity disabled:opacity-50"
                          style={{ background: "rgba(239,68,68,0.15)", color: "#f87171" }}>
                          <X size={11} /> 拒绝
                        </button>
                        <button onClick={() => setSelectedId(a.id)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border hover:opacity-80 transition-opacity"
                          style={{ color: L.primary, borderColor: L.primary, background: "transparent" }}>
                          查看详情 <ChevronRight size={11} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Detail panel */}
          {selected && (
            <div className="flex-1 overflow-y-auto flex flex-col" style={{ background: L.surface }}>
              <div className="flex items-center justify-between px-5 py-3.5 sticky top-0 z-10"
                style={{ background: L.surface, borderBottom: `1px solid ${L.border}` }}>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold" style={{ color: L.text }}>审批详情</span>
                  {selectedStatus && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                      style={{ background: statusCfg(selectedStatus).bg, color: statusCfg(selectedStatus).color }}>
                      {selectedStatus}
                    </span>
                  )}
                  {detailLoading && <Loader2 size={13} className="animate-spin" style={{ color: L.muted }} />}
                </div>
                <button onClick={() => setSelectedId(null)} className="p-1.5 rounded-lg hover:opacity-70"
                  style={{ color: L.muted }}>
                  <X size={16} />
                </button>
              </div>

              <div className="p-5 flex flex-col gap-4">
                {/* Info card */}
                <div className="rounded-xl p-4" style={{ background: L.bg, border: `1px solid ${L.border}` }}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                      style={{ background: typeCfg(selected.approval_type).bg, color: typeCfg(selected.approval_type).color }}>
                      {typeCfg(selected.approval_type).icon}
                    </div>
                    <div>
                      <div className="font-semibold text-sm" style={{ color: L.text }}>{selected.title}</div>
                      <div className="text-xs mt-0.5 flex items-center gap-2" style={{ color: L.muted }}>
                        <span>{selected.submitter}</span>
                        <span>·</span>
                        <span>{relTime(selected.created_at)}提交</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: L.textSec }}>{summary(detailData)}</p>
                </div>

                {/* Detail fields */}
                <div>
                  <div className="text-xs font-semibold mb-2" style={{ color: L.muted }}>详细信息</div>
                  <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${L.border}` }}>
                    {Object.entries(detailData).map(([k, v], i, arr) => (
                      <div key={k} className="flex items-center justify-between px-4 py-2.5"
                        style={{ borderBottom: i < arr.length - 1 ? `1px solid ${L.borderLight}` : "none", background: i % 2 === 0 ? L.surface : L.bg }}>
                        <span className="text-xs" style={{ color: L.muted }}>{k}</span>
                        <span className="text-xs font-medium" style={{ color: L.text }}>{String(v)}</span>
                      </div>
                    ))}
                    {Object.keys(detailData).length === 0 && (
                      <div className="px-4 py-3 text-xs" style={{ color: L.muted }}>暂无详情字段</div>
                    )}
                  </div>
                </div>

                {/* Related records for specific types */}
                {selected.approval_type.includes("退款") && detailData["金额"] && (
                  <div>
                    <div className="text-xs font-semibold mb-2" style={{ color: L.muted }}>相关订单记录</div>
                    <div className="rounded-xl p-3 flex items-center gap-3" style={{ background: "#fff7ed", border: "1px solid #fed7aa" }}>
                      <CreditCard size={16} style={{ color: "#ea580c" }} />
                      <div>
                        <div className="text-xs font-medium" style={{ color: "#c2410c" }}>历史消费记录</div>
                        <div className="text-xs mt-0.5" style={{ color: "#ea580c" }}>
                          总额 {detailData["金额"]}
                          {detailData["已使用天数"] ? ` · 已使用 ${detailData["已使用天数"]} 天` : ""}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {selected.approval_type === "账号交接" && (
                  <div>
                    <div className="text-xs font-semibold mb-2" style={{ color: L.muted }}>账号信息</div>
                    <div className="rounded-xl p-3 flex items-center gap-3" style={{ background: "#fffbeb", border: "1px solid #fde68a" }}>
                      <ArrowRightLeft size={16} style={{ color: "#d97706" }} />
                      <div>
                        <div className="text-xs font-medium" style={{ color: "#b45309" }}>微信号 {detailData["微信号"] ?? "—"}</div>
                        <div className="text-xs mt-0.5" style={{ color: "#d97706" }}>
                          好友 {detailData["好友数"] ?? detailData["粉丝数"] ?? "—"} · 所属城市 {detailData["所属城市"] ?? "—"}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Approval form */}
                {selectedStatus && isPending(selectedStatus) ? (
                  <div className="rounded-xl p-4" style={{ border: `1px solid ${L.border}` }}>
                    <div className="text-xs font-semibold mb-2 flex items-center gap-1.5" style={{ color: L.text }}>
                      <MessageSquare size={13} /> 审批意见
                    </div>
                    <textarea
                      value={comment}
                      onChange={e => setComment(e.target.value)}
                      rows={3}
                      placeholder="请输入审批意见（可选）…"
                      className="w-full px-3 py-2 rounded-lg text-xs outline-none resize-none mb-3"
                      style={{ border: `1px solid ${L.border}`, color: L.text, background: L.bg }}
                    />
                    <div className="flex gap-2">
                      <button onClick={() => decide(selected.id, true, comment)} disabled={deciding}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                        style={{ background: "#10b981", color: "#fff" }}>
                        {deciding ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} 同意
                      </button>
                      <button onClick={() => decide(selected.id, false, comment)} disabled={deciding}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                        style={{ background: "#ef4444", color: "#fff" }}>
                        {deciding ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />} 拒绝
                      </button>
                    </div>
                  </div>
                ) : selectedStatus ? (
                  <div className="rounded-xl p-4 flex items-center gap-3"
                    style={{ background: statusCfg(selectedStatus).bg, border: `1px solid ${statusCfg(selectedStatus).color}22` }}>
                    {selectedStatus === "已同意"
                      ? <Check size={16} style={{ color: statusCfg(selectedStatus).color }} />
                      : <X size={16} style={{ color: statusCfg(selectedStatus).color }} />}
                    <div>
                      <div className="text-xs font-semibold" style={{ color: statusCfg(selectedStatus).color }}>
                        {selectedStatus === "已同意" ? "审批已通过" : "审批已拒绝"}
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: statusCfg(selectedStatus).color }}>
                        {selectedStatus === "已同意" ? "该申请已被批准，相关回调已执行" : "该申请已被拒绝"}
                        {detail?.decision_comment ? `：${detail.decision_comment}` : ""}
                      </div>
                    </div>
                  </div>
                ) : null}

                {/* Approval history timeline */}
                <div>
                  <div className="text-xs font-semibold mb-3" style={{ color: L.muted }}>审批流转记录</div>
                  <div className="flex flex-col gap-0 relative">
                    <div className="absolute left-3.5 top-4 bottom-4 w-px" style={{ background: L.border }} />
                    {(detail?.history ?? []).map((h, i, arr) => (
                      <div key={h.id ?? i} className="flex items-start gap-3 pb-4 relative">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 z-10 text-xs font-bold"
                          style={i === arr.length - 1
                            ? { background: L.primary, color: "#fff" }
                            : { background: L.surface, border: `2px solid ${L.border}`, color: L.muted }}>
                          {i + 1}
                        </div>
                        <div className="flex-1 pt-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium" style={{ color: L.text }}>{h.actor}</span>
                            <span className="text-xs" style={{ color: L.mutedLight }}>·</span>
                            <span className="text-xs" style={{ color: L.mutedLight }}>{relTime(h.created_at)}</span>
                          </div>
                          <div className="text-xs mt-0.5" style={{ color: L.muted }}>{h.action}</div>
                          {h.comment && (
                            <div className="mt-1 px-2 py-1.5 rounded-lg text-xs" style={{ background: L.bg, color: L.textSec }}>
                              “{h.comment}”
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {!detailLoading && (detail?.history?.length ?? 0) === 0 && (
                      <div className="text-xs pl-10" style={{ color: L.mutedLight }}>暂无流转记录</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
