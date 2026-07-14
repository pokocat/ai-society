import { useMemo, useState } from "react";
import {
  ArrowDownToLine, ArrowLeft, ArrowUpRight, Banknote, BarChart3, Bell,
  Building2, CalendarDays, Check, ChevronDown, ChevronRight, CircleDollarSign,
  Copy, CreditCard, Eye, EyeOff, HelpCircle, Home, Landmark, Link2,
  MessageCircle, PieChart as PieChartIcon, QrCode, Search, ShieldCheck,
  TrendingUp, UserRound, Users2, WalletCards, X,
} from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { useProject } from "../contexts/ProjectContext";

const J = {
  bg: "#f7f8fc", surface: "#ffffff", surface2: "#f2f5fa", surface3: "#e4e9f2",
  border: "rgba(30,41,59,0.10)", text: "#1f2937", text2: "#475569", muted: "#94a3b8",
  primary: "#5865f2", violet: "#7c3aed", cyan: "#0891b2", green: "#059669", amber: "#d97706", red: "#e11d48",
};

type FinanceTab = "home" | "earnings" | "influence" | "audience" | "profile";
type ReportPeriod = "日报" | "月报" | "年报" | "总报";

const audienceRows = [
  { id: 1, name: "林小满", source: "扫描会员项目推广码", relation: "直属", level: "尊享官", downline: 128, time: "今天 16:14", avatar: "/reference-assets/member-lin.png" },
  { id: 2, name: "邱水婷", source: "体验营活动链接", relation: "间接", level: "体验官", downline: 76, time: "今天 15:42", avatar: "/reference-assets/member-qiu.png" },
  { id: 3, name: "赵一川", source: "城市合伙人邀请码", relation: "直属", level: "运营商", downline: 246, time: "今天 14:08", avatar: "/reference-assets/member-zhao.png" },
  { id: 4, name: "陈思雨", source: "品牌直播间关注", relation: "其他", level: "游客", downline: 12, time: "昨天 20:31", avatar: "/reference-assets/member-qiu.png" },
];

const revenueData = [
  { name: "运营商奖励", value: 18640, color: "#5865f2" },
  { name: "升级体验官", value: 9280, color: "#22d3ee" },
  { name: "升级 VIP5", value: 6160, color: "#7c3aed" },
  { name: "消费收益", value: 2870, color: "#f472b6" },
];

function Pill({ children, color = J.primary }: { children: React.ReactNode; color?: string }) {
  return <span className="px-2 py-0.5 rounded-full whitespace-nowrap" style={{ color, background: `${color}18`, border: `1px solid ${color}28`, fontSize: 9 }}>{children}</span>;
}

