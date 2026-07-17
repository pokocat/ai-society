import { useRef, useState, type PointerEvent } from "react";
import { Search, QrCode, ChevronRight, MessageSquare, Heart, Share2, Star, TrendingUp, Clock, CheckCircle, Plus, Send, Image, MoreHorizontal } from "lucide-react";

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

// ─── 模拟数据 ─────────────────────────────────────────────────
const taskCategories = [
  { label: "待处理的任务", count: 12, active: true },
  { label: "我发布的任务", count: 5 },
  { label: "朋友圈的任务", count: 28 },
  { label: "附近的任务", count: 7 },
];

const rankingTabs = ["待处理的任务", "全部任务", "我发布的任务", "回购任务", "关注任务", "收费任务"];

const rankingData = [
  { rank: 1,  avatar: "盛", name: "盛光年", wechat: "THEv424",  gender: "男", city: "北京-朝阳", job: "工人-工地", inGroup: "是", pendingCount: 80, publishCount: 80, completedCount: 91, totalUsers: 8023, influence: 3510, score: 4858, referrer: "盛光年" },
  { rank: 2,  avatar: "皮", name: "皮卡丘", wechat: "imp11",    gender: "男", city: "北京-海淀", job: "工人-工地", inGroup: "是", pendingCount: 71, publishCount: 91, completedCount: 54, totalUsers: 6544, influence: 2877, score: 3918, referrer: "皮卡丘" },
  { rank: 3,  avatar: "文", name: "文泽",   wechat: "FLM001",  gender: "男", city: "北京-朝阳", job: "工人-工地", inGroup: "是", pendingCount: 47, publishCount: 21, completedCount: 84, totalUsers: 5231, influence: 2104, score: 2976, referrer: "皮卡丘" },
  { rank: 4,  avatar: "梓", name: "梓几",   wechat: "afs612",  gender: "男", city: "北京-西城", job: "工人-工地", inGroup: "是", pendingCount: 37, publishCount: 44, completedCount: 27, totalUsers: 4102, influence: 1754, score: 2341, referrer: "文泽" },
  { rank: 5,  avatar: "海", name: "海槽",   wechat: "125gfs",  gender: "男", city: "北京-东城", job: "工人-工地", inGroup: "是", pendingCount: 29, publishCount: 38, completedCount: 63, totalUsers: 3788, influence: 1432, score: 2109, referrer: "皮卡丘" },
];

const taskSideList = [
  { title: "主理人产品下午3点代发",  time: "2026-07-05 14:30", status: "进行中", unread: 3 },
  { title: "晒单截图任务-7月第二周",  time: "2026-07-04 10:00", status: "待处理", unread: 1 },
  { title: "朋友圈转发活动邀请",      time: "2026-07-03 09:00", status: "进行中", unread: 0 },
  { title: "评论互动任务-体验官群",   time: "2026-07-02 16:00", status: "已完成", unread: 0 },
  { title: "拉新任务-北京PRO群",      time: "2026-07-01 11:00", status: "进行中", unread: 2 },
];

const profileUser = rankingData[0];

const activityFeed = [
  {
    id: "TX2024064487489275",
    time: "2021-06-21 22:51:02",
    type: "朋友圈发布",
    content: "刚打完球非常爽，明天继续！",
    images: 2,
    likes: 73,
    comments: 4,
    shares: 0,
  },
  {
    id: "TX2024064487489276",
    time: "2021-06-20 18:23:11",
    type: "任务完成",
    content: "完成晒单任务，已截图上传",
    images: 1,
    likes: 41,
    comments: 2,
    shares: 1,
  },
  {
    id: "TX2024064487489277",
    time: "2021-06-19 09:00:00",
    type: "朋友圈发布",
    content: "今天天气真好，出门运动！推荐大家也来试试这个健康生活方式",
    images: 3,
    likes: 126,
    comments: 8,
    shares: 5,
  },
];

const momentOps = [
  { label: "发布文字", icon: MessageSquare },
  { label: "发布图片", icon: Image },
  { label: "点赞", icon: Heart },
  { label: "转发", icon: Share2 },
];

// 关系树节点
const relationTree = {
  name: "皮卡丘", level: 1,
  children: [
    {
      name: "主理人产品下午3...", level: 2,
      children: [
        { name: "主理人产品下午3...", level: 3, children: [
          { name: "主理人产品(0人)", level: 4, children: [] },
          { name: "主理人体验(0人)", level: 4, children: [] },
        ] },
        { name: "梓几", level: 3, children: [
          { name: "梓几(0人)", level: 4, children: [] },
        ] },
      ]
    },
    { name: "海槽", level: 2, children: [{ name: "海槽(0人)", level: 4, children: [] }] },
  ]
};

