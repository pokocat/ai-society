import { useCallback, useEffect, useState } from "react";
import { View, Text, Button } from "@tarojs/components";
import Taro, { useShareAppMessage } from "@tarojs/taro";
import { createOrder, getInvite, getMe, getPlans, payOrder, MeData, Plan } from "../../api/mp";
import { captureInviteCode } from "../../utils/auth";

/**
 * 首页：会员套餐 + 购买（M3b Mock 支付，接口对齐虚拟支付）+ 裂变入口。
 * 落地归因：onLoad 再兜一次 query（冷启动走 app.onLaunch，热启动/转发进入走这里）。
 */
export default function Index() {
  const [me, setMe] = useState<MeData | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [sharePath, setSharePath] = useState<string>("/pages/index/index");

  const load = useCallback(async () => {
    try {
      const [m, p, inv] = await Promise.all([getMe(), getPlans(), getInvite()]);
      setMe(m);
      setPlans(p);
      setSharePath(inv.sharePath);
    } catch (e) {
      Taro.showToast({ title: (e as Error).message, icon: "none" });
    }
  }, []);

  useEffect(() => {
    const params = Taro.getCurrentInstance().router?.params ?? {};
    captureInviteCode({ query: params as Record<string, unknown> });
    void load();
  }, [load]);

  useShareAppMessage(() => ({
    title: "我在主理人公社，邀你一起进圈子",
    path: sharePath,
  }));

  const buy = async (plan: Plan) => {
    setBusy(plan.plan_code);
    try {
      const order = await createOrder(plan.plan_code);
      // M3b：Mock 支付直接回调成功；M3c 换 wx.requestVirtualPayment
      await payOrder(order.order_no);
      Taro.showToast({ title: "开通成功，权益已生效", icon: "success" });
      await load();
    } catch (e) {
      Taro.showToast({ title: (e as Error).message, icon: "none" });
    } finally {
      setBusy(null);
    }
  };

  return (
    <View>
      <View className="card" style={{ background: "#050805" }}>
        <Text className="title" style={{ color: "#b6ff00" }}>主理人公社</Text>
        <View style={{ marginTop: "12px" }}>
          <Text style={{ color: "#f7ffe6", fontSize: "26px" }}>
            {me ? `${me.name} · ${me.member_no}` : "登录中…"}
          </Text>
        </View>
        <View style={{ marginTop: "8px" }}>
          {me?.hasPaidEntitlement ? (
            <Text className="tag">会员有效 · {me.identity?.identity}</Text>
          ) : (
            <Text style={{ color: "#8c967d", fontSize: "24px" }}>尚未开通会员</Text>
          )}
        </View>
      </View>

      <View className="card">
        <Text className="title">会员套餐</Text>
        {plans.map(p => (
          <View key={p.plan_code} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "20px 0", borderBottom: "1px solid rgba(5,8,5,0.06)",
          }}>
            <View>
              <Text style={{ fontWeight: 600 }}>{p.name}</Text>
              <View><Text className="muted">{p.grant_identity} · {p.duration_days} 天</Text></View>
            </View>
            <Button className="btn-primary" size="mini" loading={busy === p.plan_code}
              onClick={() => void buy(p)}>
              ¥{(p.price_cents / 100).toFixed(0)} 开通
            </Button>
          </View>
        ))}
        <View style={{ marginTop: "12px" }}>
          <Text className="muted">当前为演示支付（Mock）；正式版走微信虚拟支付</Text>
        </View>
      </View>

      <View className="card">
        <Text className="title">邀请好友，一起进圈</Text>
        <View style={{ marginTop: "8px" }}>
          <Text className="muted">好友经你的邀请码加入，你得成长值奖励</Text>
        </View>
        <View style={{ display: "flex", gap: "16px", marginTop: "20px" }}>
          <Button className="btn-primary" style={{ flex: 1 }} openType="share">转发给好友</Button>
          <Button className="btn-ghost" style={{ flex: 1 }}
            onClick={() => Taro.switchTab({ url: "/pages/invite/index" })}>
            我的邀请
          </Button>
        </View>
      </View>
    </View>
  );
}
