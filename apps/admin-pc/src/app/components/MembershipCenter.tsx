import { useCallback, useEffect, useState } from "react";
import { CreditCard, Loader2, PackagePlus, Play, RefreshCw, ShieldCheck, Timer } from "lucide-react";
import { ApiError, membershipApi, newIdempotencyKey } from "../../api";
import type { MembershipOrder, MembershipPlan } from "../../api/membership";
import { useProject } from "../contexts/ProjectContext";

const L = {
  bg: "#0d1629", surface: "#131f35", surface2: "#1a2640",
  border: "rgba(255,255,255,0.07)", primary: "#4361ee",
  text: "#e2e8f0", textSec: "#94a3b8", muted: "#64748b",
  success: "#22c55e", warning: "#f2b600", danger: "#ff4d4f",
};

const orderStatusColor: Record<string, string> = {
  待支付: L.warning, 已支付: L.success, 退款中: "#f97316", 已退款: L.muted, 已关闭: L.muted,
};

function fen2yuan(cents: number | null | undefined): string {
  if (cents == null) return "—";
  return `¥${(cents / 100).toFixed(2)}`;
}

interface Toast { text: string; kind: "success" | "error"; }

/**
 * 会员权益中心（M3a）：套餐管理 + 会员费订单（一方交易）+ 到期作业。
 * Mock 支付按钮 = 模拟虚拟支付回调（M3c 换真实虚拟支付，本页不变）。
 */
