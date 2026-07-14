import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, Zap, CheckCircle, ChevronRight, Users, AlertTriangle, Loader2, ShieldAlert, X } from "lucide-react";
import { useProject } from "../contexts/ProjectContext";
import { assignmentApi, ApiError } from "../../api";
import type { PendingMember, RecommendResult, RecommendedGroup, AssignmentRow } from "../../api/assignment";

const L = {
  bg: "#0d1629",
  surface: "#131f35",
  border: "rgba(255,255,255,0.07)",
  borderLight: "rgba(255,255,255,0.04)",
  primary: "#4361ee",
  primaryBg: "rgba(67,97,238,0.15)",
  text: "#e2e8f0",
  textSec: "#94a3b8",
  muted: "#64748b",
  mutedLight: "#475569",
  surface2: "#1a2640",
};

/** 覆盖原因弹层的纯白黄绿黑主题（对齐 PCLayout D 常量，A7.1） */
const D = {
  bg: "#ffffff",
  surface2: "#f7ffd9",
  border: "rgba(5,8,5,0.14)",
  primary: "#b6ff00",
  ink: "#050805",
  textSec: "#2f3a29",
  muted: "#68705a",
  danger: "#ff4d4f",
};

const identityColor: Record<string, string> = {
  "PRO会员": "#4361ee", "体验官": "#059669", "游客": "#6b7280", "代理": "#2563eb", "城市分站": "#7c3aed", "尊享官": "#7c3aed",
};

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
  return `${Math.floor(hours / 24)} 天前`;
}

interface Toast { text: string; kind: "success" | "error"; }
interface OverrideTarget { group: RecommendedGroup; }

