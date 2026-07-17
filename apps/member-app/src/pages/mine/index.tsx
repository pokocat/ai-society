import { useCallback, useState } from "react";
import { View, Text } from "@tarojs/components";
import Taro, { useDidShow } from "@tarojs/taro";
import { getFaq, getMe, FaqItem, MeData } from "../../api/mp";

export default function Mine() {
  const [me, setMe] = useState<MeData | null>(null);
  const [faq, setFaq] = useState<FaqItem[]>([]);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const [m, f] = await Promise.all([getMe(), getFaq()]);
      setMe(m);
      setFaq(f);
    } catch (e) {
      Taro.showToast({ title: (e as Error).message, icon: "none" });
    }
  }, []);

  useDidShow(() => { void load(); });

  return (
    <View>
      <View className="card" style={{ background: "#050805" }}>
        <Text className="title" style={{ color: "#f7ffe6" }}>{me?.name ?? "…"}</Text>
        <View style={{ marginTop: "8px" }}>
          <Text style={{ color: "#8c967d", fontSize: "24px" }}>{me?.member_no}</Text>
        </View>
        <View style={{ marginTop: "14px" }}>
          {me?.hasPaidEntitlement ? (
            <Text className="tag">
              {me.identity?.identity} · 有效期至 {String(me.identity?.valid_until ?? "").slice(0, 10)}
            </Text>
          ) : (
            <Text style={{ color: "#8c967d", fontSize: "24px" }}>未开通会员</Text>
          )}
        </View>
        <View style={{ marginTop: "8px" }}>
          <Text style={{ color: "#b6ff00", fontSize: "24px" }}>成长值 {me?.growthTotal ?? 0}</Text>
        </View>
      </View>

      <View className="card">
        <Text className="title">我的订单</Text>
        {(me?.orders ?? []).length === 0 && (
          <View style={{ marginTop: "10px" }}><Text className="muted">暂无订单</Text></View>
        )}
        {(me?.orders ?? []).map(o => (
          <View key={o.order_no} style={{
            display: "flex", justifyContent: "space-between",
            padding: "16px 0", borderBottom: "1px solid rgba(5,8,5,0.06)",
          }}>
            <View>
              <Text>{o.plan_name}</Text>
              <View><Text className="muted">{o.order_no}</Text></View>
            </View>
            <View style={{ textAlign: "right" }}>
              <Text>¥{(o.amount_cents / 100).toFixed(2)}</Text>
              <View><Text className="muted">{o.status}</Text></View>
            </View>
          </View>
        ))}
      </View>

      <View className="card">
        <Text className="title">常见问题</Text>
        {faq.map((f, i) => (
          <View key={i} style={{ padding: "14px 0", borderBottom: "1px solid rgba(5,8,5,0.06)" }}
            onClick={() => setOpenFaq(openFaq === i ? null : i)}>
            <Text style={{ fontWeight: 600 }}>{f.question}</Text>
            {openFaq === i && (
              <View style={{ marginTop: "8px" }}><Text className="muted">{f.answer}</Text></View>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}
