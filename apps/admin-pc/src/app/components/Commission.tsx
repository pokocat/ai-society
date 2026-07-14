import { useState } from "react";
import { Check, X, ChevronDown, TrendingUp, Users, DollarSign, Clock } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area,
} from "recharts";

const L = {
  bg: "#0d1629", surface: "#131f35", border: "rgba(255,255,255,0.07)", borderLight: "rgba(255,255,255,0.04)",
  primary: "#4361ee", primaryBg: "rgba(67,97,238,0.15)", text: "#e2e8f0", textSec: "#94a3b8",
  muted: "#64748b", mutedLight: "#475569", surface2: "#1a2640",
};

// ─── Mock data ────────────────────────────────────────────────────────────────

const MONTHLY_TREND = [
  { month: "2月", total: 22400, l1: 10200, l2: 8100, l3: 4100 },
  { month: "3月", total: 28600, l1: 13000, l2: 10400, l3: 5200 },
  { month: "4月", total: 31200, l1: 14200, l2: 11200, l3: 5800 },
  { month: "5月", total: 34800, l1: 16000, l2: 12500, l3: 6300 },
  { month: "6月", total: 36100, l1: 16800, l2: 12900, l3: 6400 },
  { month: "7月", total: 38420, l1: 18200, l2: 12600, l3: 7620 },
];

const TOP_EARNERS = [
  { rank: 1, name: "张志远",   level: "一级",  month: 6820, total: 48200, team: 18 },
  { rank: 2, name: "李晓红",   level: "一级",  month: 5640, total: 39600, team: 14 },
  { rank: 3, name: "王建国",   level: "一级",  month: 4980, total: 32100, team: 11 },
  { rank: 4, name: "陈美玲",   level: "二级",  month: 3200, total: 21800, team: 8  },
  { rank: 5, name: "赵伟明",   level: "二级",  month: 2960, total: 18400, team: 7  },
];

const COMMISSION_DETAIL = [
  { time: "2026-07-05 09:12", agent: "张志远", level: "一级", order: "ORD20260705001", type: "直销",   amount: 596,  status: "已结算" },
  { time: "2026-07-05 10:30", agent: "李晓红", level: "一级", order: "ORD20260705002", type: "直销",   amount: 196,  status: "待结算" },
  { time: "2026-07-05 11:48", agent: "陈美玲", level: "二级", order: "ORD20260705003", type: "间接",   amount: 298,  status: "待结算" },
  { time: "2026-07-04 14:22", agent: "王建国", level: "一级", order: "ORD20260704001", type: "直销",   amount: 880,  status: "已结算" },
  { time: "2026-07-04 16:00", agent: "赵伟明", level: "二级", order: "ORD20260704002", type: "间接",   amount: 148,  status: "已结算" },
  { time: "2026-07-04 17:30", agent: "孙文英", level: "三级", order: "ORD20260704003", type: "团队奖", amount: 74,   status: "待结算" },
  { time: "2026-07-03 09:00", agent: "张志远", level: "一级", order: "ORD20260703001", type: "直销",   amount: 1760, status: "已结算" },
  { time: "2026-07-03 10:20", agent: "李晓红", level: "一级", order: "ORD20260703002", type: "直销",   amount: 596,  status: "已结算" },
  { time: "2026-07-02 14:00", agent: "刘春雨", level: "二级", order: "ORD20260702001", type: "间接",   amount: 298,  status: "已结算" },
  { time: "2026-07-01 08:30", agent: "钱小明", level: "三级", order: "ORD20260701001", type: "团队奖", amount: 49,   status: "已结算" },
];

const SETTLEMENT_RECORDS = [
  { period: "2026年6月", agents: 128, total: 36100, status: "已结算", time: "2026-07-01 10:00" },
  { period: "2026年5月", agents: 121, total: 34800, status: "已结算", time: "2026-06-01 10:00" },
  { period: "2026年4月", agents: 115, total: 31200, status: "已结算", time: "2026-05-01 10:00" },
  { period: "2026年3月", agents: 108, total: 28600, status: "已结算", time: "2026-04-01 10:00" },
  { period: "2026年2月", agents: 98,  total: 22400, status: "已结算", time: "2026-03-01 10:00" },
  { period: "2026年7月", agents: 134, total: 38420, status: "结算中", time: "—" },
];

