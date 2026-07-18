import { useCallback, useState } from "react";
import { View, Text, Button, Input, Picker } from "@tarojs/components";
import Taro, { useDidShow } from "@tarojs/taro";
import { applyWithdrawal, getEarnings, EarningsData } from "../../api/mp";
import { useTabSync } from "../../utils/tab";
import { M } from "../../theme";
import Icon from "../../components/Icon";
import Sheet from "../../components/Sheet";

const METHODS = ["微信", "支付宝", "银行卡"];

const statusTag: Record<string, string> = {
  待审核: "tag", 已批准: "tag tag--amber", 已打款: "tag tag--green", 已拒绝: "tag tag--red",
};

/**
 * 收益页（对齐设计稿 EarningsTab）：收益镜像（SPEC §2.2 只读）+ 提现申请（审批协同，底部弹层）。
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

  useTabSync(3);

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
    <View className="page">
      <View className="hd" style={{ paddingBottom: "10rpx" }}>
        <Text className="hd-title" style={{ display: "block", marginBottom: "30rpx" }}>我的收益</Text>

        {/* 可提现主卡 */}
        <View className="card-hero" style={{ margin: "0" }}>
          <View>
            <Text style={{ fontSize: "22rpx", color: "rgba(255,255,255,0.65)" }}>可提现余额</Text>
            <View style={{ margin: "10rpx 0 14rpx" }}>
              <Text style={{ fontSize: "64rpx", fontWeight: 700, color: "#ffffff" }}>
                ¥{withdrawable.toLocaleString()}
              </Text>
            </View>
            <Text style={{ fontSize: "22rpx", color: "rgba(255,255,255,0.6)" }}>
              收益由项目方系统结算同步（只读镜像）
              {data?.summary.synced_at ? ` · 同步于 ${String(data.summary.synced_at).slice(0, 16).replace("T", " ")}` : ""}
            </Text>
          </View>
        </View>
      </View>

      {/* 统计四宫格 */}
      <View className="stat-grid stat-grid--wrap" style={{ marginTop: "30rpx" }}>
        {stats.map(s => (
          <View key={s.label} className="stat-card stat-card--half">
            <Text className="stat-label">{s.label}</Text>
            <View>
              <Text className="stat-value stat-value--lg" style={{ color: s.color }}>{s.value}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* 提现按钮 */}
      <View style={{ margin: "0 40rpx 30rpx" }}>
        <Button className="btn btn--gradient" disabled={withdrawable < 100} onClick={openForm}>
          <Icon name="wallet" size={30} color="#ffffff" />
          申请提现
        </Button>
        {withdrawable < 100 && (
          <View style={{ marginTop: "12rpx", textAlign: "center" }}>
            <Text className="t-muted">可提现余额满 ¥100 才可申请</Text>
          </View>
        )}
      </View>

      {/* 提现记录 */}
      <View className="section-head">
        <Text className="section-title">提现记录</Text>
      </View>
      <View className="card" style={{ paddingTop: "6rpx", paddingBottom: "6rpx" }}>
        {(data?.withdrawals ?? []).length === 0 && (
          <View style={{ padding: "30rpx 0" }}><Text className="t-muted">暂无提现记录</Text></View>
        )}
        {(data?.withdrawals ?? []).map(w => (
          <View key={w.id} className="row">
            <View className="f f-1" style={{ gap: "20rpx" }}>
              <View
                className="li-icon"
                style={{ background: w.status === "已打款" ? "rgba(16,185,129,0.15)" : "rgba(67,97,238,0.15)" }}
              >
                <Icon name="wallet" size={26} color={w.status === "已打款" ? "#10b981" : "#7c9aff"} />
              </View>
              <View className="f-1">
                <Text className="t-body">提现至{w.method} ¥{Number(w.amount).toLocaleString()}</Text>
                <View style={{ marginTop: "6rpx" }}>
                  <Text className="t-muted">{String(w.created_at).slice(0, 16).replace("T", " ")}</Text>
                </View>
              </View>
            </View>
            <Text className={statusTag[w.status] ?? "tag"}>{w.status}</Text>
          </View>
        ))}
      </View>

      <View style={{ margin: "0 40rpx" }}>
        <Text className="t-muted">
          提现申请提交后进入审批流程，审批通过后由项目方系统打款，预计 1-3 个工作日到账。
        </Text>
      </View>

      {/* 提现表单（底部弹层，对齐设计稿） */}
      {formOpen && (
        <Sheet title="申请提现" onClose={() => setFormOpen(false)}>
          <View style={{ marginTop: "30rpx", padding: "24rpx", borderRadius: "24rpx", background: M.surface2 }}>
            <Text className="t-muted" style={{ fontSize: "20rpx" }}>可提现金额</Text>
            <View style={{ marginTop: "6rpx" }}>
              <Text style={{ fontSize: "44rpx", fontWeight: 600, color: M.text }}>
                ¥{withdrawable.toLocaleString()}
              </Text>
            </View>
          </View>

          <View style={{ marginTop: "26rpx" }}>
            <Text className="t-sec">提现金额（100 起，整数）</Text>
            <Input
              type="number" value={amount} placeholder="最低 100 元"
              className={amount && !valid ? "field-input field-input--error" : "field-input"}
              placeholderStyle="color:#64748b"
              onInput={e => setAmount(e.detail.value)}
            />
            <View style={{ marginTop: "10rpx", minHeight: "30rpx" }}>
              <Text style={{ fontSize: "20rpx", color: amount && !valid ? "#f87171" : M.muted }}>
                {amount && !valid
                  ? `请输入 100-${withdrawable} 之间的整数金额`
                  : "审批通过后由项目方系统打款"}
              </Text>
            </View>
          </View>

          <View style={{ marginTop: "6rpx" }}>
            <Text className="t-sec">提现渠道</Text>
            <Picker mode="selector" range={METHODS} value={methodIdx} onChange={e => setMethodIdx(Number(e.detail.value))}>
              <View className="f-between" style={{ marginTop: "14rpx", padding: "22rpx 26rpx", borderRadius: "22rpx", background: M.surface2 }}>
                <Text className="t-body">{METHODS[methodIdx]}</Text>
                <Icon name="chevron-right" size={28} color={M.muted} />
              </View>
            </Picker>
          </View>

          <View style={{ marginTop: "26rpx" }}>
            <Text className="t-sec">收款账户（选填，银行卡请填卡号）</Text>
            <Input
              value={account} placeholder="默认使用实名账户"
              className="field-input"
              placeholderStyle="color:#64748b"
              onInput={e => setAccount(e.detail.value)}
            />
          </View>

          <Button className="btn btn--gradient" style={{ marginTop: "40rpx" }} disabled={!valid} loading={submitting} onClick={() => void submit()}>
            确认提交（进入审批）
          </Button>
        </Sheet>
      )}
    </View>
  );
}
