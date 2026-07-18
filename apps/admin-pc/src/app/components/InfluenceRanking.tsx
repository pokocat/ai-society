import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import {
  Search, QrCode, ChevronRight, TrendingUp, Clock, CheckCircle,
  Send, MoreHorizontal, ShoppingCart, Loader2, AlertTriangle, Network,
} from "lucide-react";
import { ApiError, membersApi, referralApi, tasksApi } from "../../api";
import type { MemberRow, MemberProfile, TimelineEvent } from "../../api/members";
import type { ReferralChain, InfluenceCell } from "../../api/referral";
import type { TaskRow } from "../../api/tasks";
import { useProject } from "../contexts/ProjectContext";

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

// 任务状态分桶（对齐后端 TaskService.TRANSITIONS 状态机）
const TASK_BUCKETS: Record<string, string[]> = {
  "待处理": ["待创建", "待领取", "已分配"],
  "进行中": ["处理中", "待复核"],
  "已完成": ["已完成"],
  "异常":   ["失败", "超时", "需人工处理", "已取消"],
};

const taskStatusStyle = (status: string) => {
  if (status === "已完成") return { bg: "rgba(16,185,129,0.15)", color: "#34d399" };
  if (TASK_BUCKETS["进行中"].includes(status)) return { bg: "rgba(67,97,238,0.15)", color: "#818cf8" };
  if (TASK_BUCKETS["异常"].includes(status)) return { bg: "rgba(239,68,68,0.15)", color: "#f87171" };
  return { bg: "rgba(245,158,11,0.15)", color: "#fbbf24" };
};

const fmtDate = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString("zh-CN") : "—");
const fmtTime = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleString("zh-CN", { hour12: false }) : "—");

/** 影响力口径：以 referrer_no 在前端重建 ≤3 级邀请图（listMembers 真实字段），排行按覆盖人数排序 */
interface RankEntry {
  row: MemberRow;
  lv1: number;
  lv2: number;
  lv3: number;
  total: number;
  rank: number;
}

interface TreeNodeData {
  name: string;
  memberNo: string;
  direct: number;
  children: TreeNodeData[];
}

function TreeNode({ node, depth = 0 }: { node: TreeNodeData; depth?: number }) {
  const [open, setOpen] = useState(depth < 2);
  const hasChildren = node.children.length > 0;
  const colors = ["#4361ee", "#10b981", "#f59e0b", "#f472b6"];
  return (
    <div style={{ paddingLeft: depth > 0 ? 16 : 0 }}>
      <div
        className="flex items-center gap-1.5 py-1 cursor-pointer group rounded-md px-1"
        style={{ background: depth === 0 ? L.primaryBg : "transparent" }}
        onClick={() => setOpen(v => !v)}
      >
        {hasChildren && (
          <ChevronRight size={12} style={{ color: L.muted, transform: open ? "rotate(90deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }} />
        )}
        {!hasChildren && <div style={{ width: 12 }} />}
        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: colors[depth % colors.length] }} />
        <span className="text-xs" style={{ color: depth === 0 ? L.text : L.textSec }}>
          {node.name}
          {node.direct > 0 && <span style={{ color: L.muted }}>（直推 {node.direct}）</span>}
        </span>
      </div>
      {open && hasChildren && (
        <div style={{ borderLeft: `1px dashed ${L.border}`, marginLeft: 5 }}>
          {node.children.map(c => <TreeNode key={c.memberNo} node={c} depth={depth + 1} />)}
        </div>
      )}
    </div>
  );
}