function TreeNode({ node, depth = 0 }: { node: typeof relationTree; depth?: number }) {
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
        <span className="text-xs" style={{ color: depth === 0 ? L.text : L.textSec }}>{node.name}</span>
      </div>
      {open && hasChildren && (
        <div style={{ borderLeft: `1px dashed ${L.border}`, marginLeft: 5 }}>
          {node.children.map((c, i) => <TreeNode key={i} node={c} depth={depth + 1} />)}
        </div>
      )}
    </div>
  );
}

// ─── 主组件 ───────────────────────────────────────────────────
export default function InfluenceRanking() {
  const [activeTab, setActiveTab] = useState(rankingTabs[0]);
  const [detailTab, setDetailTab] = useState("待处理");
  const [selectedUser, setSelectedUser] = useState(rankingData[0]);
  const [momentText, setMomentText] = useState("");
  const [relationWidth, setRelationWidth] = useState(520);
  const relationAreaRef = useRef<HTMLDivElement>(null);

  const detailTabs = ["待处理", "订单详情", "历史操作记录", "回访库"];
  const memberProfileFields = [
    ["会员编号", `U-${String(selectedUser.rank).padStart(5, "0")}`],
    ["微信号", selectedUser.wechat],
    ["会员等级", selectedUser.rank <= 2 ? "尊享官" : "体验官"],
    ["入群状态", selectedUser.inGroup === "是" ? "已入群" : "未入群"],
    ["影响力", selectedUser.influence.toLocaleString()],
    ["评分", selectedUser.score.toLocaleString()],
    ["城市", selectedUser.city],
    ["推荐人", selectedUser.referrer],
  ];

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

  // Status badge colors for task side list
  const taskStatusStyle = (status: string) => {
    if (status === "已完成") return { bg: "rgba(16,185,129,0.15)", color: "#34d399" };
    if (status === "进行中") return { bg: "rgba(67,97,238,0.15)", color: "#818cf8" };
    return { bg: "rgba(245,158,11,0.15)", color: "#fbbf24" };
  };

  return (
    <div className="h-full flex" style={{ background: L.bg }}>
      {/* ── 左侧任务列表 ───────────────────────────────────────── */}
      <div className="w-56 flex-shrink-0 flex flex-col" style={{ background: L.surface, borderRight: `1px solid ${L.border}` }}>
        <div className="px-4 py-3 flex-shrink-0" style={{ borderBottom: `1px solid ${L.border}` }}>
          <div className="text-sm font-semibold" style={{ color: L.text }}>任务中心</div>
        </div>

        {/* 任务分类 */}
        <div className="px-3 py-2 flex-shrink-0">
          {taskCategories.map((c, i) => (
            <button key={i} className="w-full flex items-center justify-between px-2 py-2 rounded-lg text-left mb-0.5 transition-all" style={{ background: i === 0 ? L.primaryBg : "transparent" }}>
              <span className="text-xs" style={{ color: i === 0 ? L.primary : L.muted }}>{c.label}</span>
              <span className="px-1.5 py-0.5 rounded-full text-xs" style={{ background: i === 0 ? L.primary : L.borderLight, color: i === 0 ? "#ffffff" : L.muted }}>{c.count}</span>
            </button>
          ))}
        </div>

        <div style={{ borderTop: `1px solid ${L.border}`, margin: "0 12px" }} />

        {/* 任务列表 */}
        <div className="flex-1 overflow-auto px-3 py-2 space-y-1">
          {taskSideList.map((t, i) => (
            <div key={i} className="px-2 py-2.5 rounded-xl cursor-pointer transition-all" style={{ background: i === 0 ? L.primaryBg : "transparent", border: i === 0 ? `1px solid ${L.primary}` : "1px solid transparent" }}>
              <div className="flex items-start justify-between gap-1">
                <span className="text-xs font-medium leading-tight" style={{ color: i === 0 ? L.primary : L.textSec }}>{t.title}</span>
                {t.unread > 0 && <span className="w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center flex-shrink-0" style={{ fontSize: "9px" }}>{t.unread}</span>}
              </div>
              <div className="flex items-center justify-between mt-1.5">
                <span className="text-xs" style={{ color: L.muted, fontSize: "10px" }}>{t.time.split(" ")[1]}</span>
                <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: taskStatusStyle(t.status).bg, color: taskStatusStyle(t.status).color, fontSize: "10px" }}>{t.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 中间区域 ──────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* 排行榜 Tab */}
        <div className="flex items-center gap-1 px-4 pt-4 flex-shrink-0 flex-wrap">
          {rankingTabs.map(t => (
            <button key={t} className="px-3 py-1.5 rounded-lg text-xs transition-all" style={{ background: activeTab === t ? L.primary : L.surface, color: activeTab === t ? "white" : L.muted, border: `1px solid ${activeTab === t ? "transparent" : L.border}` }} onClick={() => setActiveTab(t)}>{t}</button>
          ))}
        </div>

        {/* 排行榜表格 */}
        <div className="mx-4 mt-3 rounded-xl overflow-hidden flex-shrink-0" style={{ background: L.surface, border: `1px solid ${L.border}` }}>
          <div className="flex items-center px-3 py-2 text-xs" style={{ background: "#1a2640", borderBottom: `1px solid ${L.border}`, color: L.muted }}>
            {[["排名",44],["头像",44],["#",44],["微信名",100],["性别",44],["城市",90],["职业",80],["进群",44],["待处理",64],["发布",54],["完成",54],["总用户",68],["影响力",68],["评分",64]].map(([l,w], i) => (
              <div key={i} className="flex-shrink-0" style={{ width: w as number }}>{l}</div>
            ))}
          </div>
          {rankingData.map((u, idx) => (
            <div key={u.rank} className="flex items-center px-3 py-2.5 cursor-pointer text-xs transition-all" style={{ background: selectedUser.rank === u.rank ? L.primaryBg : idx % 2 === 0 ? "#131f35" : "#1a2640", borderBottom: `1px solid ${L.borderLight}`, borderLeft: selectedUser.rank === u.rank ? `2px solid ${L.primary}` : "2px solid transparent" }} onClick={() => setSelectedUser(u)}>
              <div className="flex-shrink-0" style={{ width: 44 }}>
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: u.rank <= 3 ? "linear-gradient(135deg, #f59e0b, #ef4444)" : L.primaryBg, color: u.rank <= 3 ? "white" : L.primary }}>{u.rank}</div>
              </div>
              <div className="flex-shrink-0" style={{ width: 44 }}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-semibold text-white" style={{ background: L.primary }}>{u.avatar}</div>
              </div>
              <div className="flex-shrink-0 font-medium" style={{ width: 44, color: L.textSec }}>#{u.rank}</div>
              <div className="flex-shrink-0 font-medium" style={{ width: 100, color: selectedUser.rank === u.rank ? L.primary : L.text }}>{u.name}</div>
              <div className="flex-shrink-0" style={{ width: 44, color: u.gender === "女" ? "#db2777" : "#0ea5e9" }}>{u.gender}</div>
              <div className="flex-shrink-0" style={{ width: 90, color: L.muted }}>{u.city}</div>
              <div className="flex-shrink-0" style={{ width: 80, color: L.muted }}>{u.job}</div>
              <div className="flex-shrink-0" style={{ width: 44, color: "#10b981" }}>{u.inGroup}</div>
              <div className="flex-shrink-0 font-medium" style={{ width: 64, color: "#f59e0b" }}>{u.pendingCount}</div>
              <div className="flex-shrink-0" style={{ width: 54, color: L.muted }}>{u.publishCount}</div>
              <div className="flex-shrink-0" style={{ width: 54, color: "#10b981" }}>{u.completedCount}</div>
              <div className="flex-shrink-0" style={{ width: 68, color: L.primary }}>{u.totalUsers.toLocaleString()}</div>
              <div className="flex-shrink-0 font-bold" style={{ width: 68, color: "#f59e0b" }}>{u.influence.toLocaleString()}</div>
              <div className="flex-shrink-0 font-bold" style={{ width: 64, color: "#ef4444" }}>{u.score.toLocaleString()}</div>
            </div>
          ))}
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
                <input className="bg-transparent outline-none text-xs w-20" style={{ color: L.textSec }} placeholder="搜索..." />
              </div>
            </div>
            <TreeNode node={relationTree} />
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

          {/* 操作台 */}
          <div
            className="rounded-xl p-4 flex flex-col gap-3 flex-1 min-w-[280px]"
            style={{ background: L.surface, border: `1px solid ${L.border}` }}
          >
            <div>
              <div className="text-sm font-medium" style={{ color: L.text }}>操作台</div>
              <div className="mt-0.5" style={{ color: L.muted, fontSize: 10 }}>对当前排行榜用户发起回访、任务或朋友圈动作</div>
            </div>
            <div className="flex flex-col gap-2.5">
              {[
                { label: "问题分类", key: "type" }, { label: "优先级", key: "priority" },
                { label: "回访备注", key: "text" }, { label: "指派对象", key: "target" },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs mb-1" style={{ color: L.muted }}>{f.label}</label>
                  <input className="w-full px-3 py-2 rounded-lg text-xs outline-none" style={{ background: "#1a2640", border: `1px solid ${L.border}`, color: L.textSec }} placeholder={f.label + "..."} />
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg" style={{ background: "#1a2640", border: `1px solid ${L.border}` }}>
              <div className="w-full h-20 flex items-center justify-center rounded" style={{ background: L.borderLight, border: `1px dashed ${L.border}` }}>
                <span className="text-2xl" style={{ color: L.mutedLight }}>+</span>
              </div>
            </div>
            <div className="flex gap-2 mt-auto">
              <button className="flex-1 py-2 rounded-lg text-xs" style={{ background: L.borderLight, color: L.muted }}>取消</button>
              <button className="flex-1 py-2 rounded-lg text-xs text-white" style={{ background: L.primary }}>
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
          <div className="flex items-start gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold text-white flex-shrink-0" style={{ background: L.primary }}>{selectedUser.avatar}</div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold" style={{ color: L.text }}>{selectedUser.name}</div>
              <div className="text-xs mt-0.5" style={{ color: L.muted }}>{selectedUser.wechat}</div>
              <div className="flex items-center gap-1 mt-1">
                {[...Array(5)].map((_, i) => <Star key={i} size={10} style={{ color: i < 4 ? "#f59e0b" : L.borderLight }} />)}
              </div>
            </div>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: L.primaryBg, border: `1px solid ${L.border}` }}>
              <QrCode size={22} style={{ color: L.primary }} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            {memberProfileFields.map(([k, v]) => (
              <div key={k} className="px-2 py-1.5 rounded-lg" style={{ background: "#1a2640" }}>
                <div style={{ color: L.muted }}>{k}</div>
                <div className="font-medium mt-0.5" style={{ color: L.textSec }}>{v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 详情 Tab */}
        <div className="flex flex-shrink-0" style={{ borderBottom: `1px solid ${L.border}` }}>
          {detailTabs.map(t => (
            <button key={t} className="flex-1 py-2 text-xs transition-all" style={{ background: detailTab === t ? L.primaryBg : "transparent", color: detailTab === t ? L.primary : L.muted, borderBottom: detailTab === t ? `2px solid ${L.primary}` : "2px solid transparent" }} onClick={() => setDetailTab(t)}>{t}</button>
          ))}
        </div>

        {/* 动态流 */}
        <div className="flex-1 overflow-auto p-3 space-y-3">
          {detailTab === "待处理" && activityFeed.map(a => (
            <div key={a.id} className="rounded-xl p-3" style={{ background: "#1a2640", border: `1px solid ${L.border}` }}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: L.primaryBg, color: L.primary }}>{a.type}</span>
                <span className="text-xs" style={{ color: L.muted }}>{a.time.split(" ")[0]}</span>
              </div>
              <p className="text-xs leading-relaxed mb-2" style={{ color: L.textSec }}>{a.content}</p>
              {a.images > 0 && (
                <div className="flex gap-1 mb-2">
                  {Array.from({ length: Math.min(a.images, 3) }).map((_, i) => (
                    <div key={i} className="w-12 h-12 rounded-lg" style={{ background: `hsl(${210 + i * 20}, 20%, 88%)` }} />
                  ))}
                </div>
              )}
              <div className="flex items-center gap-3 text-xs" style={{ color: L.muted }}>
                <span className="flex items-center gap-1"><Heart size={10} />{a.likes}</span>
                <span className="flex items-center gap-1"><MessageSquare size={10} />{a.comments}</span>
                <span className="flex items-center gap-1"><Share2 size={10} />{a.shares}</span>
              </div>
              <div className="mt-2 text-xs font-mono" style={{ color: L.mutedLight, fontSize: "10px" }}>单号：{a.id}</div>
            </div>
          ))}
          {detailTab === "订单详情" && (
            <div className="text-center py-8" style={{ color: L.muted }}>
              <CheckCircle size={24} className="mx-auto mb-2 opacity-30" />
              <div className="text-sm">暂无订单记录</div>
            </div>
          )}
          {detailTab === "历史操作记录" && (
            <div className="space-y-2">
              {["完成晒单任务", "参与拉新活动", "发布朋友圈", "完成回访", "提交反馈"].map((a, i) => (
                <div key={i} className="flex items-center gap-2 py-1.5 text-xs" style={{ borderBottom: `1px solid ${L.borderLight}` }}>
                  <Clock size={11} style={{ color: L.primary, flexShrink: 0 }} />
                  <span style={{ color: L.textSec }}>{a}</span>
                  <span className="ml-auto" style={{ color: L.muted }}>07-0{i + 1}</span>
                </div>
              ))}
            </div>
          )}
          {detailTab === "回访库" && (
            <div className="text-center py-8" style={{ color: L.muted }}>
              <MoreHorizontal size={24} className="mx-auto mb-2 opacity-30" />
              <div className="text-sm">暂无回访记录</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