export default function GroupAssignment() {
  const { currentProject } = useProject();
  const projectId = currentProject.id;

  const [pending, setPending] = useState<PendingMember[]>([]);
  const [pendingLoading, setPendingLoading] = useState(true);
  const [selectedMemberNo, setSelectedMemberNo] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [recommend, setRecommend] = useState<RecommendResult | null>(null);
  const [recommending, setRecommending] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [toast, setToast] = useState<Toast | null>(null);

  // 覆盖原因弹层
  const [override, setOverride] = useState<OverrideTarget | null>(null);
  const [overrideReason, setOverrideReason] = useState("");
  const [overrideError, setOverrideError] = useState("");

  const pushToast = useCallback((text: string, kind: "success" | "error" = "success") => setToast({ text, kind }), []);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const loadPending = useCallback(async () => {
    if (!projectId) { setPending([]); setPendingLoading(false); return; }
    setPendingLoading(true);
    try {
      const rows = await assignmentApi.listPending(projectId);
      setPending(rows);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "加载待分配用户失败";
      console.error("[GroupAssignment] 加载待分配失败：", msg);
      pushToast(msg, "error");
      setPending([]);
    } finally {
      setPendingLoading(false);
    }
  }, [projectId, pushToast]);

  const loadAssignments = useCallback(async () => {
    if (!projectId) { setAssignments([]); return; }
    try {
      const rows = await assignmentApi.listAssignments({ projectId });
      setAssignments(rows);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "加载分配记录失败";
      console.error("[GroupAssignment] 加载分配记录失败：", msg);
    }
  }, [projectId]);

  // 项目切换时重置并重新拉取
  useEffect(() => {
    setSelectedMemberNo(null);
    setRecommend(null);
    loadPending();
    loadAssignments();
  }, [loadPending, loadAssignments]);

  const filteredUsers = useMemo(() => pending.filter(u =>
    (u.name ?? "").includes(search) || (u.phone ?? "").includes(search) || (u.city ?? "").includes(search)
  ), [pending, search]);

  const selectedUser = pending.find(u => u.member_no === selectedMemberNo) ?? null;

  function selectUser(memberNo: string) {
    setSelectedMemberNo(memberNo);
    setRecommend(null);
  }

  async function runRecommend() {
    if (!selectedUser || !projectId) return;
    setRecommending(true);
    setRecommend(null);
    try {
      const result = await assignmentApi.recommend(selectedUser.member_no, projectId);
      setRecommend(result);
      if (!result.recommendation.best) {
        pushToast("暂无匹配群组，请人工处理", "error");
      }
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "AI 推荐失败";
      console.error("[GroupAssignment] 推荐失败：", msg);
      pushToast(msg, "error");
    } finally {
      setRecommending(false);
    }
  }

  async function doConfirm(params: { groupId?: string; overrideReason?: string }) {
    if (!recommend) return;
    setConfirming(true);
    try {
      const res = await assignmentApi.confirm({ assignmentId: recommend.assignmentId, ...params });
      pushToast(`分配成功，进入「${res.status}」`, "success");
      setOverride(null);
      setOverrideReason("");
      setOverrideError("");
      setRecommend(null);
      setSelectedMemberNo(null);
      await Promise.all([loadPending(), loadAssignments()]);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "确认分配失败";
      console.error("[GroupAssignment] 确认分配失败：", msg);
      if (override) setOverrideError(msg); else pushToast(msg, "error");
    } finally {
      setConfirming(false);
    }
  }

  function onCardAction(group: RecommendedGroup, isBest: boolean) {
    if (isBest) {
      doConfirm({});
    } else {
      setOverrideReason("");
      setOverrideError("");
      setOverride({ group });
    }
  }

  const best = recommend?.recommendation.best ?? null;
  const alternatives = recommend?.recommendation.alternatives ?? [];
  const cards: { group: RecommendedGroup; isBest: boolean }[] = useMemo(() => {
    const list: { group: RecommendedGroup; isBest: boolean }[] = [];
    if (best) list.push({ group: best, isBest: true });
    for (const g of alternatives) list.push({ group: g, isBest: false });
    return list;
  }, [best, alternatives]);

  return (
    <div className="p-6 h-full flex flex-col gap-4" style={{ background: L.bg }}>
      {/* Toast */}
      {toast && (
        <div className="fixed top-16 left-1/2 z-[80] -translate-x-1/2 px-4 py-2.5 rounded-lg shadow-2xl flex items-center gap-2"
          style={{
            fontSize: 12,
            color: toast.kind === "success" ? "#34d399" : "#f87171",
            background: L.surface,
            border: `1px solid ${toast.kind === "success" ? "rgba(16,185,129,0.4)" : "rgba(239,68,68,0.4)"}`,
          }}>
          {toast.kind === "success" ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
          {toast.text}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold" style={{ color: L.text }}>会员入群分配</h2>
          <p className="text-xs mt-0.5" style={{ color: L.muted }}>在项目资源和客服编组完成后，根据会员属性推荐合适群组</p>
        </div>
        <div className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg" style={{ background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.3)", color: "#fbbf24" }}>
          <AlertTriangle size={12} /> 待分配 {pending.length} 人
        </div>
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* Left: pending users */}
        <div className="w-64 flex-shrink-0 flex flex-col gap-3">
          <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg" style={{ background: "#1a2640", border: `1px solid ${L.border}` }}>
            <Search size={12} style={{ color: L.muted }} />
            <input className="bg-transparent outline-none text-xs flex-1" style={{ color: L.textSec }} placeholder="搜索待分配用户..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="text-xs px-1" style={{ color: L.muted }}>待分配用户 ({filteredUsers.length})</div>
          <div className="flex-1 overflow-auto space-y-2 pr-1">
            {pendingLoading && (
              <div className="flex items-center justify-center gap-2 py-8" style={{ color: L.muted }}>
                <Loader2 size={14} className="animate-spin" /> <span className="text-xs">加载中…</span>
              </div>
            )}
            {!pendingLoading && filteredUsers.length === 0 && (
              <div className="text-center py-8 text-xs" style={{ color: L.muted }}>暂无待分配用户</div>
            )}
            {!pendingLoading && filteredUsers.map(u => {
              const isSelected = selectedMemberNo === u.member_no;
              return (
                <div
                  key={u.member_no}
                  className="rounded-xl p-3 cursor-pointer transition-all"
                  style={{ background: isSelected ? L.primaryBg : L.surface, border: isSelected ? `1px solid ${L.primary}` : `1px solid ${L.border}`, borderLeft: isSelected ? `2px solid ${L.primary}` : `1px solid ${L.border}` }}
                  onClick={() => selectUser(u.member_no)}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs text-white font-semibold flex-shrink-0" style={{ background: "linear-gradient(135deg, #4361ee, #3451d1)" }}>
                      {(u.name ?? "?")[0]}
                    </div>
                    <div>
                      <div className="text-xs font-medium" style={{ color: isSelected ? L.primary : L.text }}>{u.name}</div>
                      <div className="text-xs" style={{ color: L.muted }}>{u.city ?? "—"} · {u.identity ?? "—"}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Center: AI recommendation */}
        <div className="flex-1 flex flex-col gap-4 min-h-0 overflow-auto">
          {selectedUser ? (
            <>
              {/* User info card */}
              <div className="rounded-xl p-4" style={{ background: L.surface, border: `1px solid ${L.border}` }}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm text-white font-semibold" style={{ background: "linear-gradient(135deg, #4361ee, #3451d1)" }}>
                    {(selectedUser.name ?? "?")[0]}
                  </div>
                  <div>
                    <div className="text-sm font-semibold" style={{ color: L.text }}>{selectedUser.name}</div>
                    <div className="text-xs" style={{ color: L.muted }}>{selectedUser.phone ?? "—"} · {selectedUser.member_no}</div>
                  </div>
                  <span className="ml-auto px-2 py-0.5 rounded-full text-xs" style={{ background: L.primaryBg, color: identityColor[selectedUser.identity ?? ""] ?? L.primary }}>
                    {selectedUser.identity ?? "—"}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "城市", value: selectedUser.city ?? "—" },
                    { label: "来源渠道", value: selectedUser.source_channel ?? "—" },
                    { label: "推荐人", value: selectedUser.referrer_name ?? "—" },
                  ].map(r => (
                    <div key={r.label} className="px-2.5 py-2 rounded-lg" style={{ background: L.bg }}>
                      <div className="text-xs" style={{ color: L.muted }}>{r.label}</div>
                      <div className="text-xs font-medium mt-0.5" style={{ color: L.textSec }}>{r.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Recommendations */}
              <div className="rounded-xl p-4 flex-1" style={{ background: L.surface, border: `1px solid ${L.border}` }}>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: "linear-gradient(135deg, #4361ee, #3451d1)" }}>
                    <Zap size={11} className="text-white" />
                  </div>
                  <span className="text-sm font-medium" style={{ color: L.text }}>AI 推荐群组</span>
                  <span className="text-xs" style={{ color: L.muted }}>根据城市、身份、群容量综合评分</span>
                  <button
                    onClick={runRecommend}
                    disabled={recommending}
                    className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-all disabled:opacity-60"
                    style={{ background: "linear-gradient(135deg, #4361ee, #3451d1)" }}
                  >
                    {recommending ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
                    {recommend ? "重新推荐" : "AI 推荐"}
                  </button>
                </div>

                {recommending && (
                  <div className="text-center py-10" style={{ color: L.muted }}>
                    <Loader2 size={22} className="mx-auto mb-2 animate-spin" />
                    <div className="text-sm">正在为 {selectedUser.name} 计算推荐…</div>
                  </div>
                )}

                {!recommending && !recommend && (
                  <div className="text-center py-10" style={{ color: L.muted }}>
                    <Zap size={24} className="mx-auto mb-2 opacity-40" />
                    <div className="text-sm">点击右上「AI 推荐」，为该会员计算合适群组</div>
                  </div>
                )}

                {!recommending && recommend && cards.length > 0 && (
                  <div className="space-y-3">
                    <div className="text-xs" style={{ color: L.muted }}>共 {recommend.recommendation.candidateCount} 个候选群</div>
                    {cards.map(({ group: g, isBest }, idx) => {
                      const pct = g.targetCapacity > 0 ? Math.min(100, Math.round((g.memberCount / g.targetCapacity) * 100)) : 0;
                      return (
                        <div
                          key={g.groupId}
                          className="rounded-xl p-3.5 transition-all"
                          style={{ background: L.bg, border: isBest ? "1px solid rgba(67,97,238,0.4)" : `1px solid ${L.border}` }}
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-semibold flex-shrink-0" style={{ background: isBest ? "linear-gradient(135deg, #4361ee, #3451d1)" : L.primaryBg, color: isBest ? "white" : L.primary }}>
                              {idx + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-medium" style={{ color: L.text }}>{g.groupName}</span>
                                {isBest && <span className="px-1.5 py-0.5 rounded-full text-xs" style={{ background: L.primaryBg, color: L.primary }}>最佳推荐</span>}
                                <span className="px-1.5 py-0.5 rounded-full text-xs" style={{ background: "rgba(16,185,129,0.15)", color: "#34d399" }}>推荐分 {g.score.toFixed(1)}</span>
                              </div>
                              <div className="text-xs mt-1 flex items-center gap-3 flex-wrap" style={{ color: L.muted }}>
                                <span><Users size={10} className="inline mr-1" />{g.memberCount}/{g.targetCapacity}</span>
                                <span>个微：{g.personalWechatId ?? "—"}</span>
                              </div>
                              {/* 命中规则 */}
                              {g.hitRules.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {g.hitRules.map((r, i) => (
                                    <span key={i} className="px-1.5 py-0.5 rounded text-xs" style={{ background: L.primaryBg, color: L.textSec, fontSize: 10 }}>{r}</span>
                                  ))}
                                </div>
                              )}
                              {/* 风险提示 */}
                              {g.riskHints.length > 0 && (
                                <div className="mt-1.5 flex flex-col gap-1">
                                  {g.riskHints.map((r, i) => (
                                    <span key={i} className="inline-flex items-center gap-1 text-xs" style={{ color: "#fbbf24" }}>
                                      <ShieldAlert size={11} /> {r}
                                    </span>
                                  ))}
                                </div>
                              )}
                              <div className="mt-2 h-1 rounded-full overflow-hidden" style={{ background: L.border }}>
                                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: pct >= 90 ? "#ef4444" : L.primary }} />
                              </div>
                            </div>
                            <button
                              disabled={confirming}
                              className="px-2.5 py-1.5 rounded-lg text-xs flex-shrink-0 text-white transition-all disabled:opacity-60"
                              style={{ background: isBest ? "linear-gradient(135deg, #4361ee, #3451d1)" : "transparent", border: isBest ? "none" : `1px solid ${L.primary}`, color: isBest ? "#fff" : L.primary }}
                              onClick={() => onCardAction(g, isBest)}
                            >
                              {isBest ? "确认分配" : "选此群"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {!recommending && recommend && cards.length === 0 && (
                  <div className="text-center py-8" style={{ color: L.muted }}>
                    <AlertTriangle size={24} className="mx-auto mb-2" />
                    <div className="text-sm">暂无匹配的群组</div>
                    <div className="text-xs mt-1">请人工处理或创建新群</div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center rounded-xl" style={{ background: L.surface, border: `1px solid ${L.border}` }}>
              <div className="text-center" style={{ color: L.muted }}>
                <Users size={32} className="mx-auto mb-2 opacity-30" />
                <div className="text-sm">选择左侧待分配用户</div>
              </div>
            </div>
          )}
        </div>

        {/* Right: recent assignments */}
        <div className="w-56 flex-shrink-0">
          <div className="rounded-xl p-4" style={{ background: L.surface, border: `1px solid ${L.border}` }}>
            <div className="text-sm font-medium mb-3" style={{ color: L.text }}>最近分配记录</div>
            <div className="space-y-3 max-h-[60vh] overflow-auto">
              {assignments.length === 0 && (
                <div className="text-xs" style={{ color: L.muted }}>暂无分配记录</div>
              )}
              {assignments.map(h => {
                const isAi = (h.assign_way ?? "").includes("AI");
                return (
                  <div key={h.id} className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: isAi ? L.primary : "#f59e0b" }} />
                    <div className="min-w-0">
                      <div className="text-xs font-medium" style={{ color: L.textSec }}>{h.member_name ?? h.member_no}</div>
                      <div className="text-xs mt-0.5 truncate" style={{ color: L.muted }}>{h.group_name ?? "—"}</div>
                      <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                        <span className="text-xs" style={{ color: L.muted }}>{relTime(h.recommended_at ?? h.created_at)}</span>
                        <span className="px-1 py-0.5 rounded" style={{ background: isAi ? L.primaryBg : "rgba(245,158,11,0.15)", color: isAi ? L.primary : "#fbbf24", fontSize: "10px" }}>{h.assign_way ?? "—"}</span>
                        <span className="px-1 py-0.5 rounded" style={{ background: L.surface2, color: L.textSec, fontSize: "10px" }}>{h.status}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 覆盖原因弹层（纯白黄绿黑，A7.1） */}
      {override && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center" style={{ background: "rgba(5,8,5,0.55)" }}>
          <div className="w-[400px] rounded-2xl p-5 shadow-2xl" style={{ background: D.bg, border: `1px solid ${D.border}` }}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <ShieldAlert size={16} style={{ color: D.ink }} />
                <span className="font-semibold" style={{ color: D.ink, fontSize: 14 }}>人工调整 · 覆盖原因</span>
              </div>
              <button aria-label="关闭" onClick={() => { if (!confirming) setOverride(null); }} className="p-1 rounded-md">
                <X size={16} style={{ color: D.muted }} />
              </button>
            </div>
            <p className="mb-3" style={{ color: D.muted, fontSize: 11 }}>
              你选择了非推荐群「{override.group.groupName}」，按 SPEC §7.4 必须填写覆盖原因，将写入审计。
            </p>
            <textarea
              value={overrideReason}
              onChange={e => { setOverrideReason(e.target.value); setOverrideError(""); }}
              rows={3}
              placeholder="请填写改选该群的原因（必填）…"
              className="w-full px-3 py-2 rounded-lg text-xs outline-none resize-none"
              style={{ background: D.surface2, border: `1px solid ${overrideError ? D.danger : D.border}`, color: D.ink }}
            />
            {overrideError && (
              <div className="mt-1.5 flex items-center gap-1" style={{ color: D.danger, fontSize: 11 }}>
                <AlertTriangle size={12} /> {overrideError}
              </div>
            )}
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => { if (!confirming) setOverride(null); }}
                disabled={confirming}
                className="flex-1 py-2 rounded-lg text-sm font-medium disabled:opacity-60"
                style={{ background: D.surface2, border: `1px solid ${D.border}`, color: D.textSec }}
              >
                取消
              </button>
              <button
                onClick={() => {
                  if (!overrideReason.trim()) { setOverrideError("请填写覆盖原因"); return; }
                  doConfirm({ groupId: override.group.groupId, overrideReason: overrideReason.trim() });
                }}
                disabled={confirming}
                className="flex-1 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 disabled:opacity-60"
                style={{ background: D.primary, color: D.ink }}
              >
                {confirming ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />} 确认分配
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