// ─── 主组件 ───────────────────────────────────────────────────
export default function InfluenceRanking() {
  const { currentProject } = useProject();
  const projectId = currentProject.id;

  const [members, setMembers] = useState<MemberRow[]>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [taskCategory, setTaskCategory] = useState("待处理");
  const [selectedNo, setSelectedNo] = useState("");
  const [detailTab, setDetailTab] = useState("待处理任务");
  const [rankSearch, setRankSearch] = useState("");
  const [treeSearch, setTreeSearch] = useState("");
  const [relationWidth, setRelationWidth] = useState(520);
  const relationAreaRef = useRef<HTMLDivElement>(null);

  const [chain, setChain] = useState<ReferralChain | null>(null);
  const [matrix, setMatrix] = useState<InfluenceCell[]>([]);
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  // 会员列表 + 任务列表并行拉取
  useEffect(() => {
    if (!projectId) return;
    let alive = true;
    setLoading(true); setError("");
    Promise.all([
      membersApi.listMembers({ projectId }),
      tasksApi.listTasks({ projectId }),
    ])
      .then(([rows, taskRows]) => {
        if (!alive) return;
        setMembers(rows);
        setTasks(taskRows);
      })
      .catch(e => { if (alive) setError(e instanceof ApiError ? e.message : "加载数据失败"); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [projectId]);

  // 邀请图（referrer_no → 子节点），排行 = ≤3 级覆盖人数（与后端 referral 物化路径同口径）
  const childrenMap = useMemo(() => {
    const m = new Map<string, MemberRow[]>();
    for (const row of members) {
      if (!row.referrer_no) continue;
      const arr = m.get(row.referrer_no) ?? [];
      arr.push(row);
      m.set(row.referrer_no, arr);
    }
    return m;
  }, [members]);

  const ranking = useMemo<RankEntry[]>(() => {
    const entries = members.map(row => {
      const lv1 = childrenMap.get(row.member_no) ?? [];
      const lv2 = lv1.flatMap(c => childrenMap.get(c.member_no) ?? []);
      const lv3 = lv2.flatMap(c => childrenMap.get(c.member_no) ?? []);
      return { row, lv1: lv1.length, lv2: lv2.length, lv3: lv3.length, total: lv1.length + lv2.length + lv3.length, rank: 0 };
    });
    entries.sort((a, b) => b.total - a.total || b.lv1 - a.lv1 || a.row.member_no.localeCompare(b.row.member_no));
    entries.forEach((e, i) => { e.rank = i + 1; });
    return entries;
  }, [members, childrenMap]);

  // 默认选中榜首
  useEffect(() => {
    if (ranking.length === 0) { setSelectedNo(""); return; }
    setSelectedNo(prev => (prev && ranking.some(e => e.row.member_no === prev) ? prev : ranking[0].row.member_no));
  }, [ranking]);

  // 选中会员：关系链 + 影响力矩阵（referralApi）+ 档案 + 时间线
  useEffect(() => {
    if (!selectedNo) { setChain(null); setMatrix([]); setProfile(null); setTimeline([]); return; }
    let alive = true;
    setDetailLoading(true); setDetailError("");
    Promise.all([
      referralApi.getChain(selectedNo),
      referralApi.getInfluenceMatrix(selectedNo),
      membersApi.getMemberProfile(selectedNo),
      membersApi.getMemberTimeline(selectedNo),
    ])
      .then(([c, m, pf, tl]) => { if (alive) { setChain(c); setMatrix(m); setProfile(pf); setTimeline(tl); } })
      .catch(e => { if (alive) setDetailError(e instanceof ApiError ? e.message : "加载会员详情失败"); })
      .finally(() => { if (alive) setDetailLoading(false); });
    return () => { alive = false; };
  }, [selectedNo]);

  const filteredRanking = ranking.filter(e => !rankSearch
    || e.row.name.includes(rankSearch) || e.row.member_no.includes(rankSearch) || (e.row.city ?? "").includes(rankSearch));

  // 任务分类计数 + 侧栏过滤
  const taskCategories = Object.keys(TASK_BUCKETS).map(label => ({
    label,
    count: tasks.filter(t => TASK_BUCKETS[label].includes(t.status)).length,
  }));
  const sideTasks = tasks.filter(t => TASK_BUCKETS[taskCategory]?.includes(t.status));

  // 关系树（前端邀请图，≤3 级）
  const rowByNo = useMemo(() => new Map(members.map(r => [r.member_no, r])), [members]);
  const buildTree = (memberNo: string, depth: number): TreeNodeData => {
    const row = rowByNo.get(memberNo);
    const kids = depth >= 3 ? [] : (childrenMap.get(memberNo) ?? []);
    return {
      name: row?.name ?? memberNo,
      memberNo,
      direct: (childrenMap.get(memberNo) ?? []).length,
      children: kids.map(k => buildTree(k.member_no, depth + 1)),
    };
  };
  const tree = selectedNo ? buildTree(selectedNo, 0) : null;
  const matchesTree = (n: TreeNodeData): boolean =>
    n.name.includes(treeSearch) || n.memberNo.includes(treeSearch) || n.children.some(matchesTree);
  const visibleTreeChildren = tree && treeSearch
    ? { ...tree, children: tree.children.filter(matchesTree) }
    : tree;

  // 影响力矩阵列
  const identityColumns = useMemo(
    () => Array.from(new Set(matrix.map(c => c.identity))).sort(),
    [matrix]);
  const matrixCell = (level: number, identity: string) =>
    matrix.find(c => Number(c.level) === level && c.identity === identity)?.member_count
    ?? (matrix.find(c => Number(c.level) === level && c.identity === identity) as any)?.cnt ?? 0;

  // 选中会员视图模型（真实字段；缺省 "—"）
  const selectedEntry = ranking.find(e => e.row.member_no === selectedNo);
  const sm = selectedEntry?.row;
  const p = profile as any;
  const identity = p?.projectIdentities?.find((x: any) => x.project_id === projectId)?.identity
    ?? p?.projectIdentities?.[0]?.identity ?? "游客";
  const groupsArr = (p?.groups ?? []) as any[];
  const orderList = (p?.orders ?? []) as any[];
  const followUps = (p?.followUps ?? []) as any[];
  const growth = Number(p?.growth ?? 0);
  const memberProfileFields: [string, string][] = [
    ["会员编号", sm?.member_no ?? "—"],
    ["会员身份", identity],
    ["入群状态", groupsArr.length > 0 ? "已入群" : "未入群"],
    ["成长值", String(growth)],
    ["覆盖人数(≤3级)", String(chain?.influence ?? selectedEntry?.total ?? 0)],
    ["一级直推", String(selectedEntry?.lv1 ?? 0)],
    ["城市", sm?.city ?? "—"],
    ["推荐人", sm?.referrer_name ?? "—"],
  ];

  const memberTasks = tasks.filter(t => t.member_no === selectedNo);
  const pendingMemberTasks = memberTasks.filter(t => !["已完成", "已取消"].includes(t.status));

  const detailTabs = ["待处理任务", "订单详情", "操作记录", "回访库"];

  const startRelationResize = (event: PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    const area = relationAreaRef.current;
    if (!area) return;
    const startX = event.clientX;
    const startWidth = relationWidth;
    const areaWidth = area.getBoundingClientRect().width;
    const minWidth = 320;
    const maxWidth = Math.max(minWidth, areaWidth - 300);

    const onPointerMove = (moveEvent: globalThis.PointerEvent) => {
      const nextWidth = startWidth + moveEvent.clientX - startX;
      setRelationWidth(Math.min(maxWidth, Math.max(minWidth, nextWidth)));
    };

    const onPointerUp = () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center" style={{ background: L.bg, color: L.muted, fontSize: "12px" }}>
        <Loader2 size={14} className="animate-spin mr-2" />加载影响力数据…
      </div>
    );
  }
  if (error) {
    return (
      <div className="h-full flex items-center justify-center" style={{ background: L.bg, color: "#f87171", fontSize: "12px" }}>
        <AlertTriangle size={14} className="mr-2" />{error}
      </div>
    );
  }

  return (
    <div className="h-full flex" style={{ background: L.bg }}>
      {/* ── 左侧任务列表（真实任务域数据） ─────────────────────── */}
      <div className="w-56 flex-shrink-0 flex flex-col" style={{ background: L.surface, borderRight: `1px solid ${L.border}` }}>
        <div className="px-4 py-3 flex-shrink-0" style={{ borderBottom: `1px solid ${L.border}` }}>
          <div className="text-sm font-semibold" style={{ color: L.text }}>任务中心</div>
        </div>

        {/* 任务分类 */}
        <div className="px-3 py-2 flex-shrink-0">
          {taskCategories.map(c => (
            <button key={c.label} onClick={() => setTaskCategory(c.label)} className="w-full flex items-center justify-between px-2 py-2 rounded-lg text-left mb-0.5 transition-all" style={{ background: taskCategory === c.label ? L.primaryBg : "transparent" }}>
              <span className="text-xs" style={{ color: taskCategory === c.label ? L.primary : L.muted }}>{c.label}</span>
              <span className="px-1.5 py-0.5 rounded-full text-xs" style={{ background: taskCategory === c.label ? L.primary : L.borderLight, color: taskCategory === c.label ? "#ffffff" : L.muted }}>{c.count}</span>
            </button>
          ))}
        </div>

        <div style={{ borderTop: `1px solid ${L.border}`, margin: "0 12px" }} />

        {/* 任务列表 */}
        <div className="flex-1 overflow-auto px-3 py-2 space-y-1">
          {sideTasks.length === 0 && (
            <div className="text-center py-6" style={{ color: L.muted, fontSize: "11px" }}>该分类暂无任务</div>
          )}
          {sideTasks.map(t => (
            <div key={t.id} className="px-2 py-2.5 rounded-xl transition-all" style={{ border: "1px solid transparent" }} title={`${t.task_type} · ${t.assignee_name ?? "未指派"}`}>
              <div className="flex items-start justify-between gap-1">
                <span className="text-xs font-medium leading-tight" style={{ color: L.textSec }}>{t.title}</span>
              </div>
              <div className="flex items-center justify-between mt-1.5">
                <span className="text-xs" style={{ color: L.muted, fontSize: "10px" }}>{t.member_name ?? t.group_name ?? t.task_type}</span>
                <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: taskStatusStyle(t.status).bg, color: taskStatusStyle(t.status).color, fontSize: "10px" }}>{t.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 中间区域 ──────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* 排行榜标题 + 搜索 */}
        <div className="flex items-center gap-2 px-4 pt-4 flex-shrink-0">
          <TrendingUp size={14} style={{ color: L.primary }} />
          <span className="text-sm font-medium" style={{ color: L.text }}>影响力排行榜</span>
          <span className="text-xs" style={{ color: L.muted }}>按 ≤3 级邀请覆盖人数排序 · {currentProject.shortName}</span>
          <div className="ml-auto flex items-center gap-2 px-2.5 py-1.5 rounded-lg" style={{ background: L.surface2, border: `1px solid ${L.border}` }}>
            <Search size={11} style={{ color: L.muted }} />
            <input className="bg-transparent outline-none text-xs w-32" style={{ color: L.textSec }} placeholder="搜索姓名/会员号/城市" value={rankSearch} onChange={e => setRankSearch(e.target.value)} />
          </div>
        </div>

        {/* 排行榜表格 */}
        <div className="mx-4 mt-3 rounded-xl overflow-auto flex-shrink-0" style={{ background: L.surface, border: `1px solid ${L.border}`, maxHeight: 260 }}>
          <div className="flex items-center px-3 py-2 text-xs sticky top-0" style={{ background: "#1a2640", borderBottom: `1px solid ${L.border}`, color: L.muted, zIndex: 1 }}>
            {[["排名", 44], ["头像", 44], ["姓名", 100], ["会员号", 90], ["城市", 90], ["身份", 90], ["推荐人", 90], ["一级", 54], ["二级", 54], ["三级", 54], ["覆盖", 64]].map(([l, w], i) => (
              <div key={i} className="flex-shrink-0" style={{ width: w as number }}>{l}</div>
            ))}
          </div>
          {filteredRanking.length === 0 && (
            <div className="text-center py-8" style={{ color: L.muted, fontSize: "12px" }}>暂无会员数据</div>
          )}
          {filteredRanking.map((e, idx) => {
            const u = e.row;
            const uIdentity = u.project_identities.find(pi => pi.projectId === projectId)?.identity
              ?? u.project_identities[0]?.identity ?? "游客";
            const isSel = selectedNo === u.member_no;
            return (
              <div key={u.member_no} className="flex items-center px-3 py-2.5 cursor-pointer text-xs transition-all" style={{ background: isSel ? L.primaryBg : idx % 2 === 0 ? "#131f35" : "#1a2640", borderBottom: `1px solid ${L.borderLight}`, borderLeft: isSel ? `2px solid ${L.primary}` : "2px solid transparent" }} onClick={() => setSelectedNo(u.member_no)}>
                <div className="flex-shrink-0" style={{ width: 44 }}>
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: e.rank <= 3 ? "linear-gradient(135deg, #f59e0b, #ef4444)" : L.primaryBg, color: e.rank <= 3 ? "white" : L.primary }}>{e.rank}</div>
                </div>
                <div className="flex-shrink-0" style={{ width: 44 }}>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-semibold text-white" style={{ background: L.primary }}>{(u.name || u.member_no)[0]}</div>
                </div>
                <div className="flex-shrink-0 font-medium" style={{ width: 100, color: isSel ? L.primary : L.text }}>{u.name}</div>
                <div className="flex-shrink-0" style={{ width: 90, color: L.muted }}>{u.member_no}</div>
                <div className="flex-shrink-0" style={{ width: 90, color: L.muted }}>{u.city ?? "—"}</div>
                <div className="flex-shrink-0" style={{ width: 90, color: L.textSec }}>{uIdentity}</div>
                <div className="flex-shrink-0" style={{ width: 90, color: L.muted }}>{u.referrer_name ?? "—"}</div>
                <div className="flex-shrink-0 font-medium" style={{ width: 54, color: "#10b981" }}>{e.lv1}</div>
                <div className="flex-shrink-0" style={{ width: 54, color: L.muted }}>{e.lv2}</div>
                <div className="flex-shrink-0" style={{ width: 54, color: L.muted }}>{e.lv3}</div>
                <div className="flex-shrink-0 font-bold" style={{ width: 64, color: "#f59e0b" }}>{e.total}</div>
              </div>
            );
          })}
        </div>

        {/* 底部：关系链 + 操作台 */}
        <div ref={relationAreaRef} className="flex gap-3 mx-3 mt-3 flex-1 min-h-0 overflow-hidden pb-4">
          {/* 关系链 */}
          <div
            className="min-w-0 rounded-xl p-4 overflow-auto"
            style={{ width: relationWidth, minWidth: 320, maxWidth: "calc(100% - 300px)", background: L.surface, border: `1px solid ${L.border}` }}
          >
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={14} style={{ color: L.primary }} />
              <span className="text-sm font-medium" style={{ color: L.text }}>关系链</span>
              <div className="ml-auto flex items-center gap-2 px-2.5 py-1.5 rounded-lg" style={{ background: "#1a2640", border: `1px solid ${L.border}` }}>
                <Search size={11} style={{ color: L.muted }} />
                <input className="bg-transparent outline-none text-xs w-20" style={{ color: L.textSec }} placeholder="搜索..." value={treeSearch} onChange={e => setTreeSearch(e.target.value)} />
              </div>
            </div>
            {visibleTreeChildren ? <TreeNode node={visibleTreeChildren} /> : (
              <div className="text-center py-6" style={{ color: L.muted, fontSize: "12px" }}>选择排行榜会员查看邀请关系</div>
            )}

            {/* 影响力矩阵（GET /referral/{no}/influence-matrix） */}
            <div className="mt-4 pt-3" style={{ borderTop: `1px solid ${L.border}` }}>
              <div className="flex items-center gap-2 mb-2">
                <Network size={12} style={{ color: L.primary }} />
                <span className="text-xs font-medium" style={{ color: L.text }}>影响力矩阵（层级 × 身份）</span>
              </div>
              {detailLoading ? (
                <div className="text-xs py-2 flex items-center" style={{ color: L.muted }}><Loader2 size={11} className="animate-spin mr-1.5" />加载中…</div>
              ) : matrix.length === 0 ? (
                <div className="text-xs py-2" style={{ color: L.muted }}>暂无下线数据</div>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ color: L.muted, borderBottom: `1px solid ${L.border}` }}>
                      <th className="text-left py-1.5 pr-2 font-medium">层级</th>
                      {identityColumns.map(i => <th key={i} className="text-left py-1.5 pr-2 font-medium">{i}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {[1, 2, 3].map(level => (
                      <tr key={level} style={{ color: L.textSec, borderBottom: `1px solid ${L.borderLight}` }}>
                        <td className="py-1.5 pr-2 font-medium" style={{ color: L.text }}>LV{level}</td>
                        {identityColumns.map(i => (
                          <td key={i} className="py-1.5 pr-2">{String(matrixCell(level, i))}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div
            role="separator"
            aria-orientation="vertical"
            title="拖动调整关系链宽度"
            onPointerDown={startRelationResize}
            className="w-2 flex-shrink-0 rounded-full cursor-col-resize transition-all"
            style={{ background: `linear-gradient(180deg, transparent, ${L.border}, transparent)` }}
          >
            <div className="mx-auto h-full w-1 rounded-full" style={{ background: L.borderLight }} />
          </div>

          {/* 操作台（写操作待接线） */}
          <div
            className="rounded-xl p-4 flex flex-col gap-3 flex-1 min-w-[280px] overflow-auto"
            style={{ background: L.surface, border: `1px solid ${L.border}` }}
          >
            <div>
              <div className="text-sm font-medium" style={{ color: L.text }}>操作台</div>
              <div className="mt-0.5" style={{ color: L.muted, fontSize: 10 }}>对当前排行榜用户发起回访、任务或朋友圈动作（接线中）</div>
            </div>
            <div className="flex flex-col gap-2.5">
              {[
                { label: "问题分类", key: "type" }, { label: "优先级", key: "priority" },
                { label: "回访备注", key: "text" }, { label: "指派对象", key: "target" },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs mb-1" style={{ color: L.muted }}>{f.label}</label>
                  <input disabled title="接线中" className="w-full px-3 py-2 rounded-lg text-xs outline-none cursor-not-allowed opacity-60" style={{ background: "#1a2640", border: `1px solid ${L.border}`, color: L.textSec }} placeholder={f.label + "..."} />
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-auto">
              <button disabled title="接线中" className="flex-1 py-2 rounded-lg text-xs opacity-50 cursor-not-allowed" style={{ background: L.borderLight, color: L.muted }}>取消</button>
              <button disabled title="接线中" className="flex-1 py-2 rounded-lg text-xs text-white opacity-50 cursor-not-allowed" style={{ background: L.primary }}>
                <Send size={11} className="inline mr-1" />提交
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── 右侧会员档案 ──────────────────────────────────────── */}
      <div className="w-72 flex-shrink-0 flex flex-col" style={{ background: L.surface, borderLeft: `1px solid ${L.border}` }}>
        {/* 会员档案卡 */}
        <div className="p-4 flex-shrink-0" style={{ borderBottom: `1px solid ${L.border}` }}>
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-medium" style={{ color: L.primary }}>会员档案</div>
            <span className="px-2 py-0.5 rounded-full text-xs" style={{ color: "#34d399", background: "rgba(16,185,129,0.12)", fontSize: 10 }}>统一档案</span>
          </div>
          {!sm ? (
            <div className="text-center py-4" style={{ color: L.muted, fontSize: "12px" }}>暂无会员</div>
          ) : (
            <>
              <div className="flex items-start gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold text-white flex-shrink-0" style={{ background: L.primary }}>{(sm.name || sm.member_no)[0]}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold" style={{ color: L.text }}>{sm.name}</div>
                  <div className="text-xs mt-0.5" style={{ color: L.muted }}>{sm.phone ?? sm.member_no}</div>
                  <div className="text-xs mt-1" style={{ color: L.muted, fontSize: 10 }}>注册 {fmtDate(sm.created_at)}</div>
                </div>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: L.primaryBg, border: `1px solid ${L.border}` }}>
                  <QrCode size={22} style={{ color: L.primary }} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                {memberProfileFields.map(([k, v]) => (
                  <div key={k} className="px-2 py-1.5 rounded-lg" style={{ background: "#1a2640" }}>
                    <div style={{ color: L.muted }}>{k}</div>
                    <div className="font-medium mt-0.5" style={{ color: L.textSec }}>{detailLoading ? "…" : v}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* 详情 Tab */}
        <div className="flex flex-shrink-0" style={{ borderBottom: `1px solid ${L.border}` }}>
          {detailTabs.map(t => (
            <button key={t} className="flex-1 py-2 text-xs transition-all" style={{ background: detailTab === t ? L.primaryBg : "transparent", color: detailTab === t ? L.primary : L.muted, borderBottom: detailTab === t ? `2px solid ${L.primary}` : "2px solid transparent" }} onClick={() => setDetailTab(t)}>{t}</button>
          ))}
        </div>

        {/* 详情内容（任务域 / 档案 / 时间线，均为真实数据） */}
        <div className="flex-1 overflow-auto p-3 space-y-3">
          {detailLoading && (
            <div className="flex items-center justify-center py-8" style={{ color: L.muted, fontSize: "12px" }}><Loader2 size={13} className="animate-spin mr-1.5" />加载中…</div>
          )}
          {!detailLoading && detailError && (
            <div className="text-center py-8" style={{ color: "#f87171", fontSize: "12px" }}>{detailError}</div>
          )}

          {!detailLoading && !detailError && detailTab === "待处理任务" && (
            pendingMemberTasks.length === 0 ? (
              <div className="text-center py-8" style={{ color: L.muted }}>
                <CheckCircle size={24} className="mx-auto mb-2 opacity-30" />
                <div className="text-sm">该会员暂无待处理任务</div>
              </div>
            ) : pendingMemberTasks.map(t => (
              <div key={t.id} className="rounded-xl p-3" style={{ background: "#1a2640", border: `1px solid ${L.border}` }}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: L.primaryBg, color: L.primary }}>{t.task_type}</span>
                  <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: taskStatusStyle(t.status).bg, color: taskStatusStyle(t.status).color, fontSize: "10px" }}>{t.status}</span>
                </div>
                <p className="text-xs leading-relaxed mb-1.5" style={{ color: L.textSec }}>{t.title}</p>
                <div className="text-xs" style={{ color: L.muted, fontSize: "10px" }}>
                  {t.assignee_name ? `指派：${t.assignee_name}` : "未指派"}{t.due_at ? ` · 截止 ${fmtDate(t.due_at)}` : ""}
                </div>
              </div>
            ))
          )}

          {!detailLoading && !detailError && detailTab === "订单详情" && (
            orderList.length === 0 ? (
              <div className="text-center py-8" style={{ color: L.muted }}>
                <ShoppingCart size={24} className="mx-auto mb-2 opacity-30" />
                <div className="text-sm">暂无订单记录</div>
              </div>
            ) : orderList.map((o: any, i: number) => (
              <div key={o.external_order_no ?? i} className="rounded-xl p-3" style={{ background: "#1a2640", border: `1px solid ${L.border}` }}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium" style={{ color: L.text }}>{o.product_name ?? "—"}</span>
                  <span className="text-xs font-bold" style={{ color: "#f59e0b" }}>¥{(Number(o.amount) || 0).toLocaleString()}</span>
                </div>
                <div className="text-xs mt-1" style={{ color: L.muted, fontSize: "10px" }}>{o.external_order_no ?? "—"} · {fmtDate(o.external_time)} · {o.status ?? "—"}</div>
              </div>
            ))
          )}

          {!detailLoading && !detailError && detailTab === "操作记录" && (
            timeline.length === 0 ? (
              <div className="text-center py-8" style={{ color: L.muted }}>
                <Clock size={24} className="mx-auto mb-2 opacity-30" />
                <div className="text-sm">暂无操作记录</div>
              </div>
            ) : (
              <div className="space-y-2">
                {timeline.map((e: any, i: number) => (
                  <div key={e.id ?? i} className="flex items-start gap-2 py-1.5 text-xs" style={{ borderBottom: `1px solid ${L.borderLight}` }}>
                    <Clock size={11} className="mt-0.5" style={{ color: L.primary, flexShrink: 0 }} />
                    <div className="flex-1 min-w-0">
                      <span style={{ color: L.textSec }}>{e.title ?? e.event_type}</span>
                      {e.detail && <div style={{ color: L.muted, fontSize: "10px" }}>{e.detail}</div>}
                    </div>
                    <span className="flex-shrink-0" style={{ color: L.muted, fontSize: "10px" }}>{fmtDate(e.occurred_at)}</span>
                  </div>
                ))}
              </div>
            )
          )}

          {!detailLoading && !detailError && detailTab === "回访库" && (
            followUps.length === 0 ? (
              <div className="text-center py-8" style={{ color: L.muted }}>
                <MoreHorizontal size={24} className="mx-auto mb-2 opacity-30" />
                <div className="text-sm">暂无回访记录</div>
              </div>
            ) : followUps.map((f: any, i: number) => (
              <div key={i} className="rounded-xl p-3" style={{ background: "#1a2640", border: `1px solid ${L.border}` }}>
                <p className="text-xs leading-relaxed" style={{ color: L.textSec }}>{f.content ?? f.summary ?? f.category ?? f.note ?? "回访记录"}</p>
                <div className="text-xs mt-1.5" style={{ color: L.muted, fontSize: "10px" }}>
                  {f.assignee ?? f.created_by ?? f.operator ?? "—"} · {fmtTime(f.remind_at ?? f.created_at ?? f.follow_at)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
