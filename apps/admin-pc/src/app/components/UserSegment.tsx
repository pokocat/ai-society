import { useState } from "react";
import { Search, Plus, X, Tag, Users, TrendingUp, Star, Zap, ChevronRight, CheckSquare, Download } from "lucide-react";

const L = {
  bg: "#0d1629", surface: "#131f35", border: "rgba(255,255,255,0.07)", borderLight: "rgba(255,255,255,0.04)",
  primary: "#4361ee", primaryBg: "rgba(67,97,238,0.15)", text: "#e2e8f0", textSec: "#94a3b8",
  muted: "#64748b", mutedLight: "#475569", surface2: "#1a2640",
};

const TAGS = [
  { name: "高价值客户", color: "#fbbf24", bg: "rgba(245,158,11,0.15)", dot: "#f59e0b", count: 124 },
  { name: "PRO会员", color: "#818cf8", bg: "rgba(67,97,238,0.15)", dot: "#3b82f6", count: 1023 },
  { name: "体验官", color: "#34d399", bg: "rgba(16,185,129,0.15)", dot: "#10b981", count: 387 },
  { name: "代理商", color: "#6b21a8", bg: "#f3e8ff", dot: "#9333ea", count: 134 },
  { name: "沉默用户", color: "#94a3b8", bg: "rgba(100,116,139,0.15)", dot: "#9ca3af", count: 218 },
  { name: "流失风险", color: "#f87171", bg: "rgba(239,68,68,0.15)", dot: "#ef4444", count: 67 },
  { name: "高影响力", color: "#0369a1", bg: "#e0f2fe", dot: "#0ea5e9", count: 89 },
  { name: "新用户", color: "#34d399", bg: "rgba(16,185,129,0.15)", dot: "#10b981", count: 156 },
  { name: "城市合伙人", color: "#9a3412", bg: "#ffedd5", dot: "#f97316", count: 28 },
  { name: "潜在升级", color: "#5b21b6", bg: "#ede9fe", dot: "#8b5cf6", count: 203 },
];

const MOCK_USERS = [
  {
    id: 1, name: "张明远", avatar: "张", phone: "138****2341", city: "北京", level: "PRO会员",
    tags: ["PRO会员", "高价值客户", "高影响力"], spend: "¥12,840", lastActive: "1小时前",
    rfm: "冠军客户", influence: 96,
  },
  {
    id: 2, name: "李晓燕", avatar: "李", phone: "139****5678", city: "上海", level: "代理商",
    tags: ["代理商", "高价值客户", "城市合伙人"], spend: "¥28,400", lastActive: "3小时前",
    rfm: "忠实客户", influence: 88,
  },
  {
    id: 3, name: "王建国", avatar: "王", phone: "135****9012", city: "广州", level: "体验官",
    tags: ["体验官", "潜在升级"], spend: "¥3,200", lastActive: "昨天",
    rfm: "潜力客户", influence: 54,
  },
  {
    id: 4, name: "陈美玲", avatar: "陈", phone: "136****3456", city: "深圳", level: "PRO会员",
    tags: ["PRO会员", "新用户"], spend: "¥1,680", lastActive: "2天前",
    rfm: "新兴客户", influence: 41,
  },
  {
    id: 5, name: "刘志远", avatar: "刘", phone: "137****7890", city: "成都", level: "体验官",
    tags: ["体验官", "沉默用户"], spend: "¥890", lastActive: "18天前",
    rfm: "休眠客户", influence: 22,
  },
  {
    id: 6, name: "赵丽华", avatar: "赵", phone: "186****1234", city: "杭州", level: "普通用户",
    tags: ["流失风险", "沉默用户"], spend: "¥320", lastActive: "35天前",
    rfm: "流失风险", influence: 12,
  },
  {
    id: 7, name: "孙雨晴", avatar: "孙", phone: "188****5678", city: "北京", level: "代理商",
    tags: ["代理商", "高价值客户"], spend: "¥19,200", lastActive: "5小时前",
    rfm: "冠军客户", influence: 91,
  },
  {
    id: 8, name: "周国强", avatar: "周", phone: "150****9012", city: "上海", level: "PRO会员",
    tags: ["PRO会员", "高影响力", "潜在升级"], spend: "¥7,640", lastActive: "30分钟前",
    rfm: "忠实客户", influence: 79,
  },
];

