import { useState } from "react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { TrendingUp, TrendingDown, Download, ArrowUp, ArrowDown } from "lucide-react";

const L = {
  bg: "#0d1629", surface: "#131f35", border: "rgba(255,255,255,0.07)", borderLight: "rgba(255,255,255,0.04)",
  primary: "#4361ee", primaryBg: "rgba(67,97,238,0.15)", text: "#e2e8f0", textSec: "#94a3b8",
  muted: "#64748b", mutedLight: "#475569", surface2: "#1a2640",
};

const COLORS = ["#4361ee", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

const revenueData = [
  { month: "1月", revenue: 28.4, users: 890 },
  { month: "2月", revenue: 31.2, users: 1020 },
  { month: "3月", revenue: 38.6, users: 1180 },
  { month: "4月", revenue: 42.1, users: 1290 },
  { month: "5月", revenue: 45.7, users: 1450 },
  { month: "6月", revenue: 49.3, users: 1540 },
  { month: "7月", revenue: 51.6, users: 1623 },
];

const channelPie = [
  { name: "微信私域", value: 42 },
  { name: "抖音引流", value: 28 },
  { name: "朋友圈广告", value: 15 },
  { name: "老带新", value: 10 },
  { name: "其他", value: 5 },
];

const dailyUserData = [
  { day: "7/1", new: 67, active: 890, churned: 12 },
  { day: "7/2", new: 45, active: 920, churned: 8 },
  { day: "7/3", new: 73, active: 960, churned: 15 },
  { day: "7/4", new: 89, active: 1010, churned: 11 },
  { day: "7/5", new: 94, active: 1050, churned: 9 },
  { day: "7/6", new: 58, active: 1080, churned: 13 },
  { day: "7/7", new: 82, active: 1120, churned: 7 },
];

const cityData = [
  { city: "北京", revenue: 16.2, users: 420, groups: 12, growth: 15.3, arpu: 3857 },
  { city: "上海", revenue: 13.8, users: 380, groups: 10, growth: 12.1, arpu: 3632 },
  { city: "深圳", revenue: 9.3, users: 310, groups: 8, growth: 18.7, arpu: 3000 },
  { city: "广州", revenue: 8.7, users: 290, groups: 7, growth: 9.4, arpu: 3000 },
  { city: "成都", revenue: 5.4, users: 180, groups: 5, growth: 22.6, arpu: 3000 },
  { city: "杭州", revenue: 4.2, users: 140, groups: 4, growth: 14.8, arpu: 3000 },
];

const projectData = [
  { month: "2月", pro: 18.2, experience: 6.4, agent: 4.1, city: 2.8 },
  { month: "3月", pro: 22.6, experience: 7.8, agent: 5.3, city: 3.2 },
  { month: "4月", pro: 26.1, experience: 8.2, agent: 5.8, city: 3.6 },
  { month: "5月", pro: 28.4, experience: 9.1, agent: 6.2, city: 4.0 },
  { month: "6月", pro: 30.8, experience: 9.7, agent: 6.8, city: 4.4 },
  { month: "7月", pro: 32.4, experience: 10.2, agent: 7.1, city: 4.8 },
];

const projectMetrics = [
  { name: "PRO会员", revenue: "¥32.4万", users: 1023, arpu: "¥3168", retention: "87.2%", growth: "+11.3%", color: "#4361ee", bg: "#eef2ff" },
  { name: "体验官", revenue: "¥10.2万", users: 387, arpu: "¥2635", retention: "72.4%", growth: "+8.6%", color: "#06b6d4", bg: "#ecfeff" },
  { name: "代理商", revenue: "¥7.1万", users: 134, arpu: "¥5299", retention: "91.3%", growth: "+14.7%", color: "#10b981", bg: "rgba(16,185,129,0.15)" },
  { name: "城市分站", revenue: "¥4.8万", users: 28, arpu: "¥17143", retention: "96.4%", growth: "+22.4%", color: "#f59e0b", bg: "rgba(245,158,11,0.15)" },
];

const channelFunnel = [
  { stage: "曝光", count: 48600, pct: 100 },
  { stage: "点击", count: 12340, pct: 25.4 },
  { stage: "加微信", count: 4820, pct: 9.9 },
  { stage: "入群", count: 2640, pct: 5.4 },
  { stage: "下单", count: 509, pct: 1.0 },
];

const channelDetail = [
  { name: "微信私域", users: 682, revenue: "¥21.7万", conv: "8.2%", arpu: "¥3182" },
  { name: "抖音引流", users: 454, revenue: "¥14.4万", conv: "3.1%", arpu: "¥3172" },
  { name: "朋友圈广告", users: 243, revenue: "¥7.7万", conv: "2.4%", arpu: "¥3169" },
  { name: "老带新", users: 162, revenue: "¥5.2万", conv: "12.6%", arpu: "¥3210" },
  { name: "其他", users: 82, revenue: "¥2.6万", conv: "1.8%", arpu: "¥3171" },
];

const DATE_RANGES = ["本月", "上月", "近3月", "近6月", "本年"];
const TABS = ["概览报表", "城市分析", "项目报表", "渠道来源"];

const Tip = ({ active, payload, label }: any) =>
  active && payload?.length ? (
    <div className="px-3 py-2 rounded-lg text-xs shadow-lg" style={{ background: "#1a2640", border: "1px solid rgba(255,255,255,0.1)", color: "#e2e8f0", borderRadius: 8 }}>
      <div className="font-medium mb-1">{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} style={{ color: p.color }}>{p.name}: {p.value}</div>
      ))}
    </div>
  ) : null;

