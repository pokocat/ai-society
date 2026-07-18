import { useEffect, useMemo, useState } from "react";
import { Search, Plus, X, Tag, Users, TrendingUp, Zap, ChevronRight, CheckSquare, Download, Loader2, AlertTriangle } from "lucide-react";
import { ApiError, membersApi } from "../../api";
import type { MemberRow } from "../../api/members";
import { useProject } from "../contexts/ProjectContext";

const L = {
  bg: "#0d1629", surface: "#131f35", border: "rgba(255,255,255,0.07)", borderLight: "rgba(255,255,255,0.04)",
  primary: "#4361ee", primaryBg: "rgba(67,97,238,0.15)", text: "#e2e8f0", textSec: "#94a3b8",
  muted: "#64748b", mutedLight: "#475569", surface2: "#1a2640",
};

const HIGH_VALUE = ["尊享官", "黑金", "城市合伙人", "VIP", "运营商"];
const NEW_USER_DAYS = 30;

/**
 * 标签均为系统派生（由会员列表真实字段计算），不落库、不可编辑。
 * 自定义标签体系后端暂无（标签库管理待接线）。
 */
const TAG_DEFS: { name: string; color: string; bg: string; dot: string; desc: string }[] = [
  { name: "高价值",     color: "#fbbf24", bg: "rgba(245,158,11,0.15)",  dot: "#f59e0b", desc: "身份为尊享官/黑金/城市合伙人/VIP/运营商" },
  { name: "新用户",     color: "#34d399", bg: "rgba(16,185,129,0.15)",  dot: "#10b981", desc: `注册 ${NEW_USER_DAYS} 天内` },
  { name: "有推荐人",   color: "#818cf8", bg: "rgba(67,97,238,0.15)",   dot: "#3b82f6", desc: "已绑定推荐关系" },
  { name: "多项目身份", color: "#c084fc", bg: "rgba(168,85,247,0.15)",  dot: "#9333ea", desc: "在 2 个及以上项目持有身份" },
  { name: "未留手机",   color: "#f87171", bg: "rgba(239,68,68,0.15)",   dot: "#ef4444", desc: "档案缺少手机号" },
];

// RFM 分层定义（口径说明保留；计数需订单聚合，后端暂未提供，禁止编造）
const RFM_SEGMENTS = [
  { name: "冠军客户", color: "#818cf8", bg: "rgba(67,97,238,0.15)",   desc: "高频购买、最近活跃、高消费", r: 5, f: 5, m: 5, action: "给予专属特权" },
  { name: "忠实客户", color: "#34d399", bg: "rgba(16,185,129,0.15)",  desc: "高频购买、较高消费",         r: 4, f: 4, m: 4, action: "提供升级激励" },
  { name: "潜力客户", color: "#2dd4bf", bg: "rgba(45,212,191,0.15)",  desc: "最近活跃但购买频次一般",     r: 4, f: 2, m: 3, action: "增加触达频次" },
  { name: "新兴客户", color: "#fbbf24", bg: "rgba(245,158,11,0.15)",  desc: "最近加入，低消费",           r: 5, f: 1, m: 1, action: "加强新手引导" },
  { name: "流失风险", color: "#fb923c", bg: "rgba(251,146,60,0.15)",  desc: "曾经活跃，近期沉默",         r: 2, f: 3, m: 3, action: "发起召回活动" },
  { name: "已流失",   color: "#f87171", bg: "rgba(239,68,68,0.15)",   desc: "长期未活跃、低消费",         r: 1, f: 1, m: 1, action: "低成本唤醒尝试" },
  { name: "休眠客户", color: "#94a3b8", bg: "rgba(100,116,139,0.15)", desc: "历史消费尚可但长期不活跃",   r: 1, f: 2, m: 2, action: "定向专属优惠" },
];

function ScoreBar({ value, max = 5, color }: { value: number; max?: number; color: string }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <div key={i} className="h-1.5 w-4 rounded-full"
          style={{ background: i < value ? color : L.borderLight }} />
      ))}
    </div>
  );
}