function ProjectPicker({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { projects, currentProjectId, setCurrentProjectId } = useProject();
  if (!open) return null;
  return (
    <div className="absolute inset-0 z-50 flex items-end" style={{ background: "rgba(3,7,18,0.74)" }} onClick={onClose}>
      <div className="w-full rounded-t-3xl p-5" style={{ background: J.surface }} onClick={event => event.stopPropagation()}>
        <div className="flex items-center justify-between"><div className="font-semibold" style={{ color: J.text, fontSize: 15 }}>选择项目数据</div><button onClick={onClose} title="关闭"><X size={18} style={{ color: J.muted }} /></button></div>
        <p className="mt-1" style={{ color: J.muted, fontSize: 10 }}>收益和影响力按所选项目范围计算</p>
        <div className="mt-4 space-y-2">
          <button onClick={onClose} className="w-full flex items-center gap-3 p-3 rounded-xl text-left" style={{ background: J.surface2, border: `1px solid ${J.primary}55` }}><span className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${J.primary}20`, color: J.primary }}><Link2 size={17} /></span><span className="flex-1"><span className="block font-medium" style={{ color: J.text, fontSize: 12 }}>全部已接入项目</span><span className="block mt-0.5" style={{ color: J.muted, fontSize: 9 }}>{projects.length} 个项目 · 跨项目合并</span></span><Check size={15} style={{ color: J.primary }} /></button>
          {projects.map(project => <button key={project.id} onClick={() => { setCurrentProjectId(project.id); onClose(); }} className="w-full flex items-center gap-3 p-3 rounded-xl text-left" style={{ background: J.surface2, border: `1px solid ${currentProjectId === project.id ? `${project.accent}50` : J.border}` }}><span className="w-9 h-9 rounded-xl flex items-center justify-center font-semibold" style={{ background: `${project.accent}18`, color: project.accent, fontSize: 9 }}>{project.code.split("-").pop()}</span><span className="flex-1"><span className="block font-medium" style={{ color: J.text, fontSize: 12 }}>{project.name}</span><span className="block mt-0.5" style={{ color: J.muted, fontSize: 9 }}>{project.users.toLocaleString()} 成员 · {project.groups} 个群</span></span>{currentProjectId === project.id && <Check size={15} style={{ color: project.accent }} />}</button>)}
        </div>
      </div>
    </div>
  );
}

function FinanceHeader({ title, onProjects, compact = false }: { title: string; onProjects?: () => void; compact?: boolean }) {
  const { currentProject } = useProject();
  return (
    <div className={compact ? "px-5 pt-11 pb-3" : "px-5 pt-11 pb-4"} style={{ background: J.bg }}>
      <div className="flex items-center justify-between">
        <div><div className="font-semibold" style={{ color: J.text, fontSize: compact ? 17 : 19 }}>{title}</div><button onClick={onProjects} className="mt-1 flex items-center gap-1" style={{ color: J.cyan, fontSize: 10 }}><span className="w-1.5 h-1.5 rounded-full" style={{ background: currentProject.accent }} />{currentProject.shortName}<ChevronDown size={10} /></button></div>
        <button className="relative w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: J.surface2 }}><Bell size={17} style={{ color: J.text2 }} /><span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center" style={{ color: "white", background: J.red, fontSize: 8 }}>4</span></button>
      </div>
    </div>
  );
}

function FinanceHome({ onNavigate, onProjects }: { onNavigate: (tab: FinanceTab) => void; onProjects: () => void }) {
  const { projects } = useProject();
  return (
    <div className="h-full overflow-auto" style={{ background: J.bg, scrollbarWidth: "none" }}>
      <FinanceHeader title="金服经营中心" onProjects={onProjects} />
      <div className="px-5 pb-8">
        <section className="rounded-2xl p-4 relative overflow-hidden" style={{ background: "linear-gradient(135deg, #273c8f 0%, #5865f2 55%, #7c3aed 100%)" }}>
          <div className="flex items-start justify-between"><div><div style={{ color: "rgba(255,255,255,0.7)", fontSize: 10 }}>累计预估收益</div><div className="font-semibold mt-1" style={{ color: "white", fontSize: 30 }}>¥36,950.00</div></div><Pill color="#ffffff">跨项目合并</Pill></div>
          <div className="grid grid-cols-3 gap-2 mt-4">
            {[["可提现", "¥8,425.64"], ["待结算", "¥2,380.00"], ["今日到账", "¥1,231.20"]].map(([label, value]) => <div key={label} className="p-2.5 rounded-xl" style={{ background: "rgba(5,10,30,0.22)" }}><div style={{ color: "rgba(255,255,255,0.62)", fontSize: 8 }}>{label}</div><div className="mt-1 font-semibold" style={{ color: "white", fontSize: 11 }}>{value}</div></div>)}
          </div>
          <button onClick={() => onNavigate("earnings")} className="mt-3 w-full py-2.5 rounded-xl flex items-center justify-center gap-1.5" style={{ background: "white", color: J.primary, fontSize: 11, fontWeight: 600 }}><ArrowDownToLine size={14} />查看收益与提现</button>
        </section>

        <div className="grid grid-cols-4 gap-2 mt-3">
          {[
            ["收益报表", BarChart3, J.primary, "earnings"], ["我的影响力", TrendingUp, J.cyan, "influence"],
            ["裂变人群", Users2, J.green, "audience"], ["推广二维码", QrCode, J.amber, "audience"],
          ].map(([label, Icon, color, tab]) => { const I = Icon as typeof BarChart3; return <button key={label as string} onClick={() => onNavigate(tab as FinanceTab)} className="py-3 rounded-xl flex flex-col items-center gap-2" style={{ background: J.surface }}><span className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${color}18` }}><I size={15} style={{ color: color as string }} /></span><span style={{ color: J.text2, fontSize: 9 }}>{label as string}</span></button>; })}
        </div>

        <section className="mt-4">
          <div className="flex items-center justify-between"><h2 className="font-semibold" style={{ color: J.text, fontSize: 13 }}>今日经营数据</h2><span style={{ color: J.muted, fontSize: 9 }}>更新于 10:32</span></div>
          <div className="grid grid-cols-3 gap-2 mt-2">
            {[["新增扫码", "38", "+12"], ["新增关注", "24", "+8"], ["新增体验", "16", "+5"], ["新增 VIP", "8", "+3"], ["新增 VIP5", "3", "+1"], ["新增运营商", "2", "+1"]].map(([label, value, delta]) => <button key={label} onClick={() => onNavigate("audience")} className="p-3 rounded-xl text-left" style={{ background: J.surface, border: `1px solid ${J.border}` }}><div style={{ color: J.muted, fontSize: 8 }}>{label}</div><div className="mt-1 flex items-end gap-1"><span className="font-semibold" style={{ color: J.text, fontSize: 17 }}>{value}</span><span style={{ color: J.green, fontSize: 8 }}>{delta}</span></div></button>)}
          </div>
        </section>

        <section className="mt-4">
          <div className="flex items-center justify-between"><h2 className="font-semibold" style={{ color: J.text, fontSize: 13 }}>项目贡献</h2><button onClick={onProjects} style={{ color: J.primary, fontSize: 9 }}>切换范围</button></div>
          <div className="mt-2 space-y-2">
            {projects.slice(0, 3).map((project, index) => {
              const values = ["¥16,842", "¥11,680", "¥8,428"];
              const widths = [84, 66, 48];
              return <div key={project.id} className="p-3 rounded-xl" style={{ background: J.surface }}><div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{ background: project.accent }} /><span className="flex-1" style={{ color: J.text2, fontSize: 10 }}>{project.name}</span><span className="font-semibold" style={{ color: J.text, fontSize: 11 }}>{values[index]}</span></div><div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: J.surface3 }}><div className="h-full rounded-full" style={{ width: `${widths[index]}%`, background: project.accent }} /></div></div>;
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

