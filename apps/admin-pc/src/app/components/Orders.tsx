import { useEffect, useMemo, useState } from "react";
import { CreditCard, FileText, RefreshCw, Search, X } from "lucide-react";
import { listOrders, MembershipOrder } from "../../api/membership";
import { ApiError } from "../../api";

const L = {
  bg: "#0d1629", surface: "#131f35", surface2: "#1a2640", border: "rgba(255,255,255,0.075)", border2: "rgba(255,255,255,0.045)",
  text: "#e2e8f0", text2: "#94a3b8", muted: "#64748b", primary: "#4361ee", green: "#34d399", amber: "#fbbf24", red: "#f87171",
};

const STATUS_COLOR: Record<string, string> = { 已支付: L.green, 待支付: L.amber, 已退款: L.red, 已关闭: L.muted, 退款中: L.amber };
const yuan = (cents: number) => `¥${(cents / 100).toLocaleString("zh-CN", { minimumFractionDigits: 2 })}`;
const fmt = (s: string | null) => (s ? String(s).slice(0, 16).replace("T", " ") : "—");

/**
 * 会员费订单（一方交易，中台为事实源）：只读列表，GET /membership/orders。
 * 全部字段来自后端订单域，无数据时空态，不再渲染演示订单。
 */
export default function Orders() {
  const [rows, setRows] = useState<MembershipOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("全部");
  const [search, setSearch] = useState("");

  const load = () => {
    setLoading(true);
    setError(null);
    listOrders(status === "全部" ? {} : { status })
      .then(setRows)
      .catch(e => setError(e instanceof ApiError ? e.message : "加载失败"))
      .finally(() => setLoading(false));
  };

  useEffect(load, [status]);

  const filtered = useMemo(() => rows.filter(o =>
    search === "" || o.order_no.includes(search) || o.member_no.includes(search) ||
    (o.member_name ?? "").includes(search) || (o.plan_name ?? "").includes(search)),
  [rows, search]);

  const paidTotal = rows.filter(o => o.status === "已支付").reduce((s, o) => s + o.amount_cents, 0);

  return (
    <div className="p-5 h-full flex flex-col gap-3 min-w-[920px]" style={{ background: L.bg }}>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-semibold" style={{ color: L.text, fontSize: 18 }}>会员订单</h1>
          <p className="mt-1" style={{ color: L.muted, fontSize: 11 }}>会员费订单（一方交易，中台为事实源）——项目方分销订单只读镜像不在此列</p>
        </div>
        <button onClick={load} className="px-3 py-2 rounded-md flex items-center gap-1.5" style={{ color: L.text2, background: L.surface, border: `1px solid ${L.border}`, fontSize: 11 }}>
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />刷新
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[["订单总数", String(rows.length), FileText, L.primary], ["已支付", String(rows.filter(o => o.status === "已支付").length), CreditCard, L.green], ["已支付金额", yuan(paidTotal), CreditCard, L.amber]].map(([label, value, Icon, color]) => {
          const I = Icon as typeof FileText;
          return <div key={label as string} className="p-3 rounded-md flex items-center gap-3" style={{ background: L.surface, border: `1px solid ${L.border}` }}><div className="w-9 h-9 rounded-md flex items-center justify-center" style={{ background: `${color}18` }}><I size={16} style={{ color: color as string }} /></div><div><div className="font-semibold" style={{ color: L.text, fontSize: 15 }}>{value}</div><div style={{ color: L.muted, fontSize: 9 }}>{label as string}</div></div></div>;
        })}
      </div>

      <div className="flex items-center gap-2">
        <div className="flex-1 px-3 py-2 rounded-md flex items-center gap-2" style={{ background: L.surface, border: `1px solid ${L.border}` }}>
          <Search size={12} style={{ color: L.muted }} />
          <input value={search} onChange={e => setSearch(e.target.value)} className="bg-transparent outline-none flex-1" style={{ color: L.text, fontSize: 10 }} placeholder="搜索订单号、会员号/姓名或套餐" />
          {search && <button onClick={() => setSearch("")} title="清除搜索"><X size={11} style={{ color: L.muted }} /></button>}
        </div>
        <div className="relative">
          <select value={status} onChange={e => setStatus(e.target.value)} className="appearance-none pl-3 pr-8 py-2 rounded-md outline-none" style={{ color: L.text2, background: L.surface, border: `1px solid ${L.border}`, fontSize: 9 }}>
            <option>全部</option><option>已支付</option><option>待支付</option><option>退款中</option><option>已退款</option><option>已关闭</option>
          </select>
        </div>
      </div>

      <section className="flex-1 rounded-md overflow-hidden flex flex-col" style={{ background: L.surface, border: `1px solid ${L.border}` }}>
        <div className="grid grid-cols-[1.3fr_1fr_1.1fr_0.8fr_0.7fr_0.8fr_1fr] px-3 py-2.5" style={{ color: L.muted, background: L.surface2, fontSize: 9 }}>
          <span>订单号</span><span>会员</span><span>套餐</span><span>金额</span><span>渠道</span><span>状态</span><span>下单时间</span>
        </div>
        <div className="flex-1 overflow-auto" style={{ scrollbarWidth: "none" }}>
          {loading && <div className="py-16 text-center" style={{ color: L.muted, fontSize: 11 }}>加载中…</div>}
          {!loading && error && <div className="py-16 text-center" style={{ color: L.red, fontSize: 11 }}>{error}<button onClick={load} className="ml-2 underline">重试</button></div>}
          {!loading && !error && filtered.length === 0 && (
            <div className="py-20 text-center flex flex-col items-center gap-2">
              <FileText size={26} style={{ color: L.muted, opacity: 0.5 }} />
              <div style={{ color: L.text2, fontSize: 12 }}>{rows.length === 0 ? "暂无订单" : "无匹配结果"}</div>
              <div style={{ color: L.muted, fontSize: 9 }}>{rows.length === 0 ? "会员在小程序完成购买后，订单在此展示" : "调整搜索或筛选条件"}</div>
            </div>
          )}
          {!loading && !error && filtered.map(o => (
            <div key={o.order_no} className="grid grid-cols-[1.3fr_1fr_1.1fr_0.8fr_0.7fr_0.8fr_1fr] px-3 py-2.5 items-center" style={{ borderTop: `1px solid ${L.border2}` }}>
              <span className="font-mono truncate" style={{ color: L.text2, fontSize: 9 }}>{o.order_no}</span>
              <span className="min-w-0"><span className="block truncate" style={{ color: L.text, fontSize: 10 }}>{o.member_name ?? "—"}</span><span className="block mt-0.5 truncate" style={{ color: L.muted, fontSize: 8 }}>{o.member_no}</span></span>
              <span className="min-w-0"><span className="block truncate" style={{ color: L.text2, fontSize: 9 }}>{o.plan_name}</span><span className="block mt-0.5" style={{ color: L.muted, fontSize: 8 }}>{o.grant_identity} · {o.duration_days}天</span></span>
              <span style={{ color: L.text, fontSize: 10 }}>{yuan(o.amount_cents)}</span>
              <span style={{ color: L.text2, fontSize: 9 }}>{o.channel}</span>
              <span><span className="px-1.5 py-0.5 rounded" style={{ color: STATUS_COLOR[o.status] ?? L.text2, background: L.surface2, fontSize: 8 }}>{o.status}</span></span>
              <span style={{ color: L.muted, fontSize: 9 }}>{fmt(o.paid_at ?? o.created_at)}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