export default function UserSegment() {
  const { currentProject } = useProject();
  const projectId = currentProject.id;

  const [activeView, setActiveView] = useState<"用户列表" | "RFM分层" | "标签分析">("用户列表");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [search, setSearch] = useState("");

  const [list, setList] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!projectId) return;
    let alive = true;
    setLoading(true); setError("");
    membersApi.listMembers({ projectId })
      .then(rows => { if (alive) setList(rows); })
      .catch(e => { if (alive) setError(e instanceof ApiError ? e.message : "加载会员列表失败"); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [projectId]);

  const identityOf = (r: MemberRow): string =>
    r.project_identities.find(pi => pi.projectId === projectId)?.identity
    ?? r.project_identities[0]?.identity ?? "游客";

  // 派生标签（全部由真实字段计算）
  const tagsOf = useMemo(() => {
    const now = Date.now();
    const cache = new Map<string, string[]>();
    for (const r of list) {
      const tags: string[] = [];
      if (HIGH_VALUE.includes(identityOf(r))) tags.push("高价值");
      if (now - new Date(r.created_at).getTime() <= NEW_USER_DAYS * 86400_000) tags.push("新用户");
      if (r.referrer_no) tags.push("有推荐人");
      if (r.project_identities.length > 1) tags.push("多项目身份");
      if (!r.phone) tags.push("未留手机");
      cache.set(r.member_no, tags);
    }
    return cache;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list, projectId]);

  const tagCount = (name: string) => list.filter(r => (tagsOf.get(r.member_no) ?? []).includes(name)).length;

  const filteredUsers = list.filter(u => {
    const matchSearch = !search || u.name.includes(search) || (u.phone ?? "").includes(search) || (u.city ?? "").includes(search) || u.member_no.includes(search);
    const matchTag = selectedTags.length === 0 || selectedTags.some(t => (tagsOf.get(u.member_no) ?? []).includes(t));
    return matchSearch && matchTag;
  });

  const toggleTag = (name: string) => {
    setSelectedTags(prev => prev.includes(name) ? prev.filter(t => t !== name) : [...prev, name]);
  };

  const toggleUser = (no: string) => {
    setSelectedUsers(prev => prev.includes(no) ? prev.filter(i => i !== no) : [...prev, no]);
  };

  const toggleAll = () => {
    if (selectedUsers.length === filteredUsers.length) setSelectedUsers([]);
    else setSelectedUsers(filteredUsers.map(u => u.member_no));
  };

  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("zh-CN");
  const tagStyle = (name: string) => TAG_DEFS.find(t => t.name === name);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-full" style={{ color: L.muted, fontSize: "12px" }}>
        <Loader2 size={14} className="animate-spin mr-2" />加载会员画像数据…
      </div>
    );
  }
  if (error) {
    return (
      <div className="p-6 flex items-center justify-center h-full" style={{ color: "#f87171", fontSize: "12px" }}>
        <AlertTriangle size={14} className="mr-2" />{error}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: L.text }}>用户画像与标签</h1>
          <p className="text-xs mt-0.5" style={{ color: L.muted }}>
            标签由会员档案真实字段派生（{currentProject.shortName} · {list.length} 名会员）；自定义标签库待接线
          </p>
        </div>
        <div className="flex items-center gap-3">
          {selectedUsers.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: L.muted }}>已选 {selectedUsers.length} 人</span>
              {["批量打标签", "批量发消息", "批量分配群", "导出名单"].map(action => (
                <button key={action} disabled title="接线中" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors opacity-50 cursor-not-allowed"
                  style={{ background: L.surface, border: `1px solid ${L.border}`, color: L.textSec }}>
                  {action === "导出名单" && <Download size={12} />}
                  {action}
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: L.surface, border: `1px solid ${L.border}` }}>
            {(["用户列表", "RFM分层", "标签分析"] as const).map(tab => (
              <button key={tab} onClick={() => { setActiveView(tab); setSelectedUsers([]); }}
                className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
                style={{ background: activeView === tab ? L.primary : "transparent", color: activeView === tab ? "#fff" : L.muted }}>
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 用户列表 view */}
      {activeView === "用户列表" && (
        <div className="flex gap-4">
          {/* Tag Sidebar */}
          <div className="flex-shrink-0 w-60 rounded-xl p-4 space-y-2" style={{ background: L.surface, border: `1px solid ${L.border}` }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Tag size={14} style={{ color: L.primary }} />
                <span className="text-sm font-semibold" style={{ color: L.text }}>派生标签</span>
              </div>
              <button disabled title="自定义标签接线中" className="w-6 h-6 rounded-md flex items-center justify-center transition-colors opacity-50 cursor-not-allowed"
                style={{ color: L.primary }}>
                <Plus size={14} />
              </button>
            </div>

            <button onClick={() => setSelectedTags([])}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors"
              style={{
                background: selectedTags.length === 0 ? L.primaryBg : "transparent",
                color: selectedTags.length === 0 ? L.primary : L.textSec,
              }}>
              <div className="flex items-center gap-2">
                <Users size={13} />
                全部用户
              </div>
              <span className="text-xs" style={{ color: L.muted }}>{list.length}</span>
            </button>

            <div className="h-px my-2" style={{ background: L.borderLight }} />

            <div className="space-y-1">
              {TAG_DEFS.map(tag => (
                <button key={tag.name} onClick={() => toggleTag(tag.name)} title={tag.desc}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors"
                  style={{
                    background: selectedTags.includes(tag.name) ? tag.bg : "transparent",
                    color: selectedTags.includes(tag.name) ? tag.color : L.textSec,
                  }}>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: tag.dot }} />
                    <span className="text-xs">{tag.name}</span>
                  </div>
                  <span className="text-xs" style={{ color: L.mutedLight }}>{tagCount(tag.name)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1 space-y-3">
            {/* Search & filters */}
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: L.muted }} />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="搜索姓名、手机号、城市、会员号..."
                  className="w-full pl-9 pr-4 py-2 rounded-lg text-sm outline-none"
                  style={{ background: L.surface, border: `1px solid ${L.border}`, color: L.text }} />
              </div>
              {selectedTags.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  {selectedTags.map(tag => (
                    <span key={tag} className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs"
                      style={{ background: L.primaryBg, color: L.primary }}>
                      {tag}
                      <button onClick={() => toggleTag(tag)}><X size={10} /></button>
                    </span>
                  ))}
                  <button onClick={() => setSelectedTags([])}
                    className="text-xs" style={{ color: L.muted }}>清除全部</button>
                </div>
              )}
            </div>

            {/* Table */}
            <div className="rounded-xl overflow-hidden" style={{ background: L.surface, border: `1px solid ${L.border}` }}>
              <table className="w-full">
                <thead>
                  <tr style={{ background: L.bg }}>
                    <th className="px-4 py-3 w-10">
                      <button onClick={toggleAll} className="flex items-center justify-center">
                        <CheckSquare size={14} style={{ color: selectedUsers.length > 0 ? L.primary : L.muted }} />
                      </button>
                    </th>
                    {["用户", "手机号", "城市", "身份", "派生标签", "来源渠道", "推荐人", "注册时间"].map(h => (
                      <th key={h} className="px-3 py-3 text-left text-xs font-medium" style={{ color: L.muted }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user, i) => {
                    const tags = tagsOf.get(user.member_no) ?? [];
                    return (
                      <tr key={user.member_no} style={{ borderTop: `1px solid ${L.borderLight}` }}
                        className="transition-colors">
                        <td className="px-4 py-3">
                          <input type="checkbox" checked={selectedUsers.includes(user.member_no)}
                            onChange={() => toggleUser(user.member_no)}
                            className="rounded" style={{ accentColor: L.primary }} />
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
                              style={{ background: `hsl(${i * 47}, 65%, 55%)` }}>
                              {(user.name || user.member_no)[0]}
                            </div>
                            <div>
                              <div className="text-sm font-medium" style={{ color: L.text }}>{user.name}</div>
                              <div className="text-[10px]" style={{ color: L.muted }}>{user.member_no}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-sm" style={{ color: L.muted }}>{user.phone ?? "—"}</td>
                        <td className="px-3 py-3 text-sm" style={{ color: L.textSec }}>{user.city ?? "—"}</td>
                        <td className="px-3 py-3">
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{ background: L.primaryBg, color: L.primary }}>{identityOf(user)}</span>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap gap-1">
                            {tags.length === 0 && <span className="text-[10px]" style={{ color: L.muted }}>—</span>}
                            {tags.map(name => {
                              const s = tagStyle(name);
                              return (
                                <span key={name} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium"
                                  style={{ background: s?.bg ?? L.primaryBg, color: s?.color ?? L.primary }}>
                                  {name}
                                </span>
                              );
                            })}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-xs" style={{ color: L.muted }}>{user.source_channel ?? "—"}</td>
                        <td className="px-3 py-3 text-xs" style={{ color: L.textSec }}>{user.referrer_name ?? "—"}</td>
                        <td className="px-3 py-3 text-xs" style={{ color: L.muted }}>{fmtDate(user.created_at)}</td>
                      </tr>
                    );
                  })}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-sm" style={{ color: L.muted }}>
                        暂无符合条件的用户
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* RFM分层 view：口径说明保留；计数需订单聚合口径（后端未提供），如实显示未接线 */}
      {activeView === "RFM分层" && (
        <div className="space-y-5">
          <div className="rounded-xl p-4 flex items-start gap-3" style={{ background: L.primaryBg, border: "1px solid rgba(67,97,238,0.3)" }}>
            <Zap size={16} style={{ color: "#818cf8", marginTop: 2 }} />
            <div>
              <div className="text-sm font-semibold mb-1" style={{ color: "#818cf8" }}>RFM模型说明</div>
              <div className="text-xs" style={{ color: L.textSec }}>
                RFM模型通过三个维度评估用户价值：<strong>R (Recency)</strong> 最近购买时间、<strong>F (Frequency)</strong> 购买频次、<strong>M (Monetary)</strong> 消费金额。
              </div>
            </div>
          </div>

          <div className="rounded-xl p-4 flex items-start gap-3" style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)" }}>
            <AlertTriangle size={16} style={{ color: "#fbbf24", marginTop: 2 }} />
            <div className="text-xs" style={{ color: L.textSec }}>
              RFM 分层需按会员聚合订单镜像（R/F/M 三维打分），后端暂未提供该聚合口径——以下仅为分层定义与运营动作参考，<strong style={{ color: "#fbbf24" }}>人数暂无法统计</strong>，接线后启用筛选。
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            {RFM_SEGMENTS.map(seg => (
              <div key={seg.name}
                className="rounded-xl p-5 opacity-80"
                title="接线中"
                style={{ background: L.surface, border: `2px solid ${L.border}` }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold px-2.5 py-1 rounded-lg"
                    style={{ background: seg.bg, color: seg.color }}>{seg.name}</span>
                  <span className="text-lg font-bold" style={{ color: L.muted }}>—</span>
                </div>
                <div className="text-xs mb-4" style={{ color: L.muted }}>{seg.desc}</div>
                <div className="space-y-2">
                  {[
                    { label: "R (最近)", value: seg.r },
                    { label: "F (频次)", value: seg.f },
                    { label: "M (消费)", value: seg.m },
                  ].map(dim => (
                    <div key={dim.label}>
                      <div className="flex items-center justify-between text-[10px] mb-1" style={{ color: L.muted }}>
                        <span>{dim.label}</span>
                        <span>{dim.value}/5</span>
                      </div>
                      <ScoreBar value={dim.value} color={seg.color} />
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-3 border-t" style={{ borderColor: L.borderLight }}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs px-2 py-0.5 rounded-md" style={{ background: seg.bg, color: seg.color }}>
                      {seg.action}
                    </span>
                    <ChevronRight size={14} style={{ color: L.mutedLight }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 标签分析 view（派生标签真实计数） */}
      {activeView === "标签分析" && (
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            {TAG_DEFS.map(tag => {
              const count = tagCount(tag.name);
              const pct = list.length > 0 ? Math.round((count / list.length) * 100) : 0;
              return (
                <div key={tag.name} className="rounded-xl p-5" style={{ background: L.surface, border: `1px solid ${L.border}` }}>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-3 h-3 rounded-full" style={{ background: tag.dot }} />
                    <span className="text-sm font-semibold" style={{ color: L.text }}>{tag.name}</span>
                  </div>
                  <div className="text-[10px] mb-3" style={{ color: L.muted }}>{tag.desc}</div>
                  <div className="flex items-end justify-between mb-3">
                    <div>
                      <div className="text-2xl font-bold" style={{ color: L.text }}>{count}</div>
                      <div className="text-xs" style={{ color: L.muted }}>占全部用户 {pct}%</div>
                    </div>
                    <TrendingUp size={20} style={{ color: tag.dot, opacity: 0.6 }} />
                  </div>
                  <div className="h-2 rounded-full mb-3" style={{ background: L.borderLight }}>
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: tag.dot }} />
                  </div>
                  <button
                    onClick={() => { setSelectedTags([tag.name]); setActiveView("用户列表"); }}
                    className="w-full py-1.5 rounded-lg text-xs font-medium transition-colors"
                    style={{ background: tag.bg, color: tag.color }}>
                    查看用户
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