function WithdrawalSheet({ onClose }: { onClose: () => void }) {
  const [method, setMethod] = useState<"支付宝" | "银行卡">("支付宝");
  const [amount, setAmount] = useState("");
  const [account, setAccount] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const numeric = Number(amount);
  const error = amount && (!Number.isInteger(numeric) || numeric < 100 || numeric > 8425.64) ? "仅支持 100 元以上整数提现，且不能超过可提现余额" : "";
  const valid = !error && numeric >= 100 && account.trim().length > 4;
  return (
    <div className="absolute inset-0 z-50 flex items-end" style={{ background: "rgba(3,7,18,0.82)" }}>
      <div className="w-full rounded-t-3xl p-5" style={{ background: J.surface }}>
        <div className="flex items-center justify-between"><div className="font-semibold" style={{ color: J.text, fontSize: 15 }}>申请提现</div><button onClick={onClose} title="关闭"><X size={18} style={{ color: J.muted }} /></button></div>
        {submitted ? <div className="py-10 text-center"><span className="w-14 h-14 mx-auto rounded-full flex items-center justify-center" style={{ background: `${J.green}18` }}><Check size={28} style={{ color: J.green }} /></span><div className="mt-4 font-semibold" style={{ color: J.text, fontSize: 16 }}>提现申请已提交</div><p className="mt-2" style={{ color: J.muted, fontSize: 10 }}>预计 1–2 个工作日到账，可在消息中心查看进度</p><button onClick={onClose} className="mt-5 w-full py-3 rounded-xl" style={{ color: "white", background: J.primary, fontSize: 11 }}>完成</button></div> : <>
          <div className="grid grid-cols-2 gap-2 mt-4">{(["支付宝", "银行卡"] as const).map(item => <button key={item} onClick={() => setMethod(item)} className="py-3 rounded-xl flex items-center justify-center gap-2" style={{ color: method === item ? J.text : J.muted, background: method === item ? `${J.primary}18` : J.surface2, border: `1px solid ${method === item ? `${J.primary}60` : J.border}`, fontSize: 11 }}>{item === "支付宝" ? <WalletCards size={15} /> : <CreditCard size={15} />}{item}</button>)}</div>
          <label className="block mt-4"><span style={{ color: J.text2, fontSize: 10 }}>{method}账户</span><input value={account} onChange={event => setAccount(event.target.value)} className="mt-1.5 w-full px-3 py-3 rounded-xl outline-none" style={{ color: J.text, background: J.surface2, border: `1px solid ${J.border}`, fontSize: 11 }} placeholder={method === "支付宝" ? "请输入已实名支付宝账户" : "请输入银行卡号"} /></label>
          <label className="block mt-3"><span style={{ color: J.text2, fontSize: 10 }}>提现金额</span><div className="mt-1.5 flex items-center px-3 rounded-xl" style={{ background: J.surface2, border: `1px solid ${error ? `${J.red}80` : J.border}` }}><span className="font-semibold" style={{ color: J.text, fontSize: 22 }}>¥</span><input type="number" value={amount} onChange={event => setAmount(event.target.value)} className="flex-1 min-w-0 px-2 py-3 bg-transparent outline-none" style={{ color: J.text, fontSize: 18 }} placeholder="0" /><button onClick={() => setAmount("8425")} style={{ color: J.primary, fontSize: 10 }}>全部</button></div></label>
          <div className="mt-2 min-h-4" style={{ color: error ? J.red : J.muted, fontSize: 9 }}>{error || "可提现 ¥8,425.64 · 提交后进入 PC 审批中心"}</div>
          <button disabled={!valid} onClick={() => setSubmitted(true)} className="mt-3 w-full py-3 rounded-xl disabled:opacity-40" style={{ color: "white", background: J.primary, fontSize: 11 }}>确认提现</button>
        </>}
      </div>
    </div>
  );
}