const RFM_SEGMENTS = [
  {
    name: "冠军客户", color: "#818cf8", bg: "rgba(67,97,238,0.15)", desc: "高频购买、最近活跃、高消费", count: 89,
    r: 5, f: 5, m: 5, action: "给予专属特权",
  },
  {
    name: "忠实客户", color: "#34d399", bg: "rgba(16,185,129,0.15)", desc: "高频购买、较高消费", count: 156,
    r: 4, f: 4, m: 4, action: "提供升级激励",
  },
  {
    name: "潜力客户", color: "#0f766e", bg: "#ccfbf1", desc: "最近活跃但购买频次一般", count: 203,
    r: 4, f: 2, m: 3, action: "增加触达频次",
  },
  {
    name: "新兴客户", color: "#fbbf24", bg: "rgba(245,158,11,0.15)", desc: "最近加入，低消费", count: 134,
    r: 5, f: 1, m: 1, action: "加强新手引导",
  },
  {
    name: "流失风险", color: "#9a3412", bg: "#ffedd5", desc: "曾经活跃，近期沉默", count: 67,
    r: 2, f: 3, m: 3, action: "发起召回活动",
  },
  {
    name: "已流失", color: "#f87171", bg: "rgba(239,68,68,0.15)", desc: "长期未活跃、低消费", count: 45,
    r: 1, f: 1, m: 1, action: "低成本唤醒尝试",
  },
  {
    name: "休眠客户", color: "#94a3b8", bg: "rgba(100,116,139,0.15)", desc: "历史消费尚可但长期不活跃", count: 218,
    r: 1, f: 2, m: 2, action: "定向专属优惠",
  },
];

const TOTAL_USERS = 1623;