const WITHDRAWAL_REQUESTS = [
  { id: 1, name: "张志远", amount: 5000, method: "支付宝 138****4567", time: "2026-07-05 09:00", status: "待审核" },
  { id: 2, name: "李晓红", amount: 3200, method: "招商银行 **** 8821", time: "2026-07-04 14:30", status: "已打款" },
  { id: 3, name: "王建国", amount: 2800, method: "微信零钱 139****2233", time: "2026-07-04 11:00", status: "待审核" },
  { id: 4, name: "陈美玲", amount: 1600, method: "支付宝 158****7890", time: "2026-07-03 16:00", status: "已打款" },
  { id: 5, name: "赵伟明", amount: 900,  method: "工商银行 **** 3342", time: "2026-07-03 09:20", status: "已拒绝" },
  { id: 6, name: "孙文英", amount: 600,  method: "支付宝 186****6677", time: "2026-07-02 15:00", status: "待审核" },
];

// ─── Badge helper ─────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  "已结算": { bg: "rgba(16,185,129,0.15)", color: "#34d399" },
  "待结算": { bg: "rgba(245,158,11,0.15)", color: "#fbbf24" },
  "结算中": { bg: "rgba(67,97,238,0.15)", color: "#818cf8" },
  "已打款": { bg: "rgba(16,185,129,0.15)", color: "#34d399" },
  "待审核": { bg: "rgba(245,158,11,0.15)", color: "#fbbf24" },
  "已拒绝": { bg: "rgba(239,68,68,0.15)", color: "#f87171" },
  "直销":   { bg: "rgba(67,97,238,0.15)", color: "#818cf8" },
  "间接":   { bg: "rgba(100,116,139,0.15)", color: "#94a3b8" },
  "团队奖": { bg: "rgba(67,97,238,0.12)", color: "#4361ee" },
};