function Earnings({ onProjects }: { onProjects: () => void }) {
  const [period, setPeriod] = useState<ReportPeriod>("日报");
  const [showWithdraw, setShowWithdraw] = useState(false);
  const totals: Record<ReportPeriod, string> = { 日报: "34,467.56", 月报: "128,680.40", 年报: "892,450.80", 总报: "1,386,920.00" };
  return (
    <div className="h-full overflow-auto" style={{ background: J.bg, scrollbarWidth: "none" }}>
      <FinanceHeader title="收益中心" onProjects={onProjects} compact />
      <div className="px-5 pb-8">
        <section className="rounded-2xl p-4" style={{ background: "linear-gradient(135deg, #263777, #5865f2)" }}><div className="flex items-start justify-between"><div><div style={{ color: "rgba(255,255,255,0.65)", fontSize: 9 }}>总收益</div><div className="mt-1 font-semibold" style={{ color: "white", fontSize: 27 }}>¥36,950.00</div><div className="mt-1" style={{ color: "rgba(255,255,255,0.65)", fontSize: 9 }}>可提现 ¥8,425.64</div></div><button onClick={() => setShowWithdraw(true)} className="px-4 py-2 rounded-full" style={{ color: J.primary, background: "white", fontSize: 10, fontWeight: 600 }}>提现</button></div></section>
        <div className="grid grid-cols-4 gap-1 p-1 rounded-xl mt-3" style={{ background: J.surface }}>{(["日报", "月报", "年报", "总报"] as ReportPeriod[]).map(item => <button key={item} onClick={() => setPeriod(item)} className="py-2 rounded-lg" style={{ color: period === item ? "white" : J.muted, background: period === item ? J.primary : "transparent", fontSize: 10 }}>{item}</button>)}</div>
        <div className="mt-3 px-3 py-2.5 rounded-xl flex items-center justify-between" style={{ background: J.surface }}><span style={{ color: J.text2, fontSize: 10 }}>{period === "日报" ? "2026 年 7 月 12 日" : period === "月报" ? "2026 年 7 月" : period === "年报" ? "2026 年" : "全部时间"}</span><CalendarDays size={14} style={{ color: J.primary }} /></div>
        <section className="mt-3 rounded-2xl p-4 text-center" style={{ background: J.surface }}><div style={{ color: J.muted, fontSize: 9 }}>{period}预估收益</div><div className="mt-1 font-semibold" style={{ color: J.text, fontSize: 25 }}>¥{totals[period]}</div><div className="mt-1" style={{ color: J.green, fontSize: 9 }}>124 笔订单 · 较上期 +18.6%</div><div className="grid grid-cols-3 gap-2 mt-4">{[["直营店", "¥399.50"], ["分销店", "¥328.50"], ["运营商", "¥1,328.50"]].map(([label, value]) => <div key={label}><div style={{ color: J.muted, fontSize: 8 }}>{label}</div><div className="mt-1" style={{ color: J.text2, fontSize: 10 }}>{value}</div></div>)}</div></section>
        <section className="mt-3 rounded-2xl p-4" style={{ background: J.surface }}><div className="flex items-center justify-between"><h2 className="font-semibold" style={{ color: J.text, fontSize: 12 }}>预估收益分析</h2><Pill color={J.green}>结算正常</Pill></div><div className="grid grid-cols-3 gap-2 mt-3">{[["今日到账", "¥1,231.20", J.green], ["待结算", "¥2,380.00", J.amber], ["冻结金额", "¥320.00", J.red]].map(([label, value, color]) => <div key={label as string} className="p-2 rounded-xl" style={{ background: J.surface2 }}><div style={{ color: J.muted, fontSize: 8 }}>{label as string}</div><div className="mt-1 font-semibold" style={{ color: color as string, fontSize: 10 }}>{value as string}</div></div>)}</div></section>
        <section className="mt-3 rounded-2xl overflow-hidden" style={{ background: J.surface }}><div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: `1px solid ${J.border}` }}><h2 className="font-semibold" style={{ color: J.text, fontSize: 12 }}>收益类别</h2><span style={{ color: J.muted, fontSize: 8 }}>订单 / 预估收益</span></div>{[["128 升级", "106 单", "¥4,800"], ["598 升级", "43 单", "¥13,720"], ["每日领取", "80 单", "¥4,000"], ["其他消费", "32 单", "¥1,920"]].map(row => <button key={row[0]} className="w-full px-4 py-3 flex items-center text-left" style={{ borderBottom: `1px solid ${J.border}` }}><span className="flex-1" style={{ color: J.text2, fontSize: 10 }}>{row[0]}</span><span style={{ color: J.muted, fontSize: 9 }}>{row[1]}</span><span className="w-20 text-right" style={{ color: J.green, fontSize: 10 }}>{row[2]}</span><ChevronRight size={13} style={{ color: J.muted }} /></button>)}</section>
      </div>
      {showWithdraw && <WithdrawalSheet onClose={() => setShowWithdraw(false)} />}
    </div>
  );
}