export default function MembershipCenter() {
  const { currentProject } = useProject();
  const [tab, setTab] = useState<"plans" | "orders">("plans");
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [orders, setOrders] = useState<MembershipOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  // 新建套餐 / 下单表单
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [planForm, setPlanForm] = useState({ planCode: "", name: "", grantIdentity: "PRO会员", durationDays: 30, priceCents: 19900 });
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [orderForm, setOrderForm] = useState({ memberNo: "", planCode: "", channel: "android" });

  const pushToast = useCallback((text: string, kind: "success" | "error" = "success") => setToast({ text, kind }), []);
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(t);
  }, [toast]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, o] = await Promise.all([membershipApi.listPlans(), membershipApi.listOrders()]);
      setPlans(p);
      setOrders(o);
    } catch (err) {
      pushToast(err instanceof ApiError ? err.message : "加载权益数据失败", "error");
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  useEffect(() => { void load(); }, [load]);

  const run = useCallback(async (key: string, fn: () => Promise<unknown>, okMsg: string) => {
    setBusy(key);
    try {
      await fn();
      pushToast(okMsg);
      await load();
    } catch (err) {
      pushToast(err instanceof ApiError ? err.message : "操作失败", "error");
    } finally {
      setBusy(null);
    }
  }, [load, pushToast]);

  return (
    <div className="p-6 min-h-full" style={{ background: L.bg }}>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-bold flex items-center gap-2" style={{ color: L.text }}>
            <ShieldCheck size={18} style={{ color: L.primary }} /> 会员权益中心
          </h1>
          <p className="text-xs mt-1" style={{ color: L.muted }}>
            套餐 / 会员费订单（一方交易·虚拟支付）/ 付费门控 —— 当前为 Mock 支付，M3c 接真实虚拟支付
          </p>
        </div>
        <button
          onClick={() => run("expiry", () => membershipApi.runExpiry(), "到期作业已执行")}
          disabled={busy === "expiry"}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs"
          style={{ background: L.surface2, color: L.textSec, border: `1px solid ${L.border}` }}
        >
          {busy === "expiry" ? <Loader2 size={13} className="animate-spin" /> : <Timer size={13} />}
          手动跑到期作业
        </button>
      </div>

      <div className="flex gap-1 mb-4">
        {([["plans", "会员套餐"], ["orders", "会员费订单"]] as const).map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)}
            className="px-4 py-1.5 rounded-lg text-xs font-medium"
            style={{ background: tab === k ? L.primary : L.surface, color: tab === k ? "#fff" : L.textSec }}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-xs py-16 justify-center" style={{ color: L.muted }}>
          <Loader2 size={14} className="animate-spin" /> 加载中
        </div>
      ) : tab === "plans" ? (
        <div className="rounded-xl overflow-hidden" style={{ background: L.surface, border: `1px solid ${L.border}` }}>
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${L.border}` }}>
            <span className="text-xs font-medium" style={{ color: L.textSec }}>共 {plans.length} 个套餐</span>
            <button onClick={() => setShowPlanForm(v => !v)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{ background: L.primary, color: "#fff" }}>
              <PackagePlus size={13} /> 新建套餐
            </button>
          </div>
          {showPlanForm && (
            <div className="px-4 py-3 grid grid-cols-6 gap-2 items-end" style={{ borderBottom: `1px solid ${L.border}`, background: L.surface2 }}>
              {([
                ["planCode", "编码 MPLAN-*"], ["name", "名称"],
              ] as const).map(([k, ph]) => (
                <input key={k} placeholder={ph} value={planForm[k]}
                  onChange={e => setPlanForm(f => ({ ...f, [k]: e.target.value }))}
                  className="px-2 py-1.5 rounded text-xs outline-none col-span-1"
                  style={{ background: L.bg, color: L.text, border: `1px solid ${L.border}` }} />
              ))}
              <select value={planForm.grantIdentity}
                onChange={e => setPlanForm(f => ({ ...f, grantIdentity: e.target.value }))}
                className="px-2 py-1.5 rounded text-xs outline-none"
                style={{ background: L.bg, color: L.text, border: `1px solid ${L.border}` }}>
                {["PRO会员", "尊享官", "黑金", "VIP"].map(i => <option key={i}>{i}</option>)}
              </select>
              <input type="number" placeholder="时长(天)" value={planForm.durationDays}
                onChange={e => setPlanForm(f => ({ ...f, durationDays: Number(e.target.value) }))}
                className="px-2 py-1.5 rounded text-xs outline-none"
                style={{ background: L.bg, color: L.text, border: `1px solid ${L.border}` }} />
              <input type="number" placeholder="价格(分)" value={planForm.priceCents}
                onChange={e => setPlanForm(f => ({ ...f, priceCents: Number(e.target.value) }))}
                className="px-2 py-1.5 rounded text-xs outline-none"
                style={{ background: L.bg, color: L.text, border: `1px solid ${L.border}` }} />
              <button
                onClick={() => run("createPlan",
                  () => membershipApi.createPlan(planForm).then(() => setShowPlanForm(false)),
                  "套餐已创建")}
                disabled={busy === "createPlan" || !planForm.planCode || !planForm.name}
                className="px-3 py-1.5 rounded text-xs font-medium"
                style={{ background: L.primary, color: "#fff", opacity: !planForm.planCode || !planForm.name ? 0.5 : 1 }}>
                {busy === "createPlan" ? "创建中…" : "创建"}
              </button>
            </div>
          )}
          <table className="w-full text-xs">
            <thead>
              <tr style={{ color: L.muted, borderBottom: `1px solid ${L.border}` }}>
                {["编码", "名称", "授予身份", "时长", "价格", "iOS 价", "范围", "状态", "操作"].map(h => (
                  <th key={h} className="text-left px-4 py-2 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {plans.map(p => (
                <tr key={p.id} style={{ color: L.textSec, borderBottom: `1px solid ${L.border}` }}>
                  <td className="px-4 py-2.5 font-mono" style={{ color: L.text }}>{p.plan_code}</td>
                  <td className="px-4 py-2.5">{p.name}</td>
                  <td className="px-4 py-2.5">{p.grant_identity}</td>
                  <td className="px-4 py-2.5">{p.duration_days} 天</td>
                  <td className="px-4 py-2.5">{fen2yuan(p.price_cents)}</td>
                  <td className="px-4 py-2.5">{fen2yuan(p.ios_price_cents)}</td>
                  <td className="px-4 py-2.5">{p.project_scope ?? "全生态"}</td>
                  <td className="px-4 py-2.5">
                    <span style={{ color: p.status === "上架" ? L.success : L.muted }}>{p.status}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <button
                      onClick={() => run(`plan-${p.id}`,
                        () => membershipApi.setPlanStatus(p.id, p.status === "上架" ? "下架" : "上架"),
                        p.status === "上架" ? "已下架" : "已上架")}
                      disabled={busy === `plan-${p.id}`}
                      className="px-2 py-1 rounded text-xs"
                      style={{ background: L.surface2, color: L.textSec, border: `1px solid ${L.border}` }}>
                      {p.status === "上架" ? "下架" : "上架"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ background: L.surface, border: `1px solid ${L.border}` }}>
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${L.border}` }}>
            <span className="text-xs font-medium" style={{ color: L.textSec }}>共 {orders.length} 笔订单</span>
            <div className="flex gap-2">
              <button onClick={() => void load()} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs"
                style={{ background: L.surface2, color: L.textSec, border: `1px solid ${L.border}` }}>
                <RefreshCw size={12} /> 刷新
              </button>
              <button onClick={() => setShowOrderForm(v => !v)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium"
                style={{ background: L.primary, color: "#fff" }}>
                <CreditCard size={13} /> 代客下单
              </button>
            </div>
          </div>
          {showOrderForm && (
            <div className="px-4 py-3 flex gap-2 items-end" style={{ borderBottom: `1px solid ${L.border}`, background: L.surface2 }}>
              <input placeholder="会员号 U-xxxxx" value={orderForm.memberNo}
                onChange={e => setOrderForm(f => ({ ...f, memberNo: e.target.value }))}
                className="px-2 py-1.5 rounded text-xs outline-none w-36"
                style={{ background: L.bg, color: L.text, border: `1px solid ${L.border}` }} />
              <select value={orderForm.planCode}
                onChange={e => setOrderForm(f => ({ ...f, planCode: e.target.value }))}
                className="px-2 py-1.5 rounded text-xs outline-none"
                style={{ background: L.bg, color: L.text, border: `1px solid ${L.border}` }}>
                <option value="">选择套餐</option>
                {plans.filter(p => p.status === "上架").map(p => (
                  <option key={p.plan_code} value={p.plan_code}>{p.name}（{fen2yuan(p.price_cents)}）</option>
                ))}
              </select>
              <select value={orderForm.channel}
                onChange={e => setOrderForm(f => ({ ...f, channel: e.target.value }))}
                className="px-2 py-1.5 rounded text-xs outline-none"
                style={{ background: L.bg, color: L.text, border: `1px solid ${L.border}` }}>
                <option value="android">安卓</option>
                <option value="ios">iOS</option>
                <option value="other">其他</option>
              </select>
              <button
                onClick={() => run("createOrder",
                  () => membershipApi.createOrder({ ...orderForm, projectId: currentProject.id }, newIdempotencyKey())
                    .then(() => setShowOrderForm(false)),
                  "订单已创建（待支付）")}
                disabled={busy === "createOrder" || !orderForm.memberNo || !orderForm.planCode}
                className="px-3 py-1.5 rounded text-xs font-medium"
                style={{ background: L.primary, color: "#fff", opacity: !orderForm.memberNo || !orderForm.planCode ? 0.5 : 1 }}>
                {busy === "createOrder" ? "创建中…" : "下单"}
              </button>
            </div>
          )}
          <table className="w-full text-xs">
            <thead>
              <tr style={{ color: L.muted, borderBottom: `1px solid ${L.border}` }}>
                {["单号", "会员", "套餐", "渠道", "金额", "状态", "支付时间", "操作"].map(h => (
                  <th key={h} className="text-left px-4 py-2 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id} style={{ color: L.textSec, borderBottom: `1px solid ${L.border}` }}>
                  <td className="px-4 py-2.5 font-mono" style={{ color: L.text }}>{o.order_no}</td>
                  <td className="px-4 py-2.5">{o.member_name}<span style={{ color: L.muted }}>（{o.member_no}）</span></td>
                  <td className="px-4 py-2.5">{o.plan_name}</td>
                  <td className="px-4 py-2.5">{o.channel}</td>
                  <td className="px-4 py-2.5">{fen2yuan(o.amount_cents)}</td>
                  <td className="px-4 py-2.5">
                    <span style={{ color: orderStatusColor[o.status] ?? L.textSec }}>{o.status}</span>
                  </td>
                  <td className="px-4 py-2.5">{o.paid_at ? new Date(o.paid_at).toLocaleString("zh-CN") : "—"}</td>
                  <td className="px-4 py-2.5 flex gap-1.5">
                    {o.status === "待支付" && (
                      <>
                        <button
                          onClick={() => run(`pay-${o.order_no}`,
                            () => membershipApi.mockPay(o.order_no), "支付成功·权益已生效（Mock）")}
                          disabled={busy === `pay-${o.order_no}`}
                          className="flex items-center gap-1 px-2 py-1 rounded text-xs"
                          style={{ background: "rgba(34,197,94,0.15)", color: L.success }}>
                          <Play size={11} /> Mock 支付
                        </button>
                        <button
                          onClick={() => run(`close-${o.order_no}`,
                            () => membershipApi.changeOrderStatus(o.order_no, "已关闭", "运营关单"), "已关单")}
                          className="px-2 py-1 rounded text-xs"
                          style={{ background: L.surface2, color: L.muted, border: `1px solid ${L.border}` }}>
                          关单
                        </button>
                      </>
                    )}
                    {o.status === "已支付" && (
                      <button
                        onClick={() => run(`refund-${o.order_no}`,
                          () => membershipApi.changeOrderStatus(o.order_no, "退款中", "用户申请退款"), "已进入退款中")}
                        className="px-2 py-1 rounded text-xs"
                        style={{ background: "rgba(249,115,22,0.15)", color: "#f97316" }}>
                        发起退款
                      </button>
                    )}
                    {o.status === "退款中" && (
                      <>
                        <button
                          onClick={() => run(`refunded-${o.order_no}`,
                            () => membershipApi.changeOrderStatus(o.order_no, "已退款", "退款完成"), "已退款·权益已回收")}
                          className="px-2 py-1 rounded text-xs"
                          style={{ background: "rgba(255,77,79,0.15)", color: L.danger }}>
                          退款完成
                        </button>
                        <button
                          onClick={() => run(`reject-${o.order_no}`,
                            () => membershipApi.changeOrderStatus(o.order_no, "已支付", "退款驳回"), "退款已驳回")}
                          className="px-2 py-1 rounded text-xs"
                          style={{ background: L.surface2, color: L.muted, border: `1px solid ${L.border}` }}>
                          驳回
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg text-xs font-medium z-50"
          style={{ background: toast.kind === "success" ? L.success : L.danger, color: "#fff" }}>
          {toast.text}
        </div>
      )}
    </div>
  );
}