function Badge({ label }: { label: string }) {
  const c = STATUS_COLORS[label] ?? { bg: "rgba(100,116,139,0.15)", color: "#94a3b8" };
  return (
    <span
      style={{
        background: c.bg,
        color: c.color,
        borderRadius: 4,
        padding: "2px 7px",
        fontSize: 11,
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

const LEVEL_COLOR: Record<string, string> = {
  "一级": "#4361ee",
  "二级": "#10b981",
  "三级": "#f59e0b",
};

// ─── Modal ────────────────────────────────────────────────────────────────────

function WithdrawalModal({ onClose }: { onClose: () => void }) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("支付宝");

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: L.surface,
          borderRadius: 12,
          padding: 24,
          width: 400,
          boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <span className="font-semibold" style={{ color: L.text }}>申请提现</span>
          <button onClick={onClose} style={{ color: L.muted, background: "none", border: "none", cursor: "pointer" }}>
            <X size={16} />
          </button>
        </div>
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs mb-1 block" style={{ color: L.muted }}>提现金额（元）</label>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="请输入提现金额"
              style={{
                width: "100%",
                border: `1px solid ${L.border}`,
                borderRadius: 6,
                padding: "8px 10px",
                fontSize: 13,
                color: L.text,
                outline: "none",
              }}
            />
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: L.muted }}>提现方式</label>
            <div className="flex gap-2">
              {["支付宝", "微信", "银行卡"].map(m => (
                <button
                  key={m}
                  onClick={() => setMethod(m)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 6,
                    border: `1px solid ${method === m ? L.primary : L.border}`,
                    background: method === m ? L.primaryBg : L.surface,
                    color: method === m ? L.primary : L.muted,
                    fontSize: 12,
                    cursor: "pointer",
                    fontWeight: method === m ? 600 : 400,
                  }}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: L.muted }}>账号</label>
            <input
              placeholder={method === "银行卡" ? "银行卡号" : `${method}账号`}
              style={{
                width: "100%",
                border: `1px solid ${L.border}`,
                borderRadius: 6,
                padding: "8px 10px",
                fontSize: 13,
                color: L.text,
                outline: "none",
              }}
            />
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: "8px",
              borderRadius: 6,
              border: `1px solid ${L.border}`,
              background: L.surface,
              color: L.muted,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            取消
          </button>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: "8px",
              borderRadius: 6,
              border: "none",
              background: L.primary,
              color: "#fff",
              fontSize: 13,
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            提交申请
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Agent Tree Diagram ───────────────────────────────────────────────────────

function AgentTree() {
  const levels = [
    { label: "一级代理", color: "#4361ee", bg: "rgba(67,97,238,0.12)", count: 34, rate: "20%佣金", example: ["张志远", "李晓红", "王建国"] },
    { label: "二级代理", color: "#10b981", bg: "rgba(16,185,129,0.15)", count: 67, rate: "10%佣金", example: ["陈美玲", "赵伟明", "孙文英"] },
    { label: "三级代理", color: "#f59e0b", bg: "rgba(245,158,11,0.15)", count: 33, rate: "5%佣金",  example: ["刘春雨", "钱小明", "方大国"] },
  ];

  return (
    <div
      style={{
        background: L.surface,
        border: `1px solid ${L.border}`,
        borderRadius: 10,
        padding: 16,
      }}
    >
      <div className="font-semibold text-sm mb-3" style={{ color: L.text }}>代理层级架构</div>
      <div className="flex flex-col gap-2">
        {levels.map((lvl, i) => (
          <div key={lvl.label} className="flex items-start gap-3">
            {/* indent */}
            <div style={{ width: i * 20, flexShrink: 0 }} />
            <div
              style={{
                background: lvl.bg,
                border: `1px solid ${lvl.color}33`,
                borderRadius: 8,
                padding: "8px 12px",
                flex: 1,
              }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-xs" style={{ color: lvl.color }}>{lvl.label}</span>
                <span className="text-xs" style={{ color: L.muted }}>{lvl.count}人 · {lvl.rate}</span>
              </div>
              <div className="flex gap-1 flex-wrap">
                {lvl.example.map(n => (
                  <span
                    key={n}
                    style={{
                      background: L.surface,
                      border: `1px solid ${L.border}`,
                      borderRadius: 4,
                      padding: "1px 6px",
                      fontSize: 10,
                      color: L.textSec,
                    }}
                  >
                    {n}
                  </span>
                ))}
                <span style={{ fontSize: 10, color: L.muted, padding: "1px 0" }}>+{lvl.count - 3}人</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function Commission() {
  const [activeTab, setActiveTab] = useState("overview");
  const [withdrawalModal, setWithdrawalModal] = useState(false);
  const [withdrawals, setWithdrawals] = useState(WITHDRAWAL_REQUESTS);
  const [detailFilter, setDetailFilter] = useState({ level: "全部", type: "全部" });

  const tabs = [
    { key: "overview",    label: "收益总览" },
    { key: "detail",      label: "佣金明细" },
    { key: "settlement",  label: "结算记录" },
    { key: "withdrawal",  label: "提现管理" },
  ];

  const approveWithdrawal = (id: number) => {
    setWithdrawals(w => w.map(r => r.id === id ? { ...r, status: "已打款" } : r));
  };
  const rejectWithdrawal = (id: number) => {
    setWithdrawals(w => w.map(r => r.id === id ? { ...r, status: "已拒绝" } : r));
  };

  const filteredDetail = COMMISSION_DETAIL.filter(
    r =>
      (detailFilter.level === "全部" || r.level === detailFilter.level) &&
      (detailFilter.type === "全部" || r.type === detailFilter.type)
  );

  return (
    <div className="p-6 flex flex-col gap-5" style={{ background: L.bg, minHeight: "100%" }}>
      {withdrawalModal && <WithdrawalModal onClose={() => setWithdrawalModal(false)} />}

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-base" style={{ color: L.text }}>分销佣金管理</h2>
          <p className="text-xs mt-0.5" style={{ color: L.muted }}>追踪代理佣金、结算进度与提现审核</p>
        </div>
        <button
          onClick={() => setWithdrawalModal(true)}
          style={{
            background: L.primary,
            color: "#fff",
            border: "none",
            borderRadius: 7,
            padding: "7px 14px",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          + 申请提现
        </button>
      </div>

      {/* ── Tabs ── */}
      <div
        style={{
          display: "flex",
          gap: 0,
          background: L.surface,
          border: `1px solid ${L.border}`,
          borderRadius: 8,
          padding: 3,
          width: "fit-content",
        }}
      >
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{
              padding: "5px 14px",
              borderRadius: 6,
              border: "none",
              background: activeTab === t.key ? L.primary : "transparent",
              color: activeTab === t.key ? "#fff" : L.muted,
              fontSize: 12,
              fontWeight: activeTab === t.key ? 600 : 400,
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* TAB 1 – 收益总览                                                  */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {activeTab === "overview" && (
        <>
          {/* Stats */}
          <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
            {[
              { label: "本月总佣金", value: "¥38,420", icon: DollarSign, color: "#4361ee", bg: "rgba(67,97,238,0.12)" },
              { label: "待结算",     value: "¥12,840", icon: Clock,       color: "#f59e0b", bg: "rgba(245,158,11,0.15)" },
              { label: "已提现",     value: "¥25,580", icon: Check,       color: "#10b981", bg: "rgba(16,185,129,0.15)" },
              { label: "代理总数",   value: "134人",   icon: Users,       color: "#64748b", bg: "rgba(255,255,255,0.04)" },
            ].map(s => {
              const Icon = s.icon;
              return (
                <div
                  key={s.label}
                  style={{
                    background: L.surface,
                    border: `1px solid ${L.border}`,
                    borderRadius: 10,
                    padding: "14px 16px",
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs" style={{ color: L.muted }}>{s.label}</span>
                    <div
                      style={{
                        background: s.bg,
                        borderRadius: 6,
                        padding: 5,
                      }}
                    >
                      <Icon size={13} style={{ color: s.color }} />
                    </div>
                  </div>
                  <div className="font-bold text-xl" style={{ color: L.text }}>{s.value}</div>
                </div>
              );
            })}
          </div>

          {/* Distribution pyramid */}
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
            {[
              { label: "一级代理", fee: "¥4,800授权费", rate: "20%", count: 34, revenue: 18200, color: "#4361ee", bg: "rgba(67,97,238,0.12)" },
              { label: "二级代理", fee: "下线推荐佣金",  rate: "10%", count: 67, revenue: 12600, color: "#10b981", bg: "rgba(16,185,129,0.15)" },
              { label: "三级代理", fee: "团队奖励",      rate: "5%",  count: 33, revenue: 7620,  color: "#f59e0b", bg: "rgba(245,158,11,0.15)" },
            ].map(p => (
              <div
                key={p.label}
                style={{
                  background: L.surface,
                  border: `1px solid ${L.border}`,
                  borderRadius: 10,
                  padding: 14,
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-sm" style={{ color: L.text }}>{p.label}</span>
                  <span
                    style={{
                      background: p.bg,
                      color: p.color,
                      borderRadius: 4,
                      padding: "2px 7px",
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    佣金率 {p.rate}
                  </span>
                </div>
                <div className="text-xs mb-2" style={{ color: L.muted }}>{p.fee}</div>
                <div className="flex gap-4">
                  <div>
                    <div className="text-xs" style={{ color: L.muted }}>人数</div>
                    <div className="font-bold text-base" style={{ color: L.text }}>{p.count}人</div>
                  </div>
                  <div>
                    <div className="text-xs" style={{ color: L.muted }}>本月收益</div>
                    <div className="font-bold text-base" style={{ color: p.color }}>
                      ¥{p.revenue.toLocaleString()}
                    </div>
                  </div>
                </div>
                {/* Mini progress bar */}
                <div
                  style={{
                    marginTop: 10,
                    height: 4,
                    background: L.borderLight,
                    borderRadius: 2,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${(p.revenue / 38420) * 100}%`,
                      height: "100%",
                      background: p.color,
                      borderRadius: 2,
                    }}
                  />
                </div>
                <div className="text-xs mt-1" style={{ color: L.muted }}>
                  占总佣金 {((p.revenue / 38420) * 100).toFixed(1)}%
                </div>
              </div>
            ))}
          </div>

          {/* Chart + tree */}
          <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 300px" }}>
            {/* Trend chart */}
            <div
              style={{
                background: L.surface,
                border: `1px solid ${L.border}`,
                borderRadius: 10,
                padding: 16,
              }}
            >
              <div className="font-semibold text-sm mb-1" style={{ color: L.text }}>月度佣金趋势</div>
              <p className="text-xs mb-3" style={{ color: L.muted }}>最近6个月各级代理佣金构成</p>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={MONTHLY_TREND}>
                  <defs>
                    <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4361ee" stopOpacity={0.18} />
                      <stop offset="95%" stopColor="#4361ee" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="g3" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={L.borderLight} vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: L.muted }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: L.muted }} axisLine={false} tickLine={false} width={36}
                    tickFormatter={v => `¥${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ background: "#1a2640", border: "1px solid rgba(255,255,255,0.1)", color: "#e2e8f0", borderRadius: 8, fontSize: 12 }}
                    formatter={(v: number, name: string) => {
                      const map: Record<string, string> = { l1: "一级", l2: "二级", l3: "三级", total: "合计" };
                      return [`¥${v.toLocaleString()}`, map[name] ?? name];
                    }}
                  />
                  <Area type="monotone" dataKey="l1" stroke="#4361ee" fill="url(#g1)" strokeWidth={2} dot={false} />
                  <Area type="monotone" dataKey="l2" stroke="#10b981" fill="url(#g2)" strokeWidth={2} dot={false} />
                  <Area type="monotone" dataKey="l3" stroke="#f59e0b" fill="url(#g3)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Agent tree */}
            <AgentTree />
          </div>

          {/* Top earners */}
          <div
            style={{
              background: L.surface,
              border: `1px solid ${L.border}`,
              borderRadius: 10,
              overflow: "hidden",
            }}
          >
            <div className="px-4 py-3" style={{ borderBottom: `1px solid ${L.border}` }}>
              <span className="font-semibold text-sm" style={{ color: L.text }}>本月收益榜单 TOP 5</span>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: L.bg }}>
                  {["排名", "姓名", "等级", "本月佣金", "累计佣金", "团队人数"].map(h => (
                    <th
                      key={h}
                      style={{
                        padding: "8px 14px",
                        textAlign: "left",
                        color: L.muted,
                        fontWeight: 500,
                        borderBottom: `1px solid ${L.border}`,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TOP_EARNERS.map(r => (
                  <tr key={r.rank} style={{ borderBottom: `1px solid ${L.borderLight}` }}>
                    <td style={{ padding: "9px 14px" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: 22,
                          height: 22,
                          borderRadius: "50%",
                          background: r.rank <= 3 ? L.primary : L.bg,
                          color: r.rank <= 3 ? "#fff" : L.muted,
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        {r.rank}
                      </span>
                    </td>
                    <td style={{ padding: "9px 14px", color: L.text, fontWeight: 500 }}>{r.name}</td>
                    <td style={{ padding: "9px 14px" }}>
                      <span
                        style={{
                          background: LEVEL_COLOR[r.level] + "18",
                          color: LEVEL_COLOR[r.level],
                          borderRadius: 4,
                          padding: "2px 7px",
                          fontSize: 11,
                          fontWeight: 600,
                        }}
                      >
                        {r.level}代理
                      </span>
                    </td>
                    <td style={{ padding: "9px 14px", color: "#4361ee", fontWeight: 700 }}>
                      ¥{r.month.toLocaleString()}
                    </td>
                    <td style={{ padding: "9px 14px", color: L.textSec }}>¥{r.total.toLocaleString()}</td>
                    <td style={{ padding: "9px 14px", color: L.muted }}>{r.team}人</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* TAB 2 – 佣金明细                                                  */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {activeTab === "detail" && (
        <div
          style={{
            background: L.surface,
            border: `1px solid ${L.border}`,
            borderRadius: 10,
            overflow: "hidden",
          }}
        >
          {/* Filters */}
          <div
            className="flex items-center gap-3 px-4 py-3"
            style={{ borderBottom: `1px solid ${L.border}`, background: L.bg }}
          >
            <div className="text-xs font-medium" style={{ color: L.muted }}>筛选：</div>
            {/* Level filter */}
            <div style={{ position: "relative" }}>
              <select
                value={detailFilter.level}
                onChange={e => setDetailFilter(f => ({ ...f, level: e.target.value }))}
                style={{
                  border: `1px solid ${L.border}`,
                  borderRadius: 6,
                  padding: "5px 28px 5px 10px",
                  fontSize: 12,
                  color: L.text,
                  background: L.surface,
                  cursor: "pointer",
                  appearance: "none",
                }}
              >
                {["全部", "一级", "二级", "三级"].map(o => (
                  <option key={o}>{o}</option>
                ))}
              </select>
              <ChevronDown size={12} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", color: L.muted, pointerEvents: "none" }} />
            </div>
            {/* Type filter */}
            <div style={{ position: "relative" }}>
              <select
                value={detailFilter.type}
                onChange={e => setDetailFilter(f => ({ ...f, type: e.target.value }))}
                style={{
                  border: `1px solid ${L.border}`,
                  borderRadius: 6,
                  padding: "5px 28px 5px 10px",
                  fontSize: 12,
                  color: L.text,
                  background: L.surface,
                  cursor: "pointer",
                  appearance: "none",
                }}
              >
                {["全部", "直销", "间接", "团队奖"].map(o => (
                  <option key={o}>{o}</option>
                ))}
              </select>
              <ChevronDown size={12} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", color: L.muted, pointerEvents: "none" }} />
            </div>
            <div className="text-xs" style={{ color: L.muted }}>共 {filteredDetail.length} 条记录</div>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: L.bg }}>
                {["时间", "代理人", "等级", "来源订单", "佣金类型", "金额", "状态"].map(h => (
                  <th
                    key={h}
                    style={{
                      padding: "8px 14px",
                      textAlign: "left",
                      color: L.muted,
                      fontWeight: 500,
                      borderBottom: `1px solid ${L.border}`,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredDetail.map((r, i) => (
                <tr
                  key={i}
                  style={{
                    borderBottom: `1px solid ${L.borderLight}`,
                    background: i % 2 === 0 ? L.surface : L.bg,
                  }}
                >
                  <td style={{ padding: "8px 14px", color: L.muted, whiteSpace: "nowrap" }}>{r.time}</td>
                  <td style={{ padding: "8px 14px", color: L.text, fontWeight: 500 }}>{r.agent}</td>
                  <td style={{ padding: "8px 14px" }}>
                    <span
                      style={{
                        background: (LEVEL_COLOR[r.level] ?? "#6b7280") + "18",
                        color: LEVEL_COLOR[r.level] ?? "#6b7280",
                        borderRadius: 4,
                        padding: "1px 6px",
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                    >
                      {r.level}
                    </span>
                  </td>
                  <td style={{ padding: "8px 14px", color: L.muted, fontFamily: "monospace", fontSize: 11 }}>{r.order}</td>
                  <td style={{ padding: "8px 14px" }}><Badge label={r.type} /></td>
                  <td style={{ padding: "8px 14px", color: "#4361ee", fontWeight: 700 }}>¥{r.amount}</td>
                  <td style={{ padding: "8px 14px" }}><Badge label={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* TAB 3 – 结算记录                                                  */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {activeTab === "settlement" && (
        <>
          {/* Calendar overview – month chips */}
          <div
            style={{
              background: L.surface,
              border: `1px solid ${L.border}`,
              borderRadius: 10,
              padding: 16,
            }}
          >
            <div className="font-semibold text-sm mb-3" style={{ color: L.text }}>结算月历</div>
            <div className="flex gap-2 flex-wrap">
              {SETTLEMENT_RECORDS.map(r => {
                const c = STATUS_COLORS[r.status] ?? { bg: "rgba(100,116,139,0.15)", color: "#94a3b8" };
                return (
                  <div
                    key={r.period}
                    style={{
                      background: c.bg,
                      border: `1px solid ${c.color}44`,
                      borderRadius: 8,
                      padding: "8px 14px",
                      textAlign: "center",
                      minWidth: 90,
                    }}
                  >
                    <div className="font-semibold text-xs" style={{ color: c.color }}>{r.period}</div>
                    <div className="text-xs mt-0.5" style={{ color: c.color }}>{r.status}</div>
                    <div className="text-xs mt-1 font-bold" style={{ color: L.text }}>¥{r.total.toLocaleString()}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Records table */}
          <div
            style={{
              background: L.surface,
              border: `1px solid ${L.border}`,
              borderRadius: 10,
              overflow: "hidden",
            }}
          >
            <div className="px-4 py-3" style={{ borderBottom: `1px solid ${L.border}` }}>
              <span className="font-semibold text-sm" style={{ color: L.text }}>结算记录明细</span>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: L.bg }}>
                  {["结算周期", "代理人数", "总金额", "状态", "操作时间"].map(h => (
                    <th
                      key={h}
                      style={{
                        padding: "8px 16px",
                        textAlign: "left",
                        color: L.muted,
                        fontWeight: 500,
                        borderBottom: `1px solid ${L.border}`,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SETTLEMENT_RECORDS.map((r, i) => (
                  <tr
                    key={r.period}
                    style={{
                      borderBottom: `1px solid ${L.borderLight}`,
                      background: i % 2 === 0 ? L.surface : L.bg,
                    }}
                  >
                    <td style={{ padding: "9px 16px", color: L.text, fontWeight: 500 }}>{r.period}</td>
                    <td style={{ padding: "9px 16px", color: L.textSec }}>{r.agents}人</td>
                    <td style={{ padding: "9px 16px", color: "#4361ee", fontWeight: 700 }}>¥{r.total.toLocaleString()}</td>
                    <td style={{ padding: "9px 16px" }}><Badge label={r.status} /></td>
                    <td style={{ padding: "9px 16px", color: L.muted }}>{r.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Settlement bar chart */}
          <div
            style={{
              background: L.surface,
              border: `1px solid ${L.border}`,
              borderRadius: 10,
              padding: 16,
            }}
          >
            <div className="font-semibold text-sm mb-3" style={{ color: L.text }}>结算金额趋势</div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={MONTHLY_TREND} barSize={32}>
                <CartesianGrid strokeDasharray="3 3" stroke={L.borderLight} vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: L.muted }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: L.muted }} axisLine={false} tickLine={false} width={40}
                  tickFormatter={v => `¥${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: `1px solid ${L.border}`, fontSize: 12 }}
                  formatter={(v: number) => [`¥${v.toLocaleString()}`, "结算金额"]}
                />
                <Bar dataKey="total" fill="#4361ee" radius={[4, 4, 0, 0]} opacity={0.85} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* TAB 4 – 提现管理                                                  */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {activeTab === "withdrawal" && (
        <div
          style={{
            background: L.surface,
            border: `1px solid ${L.border}`,
            borderRadius: 10,
            overflow: "hidden",
          }}
        >
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: `1px solid ${L.border}` }}
          >
            <span className="font-semibold text-sm" style={{ color: L.text }}>提现申请列表</span>
            <div className="flex gap-2 text-xs" style={{ color: L.muted }}>
              <span>待审核：{withdrawals.filter(r => r.status === "待审核").length}笔</span>
              <span>·</span>
              <span>合计：¥{withdrawals.filter(r => r.status === "待审核").reduce((s, r) => s + r.amount, 0).toLocaleString()}</span>
            </div>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: L.bg }}>
                {["申请人", "金额", "收款方式", "申请时间", "状态", "操作"].map(h => (
                  <th
                    key={h}
                    style={{
                      padding: "8px 16px",
                      textAlign: "left",
                      color: L.muted,
                      fontWeight: 500,
                      borderBottom: `1px solid ${L.border}`,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {withdrawals.map((r, i) => (
                <tr
                  key={r.id}
                  style={{
                    borderBottom: `1px solid ${L.borderLight}`,
                    background: i % 2 === 0 ? L.surface : L.bg,
                  }}
                >
                  <td style={{ padding: "9px 16px", color: L.text, fontWeight: 500 }}>{r.name}</td>
                  <td style={{ padding: "9px 16px", color: "#4361ee", fontWeight: 700 }}>¥{r.amount.toLocaleString()}</td>
                  <td style={{ padding: "9px 16px", color: L.muted }}>{r.method}</td>
                  <td style={{ padding: "9px 16px", color: L.muted, whiteSpace: "nowrap" }}>{r.time}</td>
                  <td style={{ padding: "9px 16px" }}><Badge label={r.status} /></td>
                  <td style={{ padding: "9px 16px" }}>
                    {r.status === "待审核" ? (
                      <div className="flex gap-1">
                        <button
                          onClick={() => approveWithdrawal(r.id)}
                          style={{
                            padding: "3px 10px",
                            borderRadius: 5,
                            border: "none",
                            background: "rgba(16,185,129,0.15)",
                            color: "#34d399",
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          通过
                        </button>
                        <button
                          onClick={() => rejectWithdrawal(r.id)}
                          style={{
                            padding: "3px 10px",
                            borderRadius: 5,
                            border: "none",
                            background: "rgba(239,68,68,0.15)",
                            color: "#f87171",
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          拒绝
                        </button>
                      </div>
                    ) : (
                      <span style={{ color: L.mutedLight, fontSize: 11 }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