function Influence({ onProjects }: { onProjects: () => void }) {
  const [showValues, setShowValues] = useState(true);
  return (
    <div className="h-full overflow-auto" style={{ background: J.bg, scrollbarWidth: "none" }}>
      <FinanceHeader title="我的影响力" onProjects={onProjects} compact />
      <div className="px-5 pb-8">
        <section className="grid grid-cols-2 gap-2"><div className="p-4 rounded-2xl" style={{ background: J.surface }}><div style={{ color: J.muted, fontSize: 9 }}>我的影响力</div><div className="mt-1 font-semibold" style={{ color: J.text, fontSize: 24 }}>890 <span style={{ fontSize: 10 }}>人</span></div><div className="mt-1" style={{ color: J.green, fontSize: 9 }}>本周新增 28</div></div><div className="p-4 rounded-2xl" style={{ background: J.surface }}><div className="flex items-center justify-between"><span style={{ color: J.muted, fontSize: 9 }}>预计收入</span><button onClick={() => setShowValues(value => !value)} title={showValues ? "隐藏金额" : "显示金额"}>{showValues ? <Eye size={13} style={{ color: J.muted }} /> : <EyeOff size={13} style={{ color: J.muted }} />}</button></div><div className="mt-1 font-semibold" style={{ color: J.text, fontSize: 24 }}>{showValues ? "¥50,000" : "¥••••"}</div><div className="mt-1" style={{ color: J.cyan, fontSize: 9 }}>跨项目预估</div></div></section>
        <section className="mt-3 rounded-2xl p-4" style={{ background: J.surface }}><div className="flex items-center gap-2"><PieChartIcon size={14} style={{ color: J.primary }} /><h2 className="font-semibold" style={{ color: J.text, fontSize: 12 }}>预计收入构成</h2></div><div className="h-44 mt-2"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={revenueData} dataKey="value" nameKey="name" innerRadius={44} outerRadius={68} paddingAngle={2}>{revenueData.map(item => <Cell key={item.name} fill={item.color} />)}</Pie><Tooltip contentStyle={{ background: J.surface2, border: `1px solid ${J.border}`, borderRadius: 8, fontSize: 10 }} /></PieChart></ResponsiveContainer></div><div className="grid grid-cols-2 gap-2">{revenueData.map(item => <div key={item.name} className="flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{ background: item.color }} /><span className="flex-1" style={{ color: J.text2, fontSize: 9 }}>{item.name}</span><span style={{ color: J.text, fontSize: 9 }}>¥{item.value.toLocaleString()}</span></div>)}</div></section>
        <section className="mt-3 rounded-2xl p-4" style={{ background: J.surface }}><h2 className="font-semibold" style={{ color: J.text, fontSize: 12 }}>影响力详情</h2><div className="mt-3 grid grid-cols-[1fr_56px_56px_56px]" style={{ fontSize: 9 }}><span style={{ color: J.muted }}>关系层级</span><span style={{ color: J.primary }}>尊享官</span><span style={{ color: J.cyan }}>体验官</span><span style={{ color: J.muted }}>游客</span>{[["我的好友", "76", "76", "76"], ["好友的好友", "38", "38", "38"], ["其他好友", "0", "56", "56"]].flatMap((row, rowIndex) => row.map((cell, index) => <span key={`${rowIndex}-${index}`} className="py-3" style={{ color: index === 0 ? J.text2 : J.text, borderTop: `1px solid ${J.border}` }}>{cell}{index > 0 ? "人" : ""}</span>))}</div></section>
        <section className="mt-3 rounded-2xl p-4" style={{ background: J.surface }}><h2 className="font-semibold" style={{ color: J.text, fontSize: 12 }}>旗下运营商</h2><div className="grid grid-cols-3 gap-2 mt-3">{[["直属", "76"], ["推荐", "42"], ["其他", "18"]].map(([label, value]) => <button key={label} className="p-3 rounded-xl" style={{ background: J.surface2 }}><div className="font-semibold" style={{ color: J.text, fontSize: 16 }}>{value}</div><div className="mt-1" style={{ color: J.muted, fontSize: 8 }}>{label}运营商</div></button>)}</div></section>
      </div>
    </div>
  );
}

function Audience({ onProjects }: { onProjects: () => void }) {
  const [level, setLevel] = useState("全部");
  const [relation, setRelation] = useState("全部");
  const [search, setSearch] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);
  const filtered = useMemo(() => audienceRows.filter(row => (level === "全部" || row.level === level) && (relation === "全部" || row.relation === relation) && row.name.includes(search)), [level, relation, search]);
  const copyName = (name: string) => { setCopied(name); window.setTimeout(() => setCopied(null), 1200); };
  return (
    <div className="h-full overflow-auto" style={{ background: J.bg, scrollbarWidth: "none" }}>
      <FinanceHeader title="裂变人群" onProjects={onProjects} compact />
      <div className="px-5 pb-8">
        <button onClick={() => setShowQr(true)} className="w-full p-3 rounded-2xl flex items-center gap-3 text-left" style={{ background: "linear-gradient(135deg, #263777, #5865f2)" }}><span className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.14)" }}><QrCode size={22} style={{ color: "white" }} /></span><span className="flex-1"><span className="block font-semibold" style={{ color: "white", fontSize: 12 }}>我的跨项目推广码</span><span className="block mt-1" style={{ color: "rgba(255,255,255,0.62)", fontSize: 9 }}>扫码关系自动写入统一成员档案</span></span><ChevronRight size={16} style={{ color: "white" }} /></button>
        <div className="mt-3 flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ background: J.surface }}><Search size={14} style={{ color: J.muted }} /><input value={search} onChange={event => setSearch(event.target.value)} className="flex-1 min-w-0 bg-transparent outline-none" style={{ color: J.text, fontSize: 10 }} placeholder="搜索微信名" />{search && <button onClick={() => setSearch("")}><X size={12} style={{ color: J.muted }} /></button>}</div>
        <div className="mt-2 flex gap-1 overflow-x-auto" style={{ scrollbarWidth: "none" }}>{["全部", "游客", "体验官", "尊享官", "运营商"].map(item => <button key={item} onClick={() => setLevel(item)} className="px-3 py-1.5 rounded-lg whitespace-nowrap" style={{ color: level === item ? "white" : J.muted, background: level === item ? J.primary : J.surface, fontSize: 9 }}>{item}</button>)}</div>
        <div className="mt-2 grid grid-cols-4 gap-1 p-1 rounded-xl" style={{ background: J.surface }}>{["全部", "直属", "间接", "其他"].map(item => <button key={item} onClick={() => setRelation(item)} className="py-1.5 rounded-lg" style={{ color: relation === item ? J.text : J.muted, background: relation === item ? J.surface2 : "transparent", fontSize: 9 }}>{item}</button>)}</div>
        <div className="mt-3 space-y-2">{filtered.map(row => <button key={row.id} className="w-full p-3 rounded-2xl flex items-center gap-3 text-left" style={{ background: J.surface, border: `1px solid ${J.border}` }}><img src={row.avatar} alt={`${row.name}头像`} className="w-11 h-11 rounded-xl object-cover" style={{ background: J.surface2 }} /><span className="min-w-0 flex-1"><span className="flex items-center gap-2"><span className="font-medium" style={{ color: J.text, fontSize: 11 }}>{row.name}</span><Pill color={row.level === "运营商" ? J.amber : row.level === "尊享官" ? J.violet : row.level === "体验官" ? J.cyan : J.muted}>{row.level}</Pill></span><span className="block mt-1 truncate" style={{ color: J.text2, fontSize: 9 }}>{row.source}</span><span className="block mt-1" style={{ color: J.muted, fontSize: 8 }}>{row.relation} · 下级 {row.downline} 人 · {row.time}</span></span><span onClick={event => { event.stopPropagation(); copyName(row.name); }} className="px-2 py-1 rounded-lg" style={{ color: copied === row.name ? J.green : J.primary, background: J.surface2, fontSize: 8 }}>{copied === row.name ? "已复制" : "复制"}</span><ChevronRight size={14} style={{ color: J.muted }} /></button>)}{filtered.length === 0 && <div className="py-12 text-center" style={{ color: J.muted, fontSize: 10 }}>暂无匹配成员</div>}</div>
      </div>
      {showQr && <div className="absolute inset-0 z-50 flex items-center justify-center p-6" style={{ background: "rgba(3,7,18,0.86)" }} onClick={() => setShowQr(false)}><div className="w-full p-5 rounded-3xl text-center" style={{ background: J.surface }} onClick={event => event.stopPropagation()}><div className="font-semibold" style={{ color: J.text, fontSize: 14 }}>跨项目推广二维码</div><p className="mt-1" style={{ color: J.muted, fontSize: 9 }}>当前归属：金服经营中心 · 全部项目</p><div className="mt-4 p-3 rounded-2xl inline-block" style={{ background: "white" }}><img src="/reference-assets/wechat-qr.png" alt="跨项目推广二维码" className="w-48 h-48" /></div><p className="mt-3" style={{ color: J.text2, fontSize: 9 }}>二维码 7 天内有效，重新进入后自动更新</p><button onClick={() => setShowQr(false)} className="mt-4 w-full py-2.5 rounded-xl" style={{ color: "white", background: J.primary, fontSize: 10 }}>完成</button></div></div>}
    </div>
  );
}