function TagBadge({ name }: { name: string }) {
  const tag = TAGS.find(t => t.name === name);
  if (!tag) return null;
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium"
      style={{ background: tag.bg, color: tag.color }}>
      {name}
    </span>
  );
}

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
  const [activeView, setActiveView] = useState<"用户列表" | "RFM分层" | "标签分析">("用户列表");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [rfmFilter, setRfmFilter] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const filteredUsers = MOCK_USERS.filter(u => {
    const matchSearch = !search || u.name.includes(search) || u.phone.includes(search) || u.city.includes(search);
    const matchTag = selectedTags.length === 0 || selectedTags.some(t => u.tags.includes(t));
    const matchRfm = !rfmFilter || u.rfm === rfmFilter;
    return matchSearch && matchTag && matchRfm;
  });

  const toggleTag = (name: string) => {
    setSelectedTags(prev => prev.includes(name) ? prev.filter(t => t !== name) : [...prev, name]);
    setRfmFilter(null);
  };

  const toggleUser = (id: number) => {
    setSelectedUsers(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleAll = () => {
    if (selectedUsers.length === filteredUsers.length) setSelectedUsers([]);
    else setSelectedUsers(filteredUsers.map(u => u.id));
  };

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: L.text }}>用户画像与标签</h1>
          <p className="text-xs mt-0.5" style={{ color: L.muted }}>精细化用户分层，提升运营效率</p>
        </div>
        <div className="flex items-center gap-3">
          {selectedUsers.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: L.muted }}>已选 {selectedUsers.length} 人</span>
              {["批量打标签", "批量发消息", "批量分配群", "导出名单"].map(action => (
                <button key={action} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors hover:bg-gray-50"
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
                <span className="text-sm font-semibold" style={{ color: L.text }}>标签库</span>
              </div>
              <button className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-gray-100 transition-colors"
                style={{ color: L.primary }}>
                <Plus size={14} />
              </button>
            </div>

            <button onClick={() => { setSelectedTags([]); setRfmFilter(null); }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors"
              style={{
                background: selectedTags.length === 0 && !rfmFilter ? L.primaryBg : "transparent",
                color: selectedTags.length === 0 && !rfmFilter ? L.primary : L.textSec,
              }}>
              <div className="flex items-center gap-2">
                <Users size={13} />
                全部用户
              </div>
              <span className="text-xs" style={{ color: L.muted }}>{TOTAL_USERS}</span>
            </button>

            <div className="h-px my-2" style={{ background: L.borderLight }} />

            <div className="space-y-1">
              {TAGS.map(tag => (
                <button key={tag.name} onClick={() => toggleTag(tag.name)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors"
                  style={{
                    background: selectedTags.includes(tag.name) ? tag.bg : "transparent",
                    color: selectedTags.includes(tag.name) ? tag.color : L.textSec,
                  }}>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: tag.dot }} />
                    <span className="text-xs">{tag.name}</span>
                  </div>
                  <span className="text-xs" style={{ color: L.mutedLight }}>{tag.count}</span>
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
                  placeholder="搜索姓名、手机号、城市..."
                  className="w-full pl-9 pr-4 py-2 rounded-lg text-sm outline-none"
                  style={{ background: L.surface, border: `1px solid ${L.border}`, color: L.text }} />
              </div>
              {(selectedTags.length > 0 || rfmFilter) && (
                <div className="flex items-center gap-2 flex-wrap">
                  {selectedTags.map(tag => (
                    <span key={tag} className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs"
                      style={{ background: L.primaryBg, color: L.primary }}>
                      {tag}
                      <button onClick={() => toggleTag(tag)}><X size={10} /></button>
                    </span>
                  ))}
                  {rfmFilter && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs"
                      style={{ background: "rgba(245,158,11,0.15)", color: "#fbbf24" }}>
                      {rfmFilter}
                      <button onClick={() => setRfmFilter(null)}><X size={10} /></button>
                    </span>
                  )}
                  <button onClick={() => { setSelectedTags([]); setRfmFilter(null); }}
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
                    {["用户", "手机号", "城市", "等级", "标签", "总消费", "最近活跃", "RFM层级", "影响力"].map(h => (
                      <th key={h} className="px-3 py-3 text-left text-xs font-medium" style={{ color: L.muted }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user, i) => (
                    <tr key={user.id} style={{ borderTop: `1px solid ${L.borderLight}` }}
                      className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <input type="checkbox" checked={selectedUsers.includes(user.id)}
                          onChange={() => toggleUser(user.id)}
                          className="rounded" style={{ accentColor: L.primary }} />
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
                            style={{ background: `hsl(${i * 47}, 65%, 55%)` }}>
                            {user.avatar}
                          </div>
                          <span className="text-sm font-medium" style={{ color: L.text }}>{user.name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-sm" style={{ color: L.muted }}>{user.phone}</td>
                      <td className="px-3 py-3 text-sm" style={{ color: L.textSec }}>{user.city}</td>
                      <td className="px-3 py-3">
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ background: L.primaryBg, color: L.primary }}>{user.level}</span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-1">
                          {user.tags.slice(0, 2).map(tag => <TagBadge key={tag} name={tag} />)}
                          {user.tags.length > 2 && (
                            <span className="text-[10px]" style={{ color: L.muted }}>+{user.tags.length - 2}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-sm font-medium" style={{ color: L.text }}>{user.spend}</td>
                      <td className="px-3 py-3 text-xs" style={{ color: L.muted }}>{user.lastActive}</td>
                      <td className="px-3 py-3">
                        <span className="text-xs px-2 py-0.5 rounded-full"
                          style={{
                            background: user.rfm === "冠军客户" ? "rgba(67,97,238,0.15)" : user.rfm === "忠实客户" ? "rgba(16,185,129,0.15)" : user.rfm === "流失风险" ? "#ffedd5" : user.rfm === "已流失" ? "rgba(239,68,68,0.15)" : "rgba(100,116,139,0.15)",
                            color: user.rfm === "冠军客户" ? "#818cf8" : user.rfm === "忠实客户" ? "#34d399" : user.rfm === "流失风险" ? "#9a3412" : user.rfm === "已流失" ? "#f87171" : "#94a3b8",
                          }}>
                          {user.rfm}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1.5">
                          <div className="h-1.5 w-16 rounded-full" style={{ background: L.borderLight }}>
                            <div className="h-full rounded-full" style={{ width: `${user.influence}%`, background: user.influence >= 80 ? "#4361ee" : user.influence >= 50 ? "#10b981" : "#9ca3af" }} />
                          </div>
                          <span className="text-xs font-medium" style={{ color: L.textSec }}>{user.influence}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={10} className="px-4 py-12 text-center text-sm" style={{ color: L.muted }}>
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

      {/* RFM分层 view */}
      {activeView === "RFM分层" && (
        <div className="space-y-5">
          <div className="rounded-xl p-4 flex items-start gap-3" style={{ background: "#eef2ff", border: `1px solid #c7d2fe` }}>
            <Zap size={16} style={{ color: L.primary, marginTop: 2 }} />
            <div>
              <div className="text-sm font-semibold mb-1" style={{ color: L.primary }}>RFM模型说明</div>
              <div className="text-xs" style={{ color: "#4338ca" }}>
                RFM模型通过三个维度评估用户价值：<strong>R (Recency)</strong> 最近购买时间、<strong>F (Frequency)</strong> 购买频次、<strong>M (Monetary)</strong> 消费金额。点击卡片可筛选对应层级的用户列表。
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            {RFM_SEGMENTS.map(seg => (
              <div key={seg.name}
                className="rounded-xl p-5 cursor-pointer transition-all hover:shadow-md"
                style={{ background: L.surface, border: `2px solid ${rfmFilter === seg.name ? seg.color : L.border}` }}
                onClick={() => { setRfmFilter(rfmFilter === seg.name ? null : seg.name); setActiveView("用户列表"); }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold px-2.5 py-1 rounded-lg"
                    style={{ background: seg.bg, color: seg.color }}>{seg.name}</span>
                  <span className="text-lg font-bold" style={{ color: L.text }}>{seg.count}</span>
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

      {/* 标签分析 view */}
      {activeView === "标签分析" && (
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            {TAGS.map(tag => {
              const pct = Math.round((tag.count / TOTAL_USERS) * 100);
              return (
                <div key={tag.name} className="rounded-xl p-5" style={{ background: L.surface, border: `1px solid ${L.border}` }}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-3 h-3 rounded-full" style={{ background: tag.dot }} />
                    <span className="text-sm font-semibold" style={{ color: L.text }}>{tag.name}</span>
                  </div>
                  <div className="flex items-end justify-between mb-3">
                    <div>
                      <div className="text-2xl font-bold" style={{ color: L.text }}>{tag.count}</div>
                      <div className="text-xs" style={{ color: L.muted }}>占全部用户 {pct}%</div>
                    </div>
                    <TrendingUp size={20} style={{ color: tag.dot, opacity: 0.6 }} />
                  </div>
                  <div className="h-2 rounded-full mb-3" style={{ background: L.borderLight }}>
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: tag.dot }} />
                  </div>
                  <button
                    onClick={() => { toggleTag(tag.name); setActiveView("用户列表"); }}
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