function KpiCard({ label, value, delta, up }: { label: string; value: string; delta: string; up: boolean }) {
  return (
    <div className="rounded-xl p-5" style={{ background: L.surface, border: `1px solid ${L.border}` }}>
      <div className="text-xs mb-2" style={{ color: L.muted }}>{label}</div>
      <div className="text-2xl font-bold mb-2" style={{ color: L.text }}>{value}</div>
      <div className="flex items-center gap-1 text-xs font-medium" style={{ color: up ? "#059669" : "#dc2626" }}>
        {up ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
        {delta} 较上期
        {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
      </div>
    </div>
  );
}

function OverviewTab() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-5 gap-4">
        <KpiCard label="本月总营收" value="¥51.6万" delta="+13.2%" up={true} />
        <KpiCard label="新增用户" value="1,623" delta="+8.4%" up={true} />
        <KpiCard label="订单数" value="509" delta="+5.6%" up={true} />
        <KpiCard label="均客单价" value="¥1,014" delta="+7.1%" up={true} />
        <KpiCard label="退款率" value="3.1%" delta="-0.8%" up={false} />
      </div>

      <div className="grid grid-cols-2 gap-5">
        <div className="rounded-xl p-5" style={{ background: L.surface, border: `1px solid ${L.border}` }}>
          <div className="text-sm font-semibold mb-4" style={{ color: L.text }}>营收与用户趋势</div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={revenueData} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={L.borderLight} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: L.muted }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="left" tick={{ fontSize: 11, fill: L.muted }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: L.muted }} axisLine={false} tickLine={false} />
              <Tooltip content={<Tip />} />
              <Line yAxisId="left"  type="monotone" dataKey="revenue" name="营收(万)" stroke="#4361ee" strokeWidth={2.5} dot={false} />
              <Line yAxisId="right" type="monotone" dataKey="users"   name="用户数"  stroke="#10b981" strokeWidth={2} dot={false} strokeDasharray="4 3" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl p-5" style={{ background: L.surface, border: `1px solid ${L.border}` }}>
          <div className="text-sm font-semibold mb-4" style={{ color: L.text }}>渠道来源分布</div>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width={180} height={180}>
              <PieChart>
                <Pie data={channelPie} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                  {channelPie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: any) => `${v}%`} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2">
              {channelPie.map((item, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                    <span style={{ color: L.textSec }}>{item.name}</span>
                  </div>
                  <span className="font-semibold" style={{ color: L.text }}>{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl p-5" style={{ background: L.surface, border: `1px solid ${L.border}` }}>
        <div className="text-sm font-semibold mb-4" style={{ color: L.text }}>近7日用户增长</div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={dailyUserData} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={L.borderLight} />
            <XAxis dataKey="day" tick={{ fontSize: 11, fill: L.muted }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: L.muted }} axisLine={false} tickLine={false} />
            <Tooltip content={<Tip />} />
            <Bar dataKey="new" name="新增" fill="#4361ee" radius={[3, 3, 0, 0]} />
            <Bar dataKey="churned" name="流失" fill="#ef4444" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function CityTab() {
  const [sortCol, setSortCol] = useState<string>("revenue");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const sorted = [...cityData].sort((a: any, b: any) => {
    const av = a[sortCol], bv = b[sortCol];
    return sortDir === "desc" ? bv - av : av - bv;
  });

  const handleSort = (col: string) => {
    if (sortCol === col) setSortDir(d => d === "desc" ? "asc" : "desc");
    else { setSortCol(col); setSortDir("desc"); }
  };

  const maxRevenue = Math.max(...cityData.map(c => c.revenue));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-5">
        <div className="rounded-xl p-5" style={{ background: L.surface, border: `1px solid ${L.border}` }}>
          <div className="text-sm font-semibold mb-4" style={{ color: L.text }}>城市营收对比</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={cityData} layout="vertical" margin={{ top: 5, right: 20, left: 30, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={L.borderLight} horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: L.muted }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="city" tick={{ fontSize: 11, fill: L.muted }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v: any) => `¥${v}万`} />
              <Bar dataKey="revenue" name="营收(万)" fill="#4361ee" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl p-5" style={{ background: L.surface, border: `1px solid ${L.border}` }}>
          <div className="text-sm font-semibold mb-4" style={{ color: L.text }}>城市增长率排名</div>
          <div className="space-y-3">
            {[...cityData].sort((a, b) => b.growth - a.growth).map((city, i) => (
              <div key={city.city}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                      style={{ background: i < 3 ? "#4361ee" : L.muted }}>{i + 1}</span>
                    <span style={{ color: L.textSec }}>{city.city}</span>
                  </div>
                  <span className="font-semibold" style={{ color: "#059669" }}>+{city.growth}%</span>
                </div>
                <div className="h-1.5 rounded-full" style={{ background: L.borderLight }}>
                  <div className="h-full rounded-full" style={{ width: `${(city.growth / 25) * 100}%`, background: i < 3 ? "#4361ee" : L.muted }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ background: L.surface, border: `1px solid ${L.border}` }}>
        <div className="px-5 py-4 border-b" style={{ borderColor: L.border }}>
          <div className="text-sm font-semibold" style={{ color: L.text }}>城市数据明细</div>
        </div>
        <table className="w-full">
          <thead>
            <tr style={{ background: L.bg }}>
              {[
                { key: "city", label: "城市" },
                { key: "revenue", label: "本月营收" },
                { key: "users", label: "用户数" },
                { key: "groups", label: "活跃群组" },
                { key: "growth", label: "环比增长" },
                { key: "arpu", label: "人均贡献" },
              ].map(col => (
                <th key={col.key} className="px-4 py-3 text-left text-xs font-medium cursor-pointer select-none"
                  style={{ color: L.muted }}
                  onClick={() => col.key !== "city" && handleSort(col.key)}>
                  <div className="flex items-center gap-1">
                    {col.label}
                    {sortCol === col.key && (
                      <span style={{ color: L.primary }}>{sortDir === "desc" ? "↓" : "↑"}</span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((city, i) => (
              <tr key={city.city} style={{ borderTop: `1px solid ${L.borderLight}` }}
                className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-sm font-medium" style={{ color: L.text }}>{city.city}</td>
                <td className="px-4 py-3 text-sm" style={{ color: L.text }}>
                  <div className="flex items-center gap-2">
                    ¥{city.revenue}万
                    <div className="h-1.5 w-16 rounded-full" style={{ background: L.borderLight }}>
                      <div className="h-full rounded-full" style={{ width: `${(city.revenue / maxRevenue) * 100}%`, background: L.primary }} />
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm" style={{ color: L.textSec }}>{city.users}人</td>
                <td className="px-4 py-3 text-sm" style={{ color: L.textSec }}>{city.groups}个</td>
                <td className="px-4 py-3 text-sm font-medium" style={{ color: "#059669" }}>+{city.growth}%</td>
                <td className="px-4 py-3 text-sm" style={{ color: L.textSec }}>¥{city.arpu.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ProjectTab() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-4 gap-4">
        {projectMetrics.map(p => (
          <div key={p.name} className="rounded-xl p-5" style={{ background: L.surface, border: `1px solid ${L.border}` }}>
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-semibold" style={{ color: L.text }}>{p.name}</div>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: p.bg, color: p.color }}>{p.growth}</span>
            </div>
            <div className="space-y-2">
              <div>
                <div className="text-xs" style={{ color: L.muted }}>营收</div>
                <div className="text-xl font-bold" style={{ color: L.text }}>{p.revenue}</div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "用户数", value: p.users + "人" },
                  { label: "ARPU", value: p.arpu },
                  { label: "留存率", value: p.retention },
                ].map(m => (
                  <div key={m.label}>
                    <div className="text-[10px]" style={{ color: L.mutedLight }}>{m.label}</div>
                    <div className="text-xs font-semibold" style={{ color: L.textSec }}>{m.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl p-5" style={{ background: L.surface, border: `1px solid ${L.border}` }}>
        <div className="text-sm font-semibold mb-4" style={{ color: L.text }}>各项目营收趋势</div>
        <div className="flex gap-4 mb-4">
          {[
            { key: "pro", label: "PRO会员", color: "#4361ee" },
            { key: "experience", label: "体验官", color: "#06b6d4" },
            { key: "agent", label: "代理商", color: "#10b981" },
            { key: "city", label: "城市分站", color: "#f59e0b" },
          ].map(item => (
            <div key={item.key} className="flex items-center gap-1.5 text-xs" style={{ color: L.textSec }}>
              <div className="w-3 h-0.5 rounded-full" style={{ background: item.color }} />
              {item.label}
            </div>
          ))}
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={projectData} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={L.borderLight} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: L.muted }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: L.muted }} axisLine={false} tickLine={false} />
            <Tooltip content={<Tip />} />
            <Line type="monotone" dataKey="pro" name="PRO会员" stroke="#4361ee" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="experience" name="体验官" stroke="#06b6d4" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="agent" name="代理商" stroke="#10b981" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="city" name="城市分站" stroke="#f59e0b" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function ChannelTab() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-5">
        <div className="rounded-xl p-5" style={{ background: L.surface, border: `1px solid ${L.border}` }}>
          <div className="text-sm font-semibold mb-4" style={{ color: L.text }}>渠道用户分布</div>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width={180} height={180}>
              <PieChart>
                <Pie data={channelPie} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                  {channelPie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: any) => `${v}%`} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2">
              {channelPie.map((item, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                    <span style={{ color: L.textSec }}>{item.name}</span>
                  </div>
                  <span className="font-semibold" style={{ color: L.text }}>{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-xl p-5" style={{ background: L.surface, border: `1px solid ${L.border}` }}>
          <div className="text-sm font-semibold mb-4" style={{ color: L.text }}>转化漏斗</div>
          <div className="space-y-3">
            {channelFunnel.map((stage, i) => (
              <div key={stage.stage}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span style={{ color: L.textSec }}>{stage.stage}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold" style={{ color: L.text }}>{stage.count.toLocaleString()}</span>
                    <span style={{ color: L.muted }}>({stage.pct}%)</span>
                  </div>
                </div>
                <div className="h-6 rounded-lg overflow-hidden" style={{ background: L.borderLight }}>
                  <div className="h-full rounded-lg flex items-center px-2 text-white text-[10px] font-medium transition-all"
                    style={{ width: `${stage.pct}%`, background: COLORS[i] }}>
                    {stage.pct >= 5 ? `${stage.pct}%` : ""}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ background: L.surface, border: `1px solid ${L.border}` }}>
        <div className="px-5 py-4 border-b" style={{ borderColor: L.border }}>
          <div className="text-sm font-semibold" style={{ color: L.text }}>渠道明细</div>
        </div>
        <table className="w-full">
          <thead>
            <tr style={{ background: L.bg }}>
              {["渠道名称", "用户数", "营收", "转化率", "ARPU"].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium" style={{ color: L.muted }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {channelDetail.map((ch, i) => (
              <tr key={ch.name} style={{ borderTop: `1px solid ${L.borderLight}` }} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="text-sm font-medium" style={{ color: L.text }}>{ch.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm" style={{ color: L.textSec }}>{ch.users}人</td>
                <td className="px-4 py-3 text-sm font-medium" style={{ color: L.text }}>{ch.revenue}</td>
                <td className="px-4 py-3 text-sm" style={{ color: "#059669" }}>{ch.conv}</td>
                <td className="px-4 py-3 text-sm" style={{ color: L.textSec }}>{ch.arpu}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function ReportCenter() {
  const [dateRange, setDateRange] = useState("本月");
  const [activeTab, setActiveTab] = useState("概览报表");

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: L.text }}>数据报表中心</h1>
          <p className="text-xs mt-0.5" style={{ color: L.muted }}>全面掌握业务数据，驱动增长决策</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg overflow-hidden" style={{ border: `1px solid ${L.border}` }}>
            {DATE_RANGES.map(r => (
              <button key={r} onClick={() => setDateRange(r)}
                className="px-3 py-1.5 text-xs font-medium transition-all"
                style={{
                  background: dateRange === r ? L.primary : L.surface,
                  color: dateRange === r ? "#fff" : L.muted,
                  borderRight: r !== "本年" ? `1px solid ${L.border}` : "none",
                }}>
                {r}
              </button>
            ))}
          </div>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{ background: L.primary }}>
            <Download size={14} /> 导出报表
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: L.surface, border: `1px solid ${L.border}`, width: "fit-content" }}>
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: activeTab === tab ? L.primary : "transparent",
              color: activeTab === tab ? "#fff" : L.muted,
            }}>
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === "概览报表" && <OverviewTab />}
      {activeTab === "城市分析" && <CityTab />}
      {activeTab === "项目报表" && <ProjectTab />}
      {activeTab === "渠道来源" && <ChannelTab />}
    </div>
  );
}