function FinanceProfile({ onNavigate, onProjects }: { onNavigate: (tab: FinanceTab) => void; onProjects: () => void }) {
  return (
    <div className="h-full overflow-auto" style={{ background: J.bg, scrollbarWidth: "none" }}>
      <FinanceHeader title="我的金服" onProjects={onProjects} compact />
      <div className="px-5 pb-8">
        <section className="p-4 rounded-2xl flex items-center gap-3" style={{ background: J.surface }}><img src="/reference-assets/member-zhao.png" alt="赵一川头像" className="w-14 h-14 rounded-2xl object-cover" style={{ background: J.surface2 }} /><div className="flex-1"><div className="flex items-center gap-2"><span className="font-semibold" style={{ color: J.text, fontSize: 14 }}>赵一川</span><Pill color={J.amber}>运营商</Pill></div><div className="mt-1" style={{ color: J.muted, fontSize: 9 }}>统一成员 ID U-100086 · 已实名</div><div className="mt-2 flex gap-1"><Pill color={J.violet}>黑金会员</Pill><Pill color={J.cyan}>城市合伙人</Pill></div></div></section>
        <section className="mt-3 rounded-2xl overflow-hidden" style={{ background: J.surface }}>{[
          ["收益账户", "可提现 ¥8,425.64", WalletCards, "earnings"], ["我的影响力", "890 人", TrendingUp, "influence"], ["我的人群", "直属 76 · 间接 38", Users2, "audience"], ["消息中心", "4 条未读", Bell, "profile"],
        ].map(([label, value, Icon, tab], index) => { const I = Icon as typeof WalletCards; return <button key={label as string} onClick={() => onNavigate(tab as FinanceTab)} className="w-full px-4 py-3.5 flex items-center gap-3 text-left" style={{ borderBottom: index < 3 ? `1px solid ${J.border}` : "none" }}><I size={16} style={{ color: J.primary }} /><span className="flex-1" style={{ color: J.text2, fontSize: 10 }}>{label as string}</span><span style={{ color: J.muted, fontSize: 9 }}>{value as string}</span><ChevronRight size={14} style={{ color: J.muted }} /></button>; })}</section>
        <section className="mt-3 rounded-2xl overflow-hidden" style={{ background: J.surface }}><div className="px-4 py-3" style={{ color: J.text, fontSize: 11, fontWeight: 600, borderBottom: `1px solid ${J.border}` }}>收款账户</div><div className="p-4 flex items-center gap-3"><span className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${J.primary}18` }}><WalletCards size={18} style={{ color: J.primary }} /></span><span className="flex-1"><span className="block" style={{ color: J.text2, fontSize: 10 }}>支付宝</span><span className="block mt-1" style={{ color: J.muted, fontSize: 9 }}>zhao***@mail.com</span></span><Pill color={J.green}>已实名</Pill></div><div className="p-4 flex items-center gap-3" style={{ borderTop: `1px solid ${J.border}` }}><span className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${J.cyan}18` }}><Landmark size={18} style={{ color: J.cyan }} /></span><span className="flex-1"><span className="block" style={{ color: J.text2, fontSize: 10 }}>招商银行</span><span className="block mt-1" style={{ color: J.muted, fontSize: 9 }}>尾号 6789</span></span><Pill color={J.green}>已验证</Pill></div></section>
        <section className="mt-3 rounded-2xl overflow-hidden" style={{ background: J.surface }}>{[["资金安全", "提现需实名认证", ShieldCheck], ["联系客服", "工作日 09:00–18:00", MessageCircle], ["帮助中心", "收益与结算规则", HelpCircle]].map(([label, value, Icon], index) => { const I = Icon as typeof ShieldCheck; return <button key={label as string} className="w-full px-4 py-3.5 flex items-center gap-3 text-left" style={{ borderBottom: index < 2 ? `1px solid ${J.border}` : "none" }}><I size={16} style={{ color: J.muted }} /><span className="flex-1" style={{ color: J.text2, fontSize: 10 }}>{label as string}</span><span style={{ color: J.muted, fontSize: 8 }}>{value as string}</span><ChevronRight size={14} style={{ color: J.muted }} /></button>; })}</section>
      </div>
    </div>
  );
}

