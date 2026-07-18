import { useCallback, useState } from "react";
import { View, Text, Button, Input, Picker } from "@tarojs/components";
import Taro, { useDidShow } from "@tarojs/taro";
import { applyWithdrawal, getEarnings, EarningsData } from "../../api/mp";

const METHODS = ["微信", "支付宝", "银行卡"];

const statusTag: Record<string, string> = {
  待审核: "tag", 已批准: "tag tag-amber", 已打款: "tag tag-green", 已拒绝: "tag tag-red",
};

/**
 * 收益页（对齐设计稿 EarningsTab）：收益镜像（SPEC §2.2 只读）+ 提现申请（审批协同）。
 * 提现流程：申请 → PC 审批中心 → 外部系统打款；中台不执行打款。
 */
export default function Earnings() {
  const [data, setData] = useState<EarningsData | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [methodIdx, setMethodIdx] = useState(0);
  const [account, setAccount] = useState("");
  const [idemKey, setIdemKey] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await getEarnings());
    } catch (e) {
      Taro.showToast({ title: (e as Error).message, icon: "none" });
    }
  }, []);

  useDidShow(() => { void load(); });

  const withdrawable = Number(data?.summary.withdrawable ?? 0);
  const n = Number(amount);
  const valid = Number.isInteger(n) && n >= 100 && n <= withdrawable;

  const openForm = () => {
    // 幂等键：一次填单一个键，重复点提交只受理一次
    setIdemKey(`mpwd-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);
    setAmount("");
    setAccount("");
    setFormOpen(true);
  };

  const submit = async () => {
    if (!valid || submitting) return;
    setSubmitting(true);
    try {
      const r = await applyWithdrawal(n, METHODS[methodIdx], account || undefined, idemKey);
      setFormOpen(false);
      Taro.showToast({ title: r.message ?? "提现申请已提交", icon: "success" });
      await load();
    } catch (e) {
      Taro.showToast({ title: (e as Error).message, icon: "none" });
    } finally {
      setSubmitting(false);
    }
  };

  const stats = [
    { label: "累计收益(预估)", value: `¥${Number(data?.summary.total_est ?? 0).toLocaleString()}`, color: "#7c9aff" },
    { label: "待结算", value: `¥${Number(data?.summary.pending ?? 0).toLocaleString()}`, color: "#f59e0b" },
    { label: "已提现", value: `¥${Number(data?.paidOut ?? 0).toLocaleString()}`, color: "#34d399" },
    { label: "冻结中", value: `¥${Number(data?.summary.frozen ?? 0).toLocaleString()}`, color: "#f87171" },
  ];

  return (
    <View style={{ paddingBottom: "32px" }}>
      <View style={{ padding: "32px 24px 0" }}>
        <Text style={{ fontSize: "38px", fontWeight: 700, color: "#e2e8f0" }}>我的收益</Text>
      </View>

      {/* 可提现主卡 */}
      <View className="card-hero">
        <Text style={{ fontSize: "22px", color: "rgba(255,255,255,0.65)" }}>可提现余额</Text>
        <View style={{ margin: "12px 0 16px" }}>
          <Text style={{ fontSize: "64px", fontWeight: 700, color: "#ffffff" }}>
            ¥{withdrawable.toLocaleString()}
          </Text>
        </View>
        <Text style={{ fontSize: "22px", color: "rgba(255,255,255,0.6)" }}>
          收益由项目方系统结算同步（只读镜像）
          {data?.summary.synced_at ? ` · 同步于 ${String(data.summary.synced_at).slice(0, 16).replace("T", " ")}` : ""}
        </Text>
      </View>

      {/* 统计四宫格 */}
      <View style={{ display: "flex", flexWrap: "wrap", gap: "16px", margin: "0 24px" }}>
        {stats.map(s => (
          <View key={s.label} style={{
            width: "calc(50% - 8px)", boxSizing: "border-box",
            background: "#1a2640", borderRadius: "24px", padding: "26px 24px",
          }}>
            <Text className="muted">{s.label}</Text>
            <View style={{ marginTop: "8px" }}>
              <Text style={{ fontSize: "32px", fontWeight: 700, color: s.color }}>{s.value}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* 提现按钮 */}
      <View style={{ margin: "24px" }}>
        <Button className="btn-gradient" style={{ width: "100%" }}
          disabled={withdrawable < 100} onClick={openForm}>
          申请提现
        </Button>
        {withdrawable < 100 && (
          <View style={{ marginTop: "10px", textAlign: "center" }}>
            <Text className="muted">可提现余额满 ¥100 才可申请</Text>
          </View>
        )}
      </View>

      {/* 提现记录 */}
      <Text className="section-title">提现记录</Text>
      <View className="card" style={{ paddingTop: "8px", paddingBottom: "8px" }}>
        {(data?.withdrawals ?? []).length === 0 && (
          <View style={{ padding: "24px 0" }}><Text className="muted">暂无提现记录</Text></View>
        )}
        {(data?.withdrawals ?? []).map(w => (
          <View key={w.id} className="row">
            <View>
              <Text style={{ fontSize: "28px", color: "#e2e8f0" }}>
                提现至{w.method} ¥{Number(w.amount).toLocaleString()}
              </Text>
              <View style={{ marginTop: "6px" }}>
                <Text className="muted">{String(w.created_at).slice(0, 16).replace("T", " ")}</Text>
              </View>
            </View>
            <Text className={statusTag[w.status] ?? "tag"}>{w.status}</Text>
          </View>
        ))}
      </View>

      <View className="card" style={{ background: "transparent", border: "none" }}>
        <Text className="muted">
          提现申请提交后进入审批流程，审批通过后由项目方系统打款，预计 1-3 个工作日到账。
        </Text>
      </View>

      {/* 提现表单（底部弹层） */}
      {formOpen && (
        <View onClick={() => setFormOpen(false)} style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 50,
          background: "rgba(4,8,18,0.76)", display: "flex", alignItems: "flex-end",
        }}>
          <View onClick={e => e.stopPropagation()} style={{
            width: "100%", background: "#131f35", borderRadius: "40px 40px 0 0",
            padding: "40px 32px 60px", boxSizing: "border-box",
          }}>
            <View style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ fontSize: "30px", fontWeight: 600, color: "#e2e8f0" }}>申请提现</Text>
              <Text className="muted" onClick={() => setFormOpen(false)}>关闭</Text>
            </View>

            <View style={{ background: "#1a2640", borderRadius: "24px", padding: "24px", marginTop: "28px" }}>
              <Text className="muted">可提现金额</Text>
              <View style={{ marginTop: "6px" }}>
                <Text style={{ fontSize: "40px", fontWeight: 600, color: "#e2e8f0" }}>
                  ¥{withdrawable.toLocaleString()}
                </Text>
              </View>
            </View>

            <View style={{ marginTop: "24px" }}>
              <Text className="sec">提现金额（100 起，整数）</Text>
              <Input type="number" value={amount} placeholder="最低 100 元"
                onInput={e => setAmount(e.detail.value)}
                placeholderStyle="color:#64748b"
                style={{
                  marginTop: "12px", padding: "22px 24px", borderRadius: "20px",
                  background: "#1a2640", color: "#e2e8f0", fontSize: "30px",
                  border: `1px solid ${amount && !valid ? "rgba(239,68,68,0.6)" : "rgba(255,255,255,0.07)"}`,
                }} />
              <View style={{ marginTop: "10px", minHeight: "30px" }}>
                <Text style={{ fontSize: "22px", color: amount && !valid ? "#f87171" : "#64748b" }}>
                  {amount && !valid
                    ? `请输入 100-${withdrawable} 之间的整数金额`
                    : "审批通过后由项目方系统打款"}
                </Text>
              </View>
            </View>

            <View style={{ marginTop: "8px" }}>
              <Text className="sec">提现渠道</Text>
              <Picker mode="selector" range={METHODS} value={methodIdx}
                onChange={e => setMethodIdx(Number(e.detail.value))}>
                <View style={{
                  marginTop: "12px", padding: "22px 24px", borderRadius: "20px",
                  background: "#1a2640", display: "flex", justifyContent: "space-between",
                }}>
                  <Text style={{ fontSize: "28px", color: "#e2e8f0" }}>{METHODS[methodIdx]}</Text>
                  <Text className="muted">切换 ›</Text>
                </View>
              </Picker>
            </View>

            <View style={{ marginTop: "24px" }}>
              <Text className="sec">收款账户（选填，银行卡请填卡号）</Text>
              <Input value={account} placeholder="默认使用实名账户"
                onInput={e => setAccount(e.detail.value)}
                placeholderStyle="color:#64748b"
                style={{
                  marginTop: "12px", padding: "22px 24px", borderRadius: "20px",
                  background: "#1a2640", color: "#e2e8f0", fontSize: "28px",
                  border: "1px solid rgba(255,255,255,0.07)",
                }} />
            </View>

            <Button className="btn-gradient" style={{ width: "100%", marginTop: "36px" }}
              disabled={!valid} loading={submitting} onClick={() => void submit()}>
              确认提交（进入审批）
            </Button>
          </View>
        </View>
      )}
    </View>
  );
}
