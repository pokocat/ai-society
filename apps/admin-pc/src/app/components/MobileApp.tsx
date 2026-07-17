import { ReactNode, useState } from "react";
import { Home, Users, CheckSquare, TrendingUp, User, Bell, ChevronRight, QrCode, Star, ArrowUp, Clock, CheckCircle, Gift, MessageCircle, Wallet, Settings, Package, Heart, Sparkles, X, Headphones, Megaphone } from "lucide-react";

// ─── 颜色系统 ─────────────────────────────────────────────────
const M = { bg: "#0d1629", surface: "#131f35", surface2: "#1a2640", border: "rgba(255,255,255,0.07)", primary: "#4361ee", primaryLight: "rgba(67,97,238,0.15)", muted: "#64748b", text: "#e2e8f0", textSec: "#94a3b8" };

type MobileTabId = "home" | "community" | "tasks" | "earnings" | "profile";

function MobileSheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="absolute inset-0 z-50 flex items-end" style={{ background: "rgba(4,8,18,0.76)" }} onClick={onClose}>
      <div className="w-full rounded-t-3xl p-5" style={{ background: M.surface }} onClick={event => event.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div className="font-semibold" style={{ color: M.text, fontSize: 15 }}>{title}</div>
          <button onClick={onClose} title="关闭"><X size={18} style={{ color: M.muted }} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── 首页 ─────────────────────────────────────────────────────
function HomeTab({ onNavigate, onOpenService, onOpenNotifications }: { onNavigate: (tab: MobileTabId) => void; onOpenService: () => void; onOpenNotifications: () => void }) {
  const [announcementIdx, setAnnouncementIdx] = useState(0);
  const announcements = [
    { title: "7月PRO特训营报名中", sub: "PRO会员9折，限额50席" },
    { title: "积分兑换上新", sub: "新增2款专属周边礼盒" },
    { title: "你的6月数据报告", sub: "本月影响力提升23%" },
  ];

  return (
    <div className="flex flex-col h-full overflow-auto" style={{ background: "linear-gradient(180deg, #131628 0%, #0e1120 100%)" }}>
      {/* 顶部 */}
      <div className="px-5 pt-12 pb-4">
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="font-semibold flex items-center gap-2" style={{ fontSize: "17px", color: M.text }}>
              嗨，李云天
              <Sparkles size={14} style={{ color: "#a78bfa" }} />
            </div>
            <div className="text-xs mt-0.5 flex items-center gap-1.5" style={{ color: M.muted }}>
              <Star size={11} style={{ color: "#f59e0b" }} />
              PRO会员 · 北京 · 有效至 2027-03-01
            </div>
          </div>
          <button className="relative" onClick={onOpenNotifications} title="消息通知">
            <div className="w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-95" style={{ background: M.surface2 }}>
              <Bell size={17} style={{ color: M.textSec }} />
            </div>
            <div className="absolute top-0 right-0 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center animate-pulse" style={{ fontSize: "9px" }}>3</div>
          </button>
        </div>

        {/* PRO会员卡 */}
        <div className="rounded-2xl p-5 relative overflow-hidden mb-4" style={{ background: "linear-gradient(135deg, #4361ee 0%, #7c3aed 60%, #3b82f6 100%)" }}>
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-10 bg-white" />
          <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full opacity-10 bg-white" />
          <div className="flex items-start justify-between mb-4 relative">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Star size={13} style={{ color: "#fbbf24" }} />
                <span className="text-xs font-semibold text-white">PRO 会员</span>
              </div>
              <div className="font-bold text-white" style={{ fontSize: "20px" }}>主理人私域会员</div>
            </div>
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-lg font-bold text-white" style={{ background: "rgba(255,255,255,0.2)" }}>李</div>
          </div>
          <div className="flex items-end justify-between relative">
            <div>
              <div className="text-xs mb-0.5" style={{ color: "rgba(255,255,255,0.65)" }}>会员有效期</div>
              <div className="font-medium text-white text-sm">2026.03.01 → 2027.03.01</div>
            </div>
            <div className="text-right">
              <div className="text-xs" style={{ color: "rgba(255,255,255,0.65)" }}>积分余额</div>
              <div className="font-bold text-white">2,840 分</div>
            </div>
          </div>
        </div>

        {/* 快捷功能 */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { icon: QrCode,        label: "入群码",  color: "#4f6ef7", action: () => onNavigate("community") },
            { icon: Gift,          label: "我的权益", color: "#10b981", action: () => onNavigate("profile") },
            { icon: MessageCircle, label: "联系客服", color: "#f59e0b", action: onOpenService },
            { icon: Wallet,        label: "我的收益", color: "#ec4899", action: () => onNavigate("earnings") },
          ].map(a => (
            <button key={a.label} onClick={a.action} className="flex flex-col items-center gap-2 py-3 rounded-2xl" style={{ background: M.surface2 }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${a.color}22` }}>
                <a.icon size={17} style={{ color: a.color }} />
              </div>
              <span className="text-xs" style={{ color: M.textSec }}>{a.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 公告轮播 */}
      <div className="px-5 mb-4">
        <div className="rounded-2xl p-4" style={{ background: M.surface2 }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              <div>
                <div className="text-sm font-medium" style={{ color: M.text }}>{announcements[announcementIdx].title}</div>
                <div className="text-xs mt-0.5" style={{ color: M.muted }}>{announcements[announcementIdx].sub}</div>
              </div>
            </div>
            <div className="flex gap-1">
              {announcements.map((_, i) => (
                <button key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: i === announcementIdx ? M.primary : M.border }} onClick={() => setAnnouncementIdx(i)} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 数据概览 */}
      <div className="px-5 mb-4">
        <div className="text-sm font-semibold mb-3" style={{ color: M.text }}>本月数据</div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "影响力", value: "3,510", delta: "+12%", color: "#4f6ef7" },
            { label: "推荐新人", value: "8 人",  delta: "+3",   color: "#10b981" },
            { label: "收益",    value: "¥1,240", delta: "+23%", color: "#f59e0b" },
          ].map(s => (
            <div key={s.label} className="rounded-2xl p-3" style={{ background: M.surface2 }}>
              <div className="text-xs mb-1" style={{ color: M.muted }}>{s.label}</div>
              <div className="font-bold" style={{ color: s.color, fontSize: "15px" }}>{s.value}</div>
              <div className="flex items-center gap-0.5 mt-0.5 text-xs" style={{ color: "#10b981" }}>
                <ArrowUp size={10} />{s.delta}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 我的服务老师 */}
      <div className="px-5 mb-4">
        <div className="text-sm font-semibold mb-3" style={{ color: M.text }}>我的服务老师</div>
        <div className="rounded-2xl p-4 flex items-center gap-4" style={{ background: M.surface2 }}>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold text-white flex-shrink-0" style={{ background: "linear-gradient(135deg, #4f6ef7, #7c3aed)" }}>吴</div>
          <div className="flex-1">
            <div className="font-semibold" style={{ color: M.text }}>吴思远</div>
            <div className="text-xs mt-0.5" style={{ color: M.muted }}>北京区域 · 5年经验</div>
            <div className="flex items-center gap-0.5 mt-1">
              {[...Array(5)].map((_, i) => <Star key={i} size={10} style={{ color: i < 5 ? "#f59e0b" : M.border }} />)}
              <span className="text-xs ml-1" style={{ color: M.muted }}>4.9分</span>
            </div>
          </div>
          <button onClick={onOpenService} className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white" style={{ background: M.primary }}>联系</button>
        </div>
      </div>

      {/* 待办 */}
      <div className="px-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold" style={{ color: M.text }}>待办事项</span>
          <button onClick={() => onNavigate("tasks")} className="text-xs" style={{ color: M.primary }}>查看全部</button>
        </div>
        {[
          { text: "完成 7 月学习打卡 Day 5", urgent: true,  time: "今日" },
          { text: "参与本周线上交流会",       urgent: false, time: "周五" },
          { text: "更新个人收益申请",          urgent: false, time: "月底" },
        ].map((t, i) => (
          <button key={i} onClick={() => onNavigate("tasks")} className="w-full flex items-center gap-3 py-3 text-left" style={{ borderBottom: `1px solid ${M.border}` }}>
            <div className="w-4 h-4 rounded-full border-2 flex-shrink-0" style={{ borderColor: t.urgent ? "#ef4444" : M.muted }} />
            <span className="flex-1 text-sm" style={{ color: M.textSec }}>{t.text}</span>
            <span className="text-xs" style={{ color: M.muted }}>{t.time}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── 社群 ─────────────────────────────────────────────────────
function CommunityTab() {
  const [showQR, setShowQR] = useState(false);
  const [appliedGroups, setAppliedGroups] = useState<string[]>([]);
  return (
    <div className="flex flex-col h-full overflow-auto" style={{ background: M.bg }}>
      <div className="px-5 pt-12 pb-4 flex-shrink-0" style={{ background: "linear-gradient(180deg, #131628 0%, #0e1120 100%)" }}>
        <div className="font-bold mb-1" style={{ fontSize: "20px", color: M.text }}>我的社群</div>
        <div className="text-xs" style={{ color: M.muted }}>已加入 1 个群 · 推荐 2 个可加入</div>
      </div>

      <div className="px-5 mt-4">
        {/* 已加入 */}
        <div className="text-xs font-semibold mb-2" style={{ color: M.primary }}>已加入</div>
        <div className="rounded-2xl p-4 mb-4" style={{ background: "linear-gradient(135deg, rgba(67,97,238,0.2), rgba(124,58,237,0.15))", border: "1px solid rgba(67,97,238,0.3)" }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold text-white flex-shrink-0" style={{ background: "linear-gradient(135deg, #4361ee, #7c3aed)" }}>北</div>
            <div>
              <div className="font-semibold" style={{ color: M.text }}>北京PRO会员群01</div>
              <div className="text-xs mt-0.5 flex items-center gap-2" style={{ color: M.muted }}>
                <span>PRO会员</span><span>·</span><span>487人</span><span>·</span><span>吴思远</span>
              </div>
            </div>
          </div>
          <div className="mb-1.5 flex justify-between text-xs" style={{ color: M.muted }}>
            <span>群容量</span><span style={{ color: "#ef4444" }}>487/500 · 接近满群</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden mb-3" style={{ background: M.surface }}>
            <div className="h-full rounded-full" style={{ width: "97.4%", background: "linear-gradient(90deg, #4361ee, #ef4444)" }} />
          </div>
          <button className="w-full py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2" style={{ background: M.primary }} onClick={() => setShowQR(true)}>
            <QrCode size={16} /> 查看入群二维码
          </button>
        </div>

        {/* QR 码弹窗 */}
        {showQR && (
          <div className="absolute inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.8)" }} onClick={() => setShowQR(false)}>
            <div className="rounded-3xl p-6 mx-8" style={{ background: M.surface2 }}>
              <div className="text-center mb-4">
                <div className="font-semibold" style={{ color: M.text }}>北京PRO会员群01</div>
                <div className="text-xs mt-1" style={{ color: M.muted }}>长按识别进群</div>
              </div>
              <div className="w-48 h-48 rounded-2xl flex items-center justify-center mx-auto mb-4 p-3" style={{ background: "#fff" }}>
                <img src="/reference-assets/wechat-qr.png" alt="北京PRO会员群入群二维码" className="w-full h-full object-contain" loading="eager" decoding="sync" />
              </div>
              <div className="text-center text-xs" style={{ color: M.muted }}>二维码有效期至 2026-07-31</div>
            </div>
          </div>
        )}

        {/* 推荐 */}
        <div className="text-xs font-semibold mb-2" style={{ color: M.muted }}>推荐加入</div>
        {[
          { name: "北京体验官群01", count: 123, max: 200, type: "体验官", color: "#10b981" },
          { name: "北京PRO会员群02（备用）", count: 12, max: 500, type: "PRO会员", color: "#4361ee" },
        ].map((g, i) => (
          <div key={i} className="rounded-2xl p-4 mb-3" style={{ background: M.surface2 }}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="font-semibold text-sm" style={{ color: M.text }}>{g.name}</div>
                <div className="text-xs mt-0.5" style={{ color: M.muted }}>{g.type} · {g.count}/{g.max} 人</div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: `${g.color}22`, color: g.color }}>{g.type}</span>
            </div>
            <div className="h-1 rounded-full overflow-hidden mb-3" style={{ background: M.surface }}>
              <div className="h-full rounded-full" style={{ width: `${Math.round((g.count / g.max) * 100)}%`, background: g.color }} />
            </div>
            <button
              disabled={appliedGroups.includes(g.name)}
              onClick={() => setAppliedGroups(current => [...current, g.name])}
              className="w-full py-2 rounded-xl text-xs font-semibold disabled:opacity-70"
              style={{ background: `${g.color}18`, color: g.color }}
            >
              {appliedGroups.includes(g.name) ? "申请已提交" : "申请加入"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── 任务 ─────────────────────────────────────────────────────
function TaskTab() {
  const [completedIds, setCompletedIds] = useState<number[]>([]);
  const tasks = [
    { id: 1, title: "回访新用户陈美玲",       type: "服务回访", priority: "高", deadline: "今日 14:00", points: 50 },
    { id: 2, title: "处理入群异常：刘晓峰",   type: "入群异常", priority: "高", deadline: "今日 12:00", points: 30 },
    { id: 3, title: "完成本周群活跃报告",      type: "日常运营", priority: "中", deadline: "明日",       points: 20 },
    { id: 4, title: "7月打卡 Day 5",           type: "每日签到", priority: "低", deadline: "今日",       points: 10 },
    { id: 5, title: "分享特训营预告朋友圈",    type: "内容任务", priority: "低", deadline: "后日",       points: 20 },
  ];
  const priorityColor: Record<string, string> = { "高": "#ef4444", "中": "#f59e0b", "低": "#4361ee" };
  const completedCount = completedIds.length;
  const totalPoints = completedIds.reduce((s, id) => s + (tasks.find(t => t.id === id)?.points || 0), 0);

  return (
    <div className="flex flex-col h-full overflow-auto" style={{ background: M.bg }}>
      <div className="px-5 pt-12 pb-4 flex-shrink-0" style={{ background: "linear-gradient(180deg, #131628 0%, #0e1120 100%)" }}>
        <div className="font-bold mb-1" style={{ fontSize: "20px", color: M.text }}>我的任务</div>
        <div className="flex items-center gap-4 text-xs mt-2">
          <span style={{ color: M.muted }}>今日进度</span>
          <span style={{ color: "#10b981", fontWeight: 600 }}>{completedCount}/{tasks.length} 已完成</span>
          {completedCount > 0 && <span style={{ color: "#f59e0b" }}>+{totalPoints} 积分获得</span>}
        </div>
        {/* 进度条 */}
        <div className="mt-3 h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${(completedCount / tasks.length) * 100}%`, background: "linear-gradient(90deg, #4361ee, #10b981)" }} />
        </div>
      </div>

      <div className="px-5 mt-4 space-y-3 mb-8">
        {tasks.map(t => {
          const isDone = completedIds.includes(t.id);
          return (
            <div key={t.id} className="rounded-2xl p-4 transition-all" style={{ background: isDone ? "rgba(16,185,129,0.08)" : M.surface2, border: `1px solid ${isDone ? "rgba(16,185,129,0.3)" : M.border}`, opacity: isDone ? 0.75 : 1 }}>
              <div className="flex items-start gap-3">
                <button className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all" style={{ borderColor: isDone ? "#10b981" : priorityColor[t.priority], background: isDone ? "#10b981" : "transparent" }} onClick={() => setCompletedIds(prev => isDone ? prev.filter(id => id !== t.id) : [...prev, t.id])}>
                  {isDone && <CheckCircle size={12} className="text-white" />}
                </button>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold" style={{ color: isDone ? M.muted : M.text, textDecoration: isDone ? "line-through" : "none" }}>{t.title}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: `${priorityColor[t.priority]}18`, color: priorityColor[t.priority] }}>{t.type}</span>
                    <span className="text-xs flex items-center gap-1" style={{ color: M.muted }}>
                      <Clock size={10} />{t.deadline}
                    </span>
                    <span className="text-xs" style={{ color: "#f59e0b" }}>+{t.points}积分</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── 收益 ─────────────────────────────────────────────────────
function EarningsTab({ onWithdraw }: { onWithdraw: () => void }) {
  const [activeMonth, setActiveMonth] = useState(3);
  const months = [{ m: "4月", v: 3200 }, { m: "5月", v: 4500 }, { m: "6月", v: 3800 }, { m: "7月", v: 1240 }];
  const maxV = Math.max(...months.map(m => m.v));
  const records = [
    { desc: "分销佣金 · 推荐李云天", amount: "+¥298", date: "07-05", type: "分销", positive: true },
    { desc: "服务奖励 · 7月绩效",     amount: "+¥500", date: "07-01", type: "奖励", positive: true },
    { desc: "提现至微信零钱",         amount: "-¥800", date: "06-30", type: "提现", positive: false },
    { desc: "分销佣金 · 推荐赵志远", amount: "+¥188", date: "06-28", type: "分销", positive: true },
    { desc: "提现至银行卡",           amount: "-¥500", date: "06-15", type: "提现", positive: false },
  ];

  return (
    <div className="flex flex-col h-full overflow-auto" style={{ background: M.bg }}>
      {/* 收益总额卡 */}
      <div className="px-5 pt-12 pb-5" style={{ background: "linear-gradient(180deg, #131628 0%, #0e1120 100%)" }}>
        <div className="font-bold mb-4" style={{ fontSize: "20px", color: M.text }}>我的收益</div>
        <div className="rounded-2xl p-5" style={{ background: "linear-gradient(135deg, #4361ee, #7c3aed)" }}>
          <div className="text-xs mb-1" style={{ color: "rgba(255,255,255,0.65)" }}>本月收益</div>
          <div className="text-4xl font-bold text-white mb-2">¥1,240</div>
          <div className="flex items-center gap-2 text-xs">
            <ArrowUp size={12} style={{ color: "#4ade80" }} />
            <span style={{ color: "#4ade80", fontWeight: 600 }}>较上月 +12.3%</span>
            <span style={{ color: "rgba(255,255,255,0.5)" }}>· 累计 ¥12,740</span>
          </div>
        </div>
      </div>

      <div className="px-5 mt-4">
        {/* 月度迷你图 */}
        <div className="rounded-2xl p-4 mb-4" style={{ background: M.surface2 }}>
          <div className="text-sm font-semibold mb-3" style={{ color: M.text }}>近4月收益</div>
          <div className="flex items-end gap-2 h-20 mb-2">
            {months.map((m, i) => (
              <div key={m.m} className="flex-1 flex flex-col items-center gap-1 cursor-pointer" onClick={() => setActiveMonth(i)}>
                <div className="w-full rounded-t-lg transition-all" style={{ height: `${Math.round((m.v / maxV) * 72)}px`, background: i === activeMonth ? M.primary : "rgba(79,110,247,0.3)" }} />
                <div className="text-xs" style={{ color: i === activeMonth ? M.primary : M.muted }}>{m.m}</div>
              </div>
            ))}
          </div>
          <div className="text-center">
            <span className="text-xs" style={{ color: M.muted }}>{months[activeMonth].m}收益：</span>
            <span className="text-sm font-bold" style={{ color: M.primary }}>¥{months[activeMonth].v.toLocaleString()}</span>
          </div>
        </div>

        {/* 4统计卡 */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {[
            { label: "累计收益", value: "¥12,740", color: M.primary },
            { label: "待结算",   value: "¥380",    color: "#f59e0b" },
            { label: "已提现",   value: "¥12,360", color: "#10b981" },
            { label: "分销收益", value: "¥3,200",  color: "#ec4899" },
          ].map(s => (
            <div key={s.label} className="rounded-2xl p-4" style={{ background: M.surface2 }}>
              <div className="text-xs mb-1" style={{ color: M.muted }}>{s.label}</div>
              <div className="font-bold" style={{ color: s.color, fontSize: "17px" }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* 提现按钮 */}
        <button onClick={onWithdraw} className="w-full py-4 rounded-2xl text-base font-bold text-white mb-4" style={{ background: "linear-gradient(135deg, #4361ee, #7c3aed)" }}>
          <Wallet size={16} className="inline mr-2" />申请提现
        </button>

        {/* 明细 */}
        <div className="rounded-2xl overflow-hidden mb-8" style={{ background: M.surface2 }}>
          <div className="px-4 py-3 font-semibold text-sm" style={{ color: M.text, borderBottom: `1px solid ${M.border}` }}>收益明细</div>
          {records.map((r, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3.5" style={{ borderBottom: i < records.length - 1 ? `1px solid ${M.border}` : "none" }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: r.positive ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.12)" }}>
                <Wallet size={14} style={{ color: r.positive ? "#10b981" : "#ef4444" }} />
              </div>
              <div className="flex-1">
                <div className="text-sm" style={{ color: M.text }}>{r.desc}</div>
                <div className="text-xs mt-0.5 flex items-center gap-2" style={{ color: M.muted }}>
                  <span>{r.date}</span><span className="px-1.5 py-0.5 rounded" style={{ background: M.surface, fontSize: "10px" }}>{r.type}</span>
                </div>
              </div>
              <div className="font-bold" style={{ color: r.positive ? "#10b981" : "#ef4444" }}>{r.amount}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── 我的 ─────────────────────────────────────────────────────
function ProfileTab({ onAction }: { onAction: (action: string) => void }) {
  const badges = [
    { name: "活跃达人", icon: Sparkles, color: "#f59e0b" },
    { name: "推荐之星", icon: Star, color: "#ec4899" },
    { name: "学习先锋", icon: Package, color: "#4361ee" },
  ];
  const orders = [
    { name: "PRO会员年卡", amount: "¥2,480", date: "2026-03-01", status: "已完成" },
    { name: "续费PRO年卡", amount: "¥2,480", date: "2025-03-01", status: "已完成" },
    { name: "体验营课程",   amount: "¥980",  date: "2025-01-15", status: "已完成" },
  ];

  return (
    <div className="flex flex-col h-full overflow-auto" style={{ background: M.bg }}>
      {/* 个人资料头 */}
      <div className="px-5 pt-12 pb-5 text-center" style={{ background: "linear-gradient(180deg, #131628 0%, #0e1120 100%)" }}>
        <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-3xl font-bold text-white mx-auto mb-3" style={{ background: "linear-gradient(135deg, #4361ee, #7c3aed)" }}>李</div>
        <div className="font-bold text-white" style={{ fontSize: "19px" }}>李云天</div>
        <div className="text-xs mt-1" style={{ color: M.muted }}>138-0123-4567 · 北京</div>
        <div className="flex items-center justify-center gap-2 mt-3">
          <span className="px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1" style={{ background: "rgba(79,110,247,0.25)", color: M.primary }}><Star size={10} />PRO会员</span>
          <span className="px-2 py-1 rounded-full text-xs" style={{ background: "rgba(245,158,11,0.2)", color: "#f59e0b" }}>积分：2,840</span>
        </div>

        {/* 成就徽章 */}
        <div className="flex items-center justify-center gap-3 mt-4">
          {badges.map(b => (
            <div key={b.name} className="flex flex-col items-center gap-1">
              <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: `${b.color}22` }}><b.icon size={16} style={{ color: b.color }} /></div>
              <span className="text-xs" style={{ color: M.muted }}>{b.name}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="px-5 mt-4">
        {/* 信息卡 */}
        <div className="rounded-2xl overflow-hidden mb-4" style={{ background: M.surface2 }}>
          {[
            ["微信号", "liyuntian88"], ["所在城市", "北京"],
            ["会员等级", "PRO会员"], ["入会时间", "2025-03-15"],
            ["来源渠道", "公众号"], ["推荐人", "吴思远"],
          ].map(([k, v], i, arr) => (
            <div key={k} className="flex items-center justify-between px-4 py-3" style={{ borderBottom: i < arr.length - 1 ? `1px solid ${M.border}` : "none" }}>
              <span className="text-sm" style={{ color: M.muted }}>{k}</span>
              <span className="text-sm font-medium" style={{ color: M.text }}>{v}</span>
            </div>
          ))}
        </div>

        {/* 订单记录 */}
        <div className="text-sm font-semibold mb-3" style={{ color: M.text }}>订单记录</div>
        <div className="rounded-2xl overflow-hidden mb-4" style={{ background: M.surface2 }}>
          {orders.map((o, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3.5" style={{ borderBottom: i < orders.length - 1 ? `1px solid ${M.border}` : "none" }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(79,110,247,0.15)" }}>
                <Package size={14} style={{ color: M.primary }} />
              </div>
              <div className="flex-1">
                <div className="text-sm" style={{ color: M.text }}>{o.name}</div>
                <div className="text-xs mt-0.5" style={{ color: M.muted }}>{o.date}</div>
              </div>
              <div>
                <div className="text-sm font-bold" style={{ color: "#10b981" }}>{o.amount}</div>
                <div className="text-xs text-right" style={{ color: M.muted }}>{o.status}</div>
              </div>
            </div>
          ))}
        </div>

        {/* 菜单 */}
        {[
          { label: "我的权益", icon: Gift,        sub: "查看PRO全部权益" },
          { label: "推荐记录", icon: Heart,        sub: "已推荐 8 人" },
          { label: "联系客服", icon: MessageCircle,sub: "在线服务" },
          { label: "系统设置", icon: Settings,     sub: "" },
        ].map(m => (
          <button key={m.label} onClick={() => onAction(m.label)} className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl mb-2" style={{ background: M.surface2 }}>
            <m.icon size={18} style={{ color: M.primary }} />
            <div className="flex-1 text-left">
              <div className="text-sm font-medium" style={{ color: M.text }}>{m.label}</div>
              {m.sub && <div className="text-xs" style={{ color: M.muted }}>{m.sub}</div>}
            </div>
            <ChevronRight size={16} style={{ color: M.muted }} />
          </button>
        ))}

        <button onClick={() => onAction("退出登录")} className="w-full py-4 rounded-2xl text-sm font-medium mt-2 mb-8" style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }}>
          退出登录
        </button>
      </div>
    </div>
  );
}

// ─── 主组件 ───────────────────────────────────────────────────
const tabs = [
  { id: "home" as MobileTabId,      label: "首页", icon: Home },
  { id: "community" as MobileTabId, label: "社群", icon: Users },
  { id: "tasks" as MobileTabId,     label: "任务", icon: CheckSquare },
  { id: "earnings" as MobileTabId,  label: "收益", icon: TrendingUp },
  { id: "profile" as MobileTabId,   label: "我的", icon: User },
];

export default function MobileApp() {
  const [activeTab, setActiveTab] = useState<MobileTabId>("home");
  const [serviceOpen, setServiceOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawSubmitted, setWithdrawSubmitted] = useState(false);
  const [toast, setToast] = useState("");

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 1600);
  };

  const renderTab = () => {
    if (activeTab === "home") return <HomeTab onNavigate={setActiveTab} onOpenService={() => setServiceOpen(true)} onOpenNotifications={() => setNotificationsOpen(true)} />;
    if (activeTab === "community") return <CommunityTab />;
    if (activeTab === "tasks") return <TaskTab />;
    if (activeTab === "earnings") return <EarningsTab onWithdraw={() => { setWithdrawSubmitted(false); setWithdrawOpen(true); }} />;
    return <ProfileTab onAction={action => {
      if (action === "联系客服") setServiceOpen(true);
      else showToast(action === "退出登录" ? "演示账号已安全退出" : `${action}已打开`);
    }} />;
  };

  const amount = Number(withdrawAmount);
  const withdrawalValid = Number.isInteger(amount) && amount >= 100 && amount <= 1240;

  return (
    <div className="flex items-center justify-center min-h-screen py-6 max-sm:py-0" style={{ background: "#f5f6fa" }}>
      {/* iPhone 16 Pro Max 外壳 */}
      <div data-testid="member-phone" className="relative flex-shrink-0 rounded-[54px] border-[8px] border-[#2d2d44] max-sm:rounded-none max-sm:border-0" style={{ width: "min(393px, 100vw)", height: "min(852px, 100vh)", minHeight: 720, background: "#1a1a2e", boxShadow: "0 40px 80px rgba(0,0,0,0.35), inset 0 0 0 1px rgba(255,255,255,0.08)", overflow: "hidden" }}>
        {/* Dynamic island */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-28 h-8 rounded-full z-20 max-sm:hidden" style={{ background: "#000" }} />

        {/* Screen */}
        <div className="h-full flex flex-col" style={{ background: M.bg }}>
          <div className="flex-1 overflow-hidden">
            {renderTab()}
          </div>

          {/* Tab bar */}
          <div className="flex-shrink-0 pb-6 pt-2" style={{ background: "rgba(14,17,32,0.95)", borderTop: `1px solid ${M.border}`, backdropFilter: "blur(10px)" }}>
            <div className="flex">
              {tabs.map(t => {
                const isActive = activeTab === t.id;
                return (
                  <button key={t.id} className="flex-1 flex flex-col items-center gap-1 py-1.5 transition-all" onClick={() => setActiveTab(t.id)}>
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center transition-all" style={{ background: isActive ? M.primaryLight : "transparent" }}>
                      <t.icon size={19} style={{ color: isActive ? M.primary : M.muted }} />
                    </div>
                    <span style={{ fontSize: "10px", color: isActive ? M.primary : M.muted, fontWeight: isActive ? 600 : 400 }}>{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {serviceOpen && <MobileSheet title="联系服务老师" onClose={() => setServiceOpen(false)}>
          <div className="mt-4 flex items-center gap-3 p-3 rounded-2xl" style={{ background: M.surface2 }}>
            <span className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-semibold" style={{ background: "linear-gradient(135deg, #4361ee, #7c3aed)" }}>吴</span>
            <span className="flex-1"><span className="block font-medium" style={{ color: M.text, fontSize: 13 }}>吴思远</span><span className="block mt-1" style={{ color: M.muted, fontSize: 10 }}>北京区域服务老师 · 在线</span></span>
            <Headphones size={18} style={{ color: "#34d399" }} />
          </div>
          <button onClick={() => { setServiceOpen(false); showToast("已发起在线会话"); }} className="mt-4 w-full py-3 rounded-xl text-white font-medium" style={{ background: M.primary, fontSize: 12 }}>发起在线会话</button>
        </MobileSheet>}

        {notificationsOpen && <MobileSheet title="消息通知" onClose={() => setNotificationsOpen(false)}>
          <div className="mt-4 space-y-2">
            {["7月PRO特训营报名已开启", "北京PRO会员群即将满员", "本周任务新增 3 项"].map((message, index) => <div key={message} className="p-3 rounded-xl flex items-start gap-3" style={{ background: M.surface2 }}><Megaphone size={14} style={{ color: index === 0 ? "#a78bfa" : M.primary, marginTop: 2 }} /><span className="flex-1" style={{ color: M.textSec, fontSize: 11 }}>{message}</span><span className="w-2 h-2 rounded-full" style={{ background: M.primary }} /></div>)}
          </div>
          <button onClick={() => { setNotificationsOpen(false); showToast("通知已全部标记为已读"); }} className="mt-4 w-full py-3 rounded-xl" style={{ color: M.primary, background: M.primaryLight, fontSize: 11 }}>全部标记为已读</button>
        </MobileSheet>}

        {withdrawOpen && <MobileSheet title="申请提现" onClose={() => setWithdrawOpen(false)}>
          {withdrawSubmitted ? <div className="py-8 text-center"><CheckCircle size={42} className="mx-auto" style={{ color: "#34d399" }} /><div className="mt-3 font-semibold" style={{ color: M.text }}>提现申请已提交</div><div className="mt-1" style={{ color: M.muted, fontSize: 10 }}>预计 1-2 个工作日到账</div><button onClick={() => setWithdrawOpen(false)} className="mt-5 w-full py-3 rounded-xl text-white" style={{ background: M.primary, fontSize: 11 }}>完成</button></div> : <>
            <div className="mt-4 p-3 rounded-xl" style={{ background: M.surface2 }}><div style={{ color: M.muted, fontSize: 9 }}>可提现金额</div><div className="mt-1 font-semibold" style={{ color: M.text, fontSize: 22 }}>¥1,240.00</div></div>
            <label className="block mt-3"><span style={{ color: M.textSec, fontSize: 10 }}>提现金额</span><input type="number" value={withdrawAmount} onChange={event => setWithdrawAmount(event.target.value)} placeholder="最低 100 元" className="mt-1.5 w-full px-3 py-3 rounded-xl outline-none" style={{ color: M.text, background: M.surface2, border: `1px solid ${withdrawAmount && !withdrawalValid ? "rgba(239,68,68,0.6)" : M.border}`, fontSize: 13 }} /></label>
            <div className="mt-2 min-h-4" style={{ color: withdrawalValid || !withdrawAmount ? M.muted : "#ef4444", fontSize: 9 }}>{withdrawAmount && !withdrawalValid ? "请输入 100-1240 元之间的整数金额" : "将提现至已实名微信账户"}</div>
            <button disabled={!withdrawalValid} onClick={() => setWithdrawSubmitted(true)} className="mt-3 w-full py-3 rounded-xl text-white disabled:opacity-40" style={{ background: M.primary, fontSize: 11 }}>确认提现</button>
          </>}
        </MobileSheet>}

        {toast && <div className="absolute left-1/2 -translate-x-1/2 bottom-24 z-[60] px-4 py-2 rounded-full shadow-xl whitespace-nowrap" style={{ color: "white", background: "rgba(15,23,42,0.94)", fontSize: 10 }}>{toast}</div>}
      </div>
    </div>
  );
}