const financeTabs = [
  { id: "home" as FinanceTab, label: "总览", icon: Home },
  { id: "earnings" as FinanceTab, label: "收益", icon: CircleDollarSign },
  { id: "influence" as FinanceTab, label: "影响力", icon: TrendingUp },
  { id: "audience" as FinanceTab, label: "人群", icon: Users2 },
  { id: "profile" as FinanceTab, label: "我的", icon: UserRound },
];

export default function JinfuMiniApp() {
  const [activeTab, setActiveTab] = useState<FinanceTab>("home");
  const [projectPicker, setProjectPicker] = useState(false);
  const renderTab = () => {
    if (activeTab === "home") return <FinanceHome onNavigate={setActiveTab} onProjects={() => setProjectPicker(true)} />;
    if (activeTab === "earnings") return <Earnings onProjects={() => setProjectPicker(true)} />;
    if (activeTab === "influence") return <Influence onProjects={() => setProjectPicker(true)} />;
    if (activeTab === "audience") return <Audience onProjects={() => setProjectPicker(true)} />;
    return <FinanceProfile onNavigate={setActiveTab} onProjects={() => setProjectPicker(true)} />;
  };
  return (
    <div className="flex items-center justify-center min-h-screen py-6 max-sm:py-0" style={{ background: "#e8ebf4" }}>
      <div data-testid="jinfu-phone" className="relative flex-shrink-0 rounded-[54px] border-[8px] border-[#282e46] max-sm:rounded-none max-sm:border-0" style={{ width: "min(393px, 100vw)", height: "min(852px, 100vh)", minHeight: 720, background: J.bg, boxShadow: "0 40px 80px rgba(15,23,42,0.22)", overflow: "hidden" }}>
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-28 h-8 rounded-full z-40 max-sm:hidden" style={{ background: "#000" }} />
        <div className="h-full flex flex-col" style={{ background: J.bg }}>
          <div className="flex-1 overflow-hidden">{renderTab()}</div>
          <div className="flex-shrink-0 pb-5 pt-1" style={{ background: "rgba(255,255,255,0.98)", borderTop: `1px solid ${J.border}`, boxShadow: "0 -8px 24px rgba(15,23,42,0.04)" }}>
            <div className="flex">{financeTabs.map(tab => { const active = tab.id === activeTab; return <button key={tab.id} onClick={() => setActiveTab(tab.id)} className="flex-1 flex flex-col items-center gap-0.5 py-1.5"><span className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: active ? `${J.primary}18` : "transparent" }}><tab.icon size={18} style={{ color: active ? J.primary : J.muted }} /></span><span style={{ color: active ? J.primary : J.muted, fontSize: 9, fontWeight: active ? 600 : 400 }}>{tab.label}</span></button>; })}</div>
          </div>
        </div>
        <ProjectPicker open={projectPicker} onClose={() => setProjectPicker(false)} />
      </div>
    </div>
  );
}
