import { useCallback, useState } from "react";
import { View, Text, Button } from "@tarojs/components";
import Taro, { useDidShow } from "@tarojs/taro";
import { getFaq, getMe, getProfile, FaqItem, MeData, ProfileCard } from "../../api/mp";
import { logout } from "../../utils/auth";

const orderStatusTag: Record<string, string> = {
  已支付: "tag tag-green", 待支付: "tag tag-amber", 已退款: "tag tag-red", 已取消: "tag",
};

/** 我的页（对齐设计稿 ProfileTab）：档案头 + 信息卡 + 订单记录 + 菜单 + FAQ + 退出登录。 */
export default function Mine() {
  const [me, setMe] = useState<MeData | null>(null);
  const [profile, setProfile] = useState<ProfileCard | null>(null);
  const [faq, setFaq] = useState<FaqItem[]>([]);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const [m, p, f] = await Promise.all([getMe(), getProfile(), getFaq()]);
      setMe(m);
      setProfile(p);
      setFaq(f);
    } catch (e) {
      Taro.showToast({ title: (e as Error).message, icon: "none" });
    }
  }, []);

  useDidShow(() => { void load(); });

  const doLogout = async () => {
    const r = await Taro.showModal({ title: "退出登录", content: "确定要退出当前账号吗？", confirmText: "退出" });
    if (!r.confirm) return;
    logout();
    Taro.reLaunch({ url: "/pages/index/index" });
  };

  const identity = me?.identity;
  const infoRows: Array<[string, string]> = [
    ["微信号", profile?.wechatId ?? "—"],
    ["所在城市", profile?.city ?? "—"],
    ["会员等级", me?.hasPaidEntitlement ? (identity?.identity ?? "会员") : "未开通"],
    ["入会时间", profile?.created_at ? String(profile.created_at).slice(0, 10) : "—"],
    ["来源渠道", profile?.source_channel ?? "—"],
    ["推荐人", profile?.referrer ? profile.referrer.name : "—"],
  ];

  return (
    <View style={{ paddingBottom: "32px" }}>
      {/* 档案头 */}
      <View style={{ padding: "48px 24px 8px", textAlign: "center" }}>
        <View style={{
          width: "140px", height: "140px", borderRadius: "44px", margin: "0 auto",
          background: "linear-gradient(135deg, #4361ee, #7c3aed)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Text style={{ fontSize: "56px", fontWeight: 700, color: "#ffffff" }}>
            {(me?.name ?? "主").trim().charAt(0)}
          </Text>
        </View>
        <View style={{ marginTop: "20px" }}>
          <Text style={{ fontSize: "36px", fontWeight: 700, color: "#ffffff" }}>{me?.name ?? "…"}</Text>
        </View>
        <View style={{ marginTop: "8px" }}>
          <Text className="muted">
            {me?.member_no}{profile?.phone ? ` · ${profile.phone}` : ""}{profile?.city ? ` · ${profile.city}` : ""}
          </Text>
        </View>
        <View style={{ display: "flex", justifyContent: "center", gap: "16px", marginTop: "18px" }}>
          {me?.hasPaidEntitlement ? (
            <Text className="tag">
              ★ {identity?.identity ?? "会员"}
              {identity?.valid_until ? ` · 至 ${String(identity.valid_until).slice(0, 10)}` : ""}
            </Text>
          ) : (
            <Text className="tag" style={{ background: "rgba(100,116,139,0.25)", color: "#94a3b8" }}>未开通会员</Text>
          )}
          <Text className="tag tag-amber">积分 {(me?.pointsTotal ?? 0).toLocaleString()}</Text>
          <Text className="tag tag-green">成长值 {(me?.growthTotal ?? 0).toLocaleString()}</Text>
        </View>
      </View>

      {/* 信息卡（全部真实字段，缺失显示 —） */}
      <View className="card" style={{ paddingTop: "8px", paddingBottom: "8px" }}>
        {infoRows.map(([k, v]) => (
          <View key={k} className="row">
            <Text className="sec">{k}</Text>
            <Text style={{ fontSize: "26px", fontWeight: 500, color: "#e2e8f0" }}>{v}</Text>
          </View>
        ))}
      </View>

      {/* 订单记录 */}
      <Text className="section-title">订单记录</Text>
      <View className="card" style={{ paddingTop: "8px", paddingBottom: "8px" }}>
        {(me?.orders ?? []).length === 0 && (
          <View style={{ padding: "24px 0" }}><Text className="muted">暂无订单</Text></View>
        )}
        {(me?.orders ?? []).map(o => (
          <View key={o.order_no} className="row">
            <View>
              <Text style={{ fontSize: "28px", color: "#e2e8f0" }}>{o.plan_name}</Text>
              <View style={{ marginTop: "6px" }}>
                <Text className="muted">
                  {o.paid_at ? String(o.paid_at).slice(0, 10) : o.order_no}
                </Text>
              </View>
            </View>
            <View style={{ textAlign: "right" }}>
              <Text style={{ fontSize: "28px", fontWeight: 700, color: "#34d399" }}>
                ¥{(o.amount_cents / 100).toFixed(2)}
              </Text>
              <View style={{ marginTop: "6px" }}>
                <Text className={orderStatusTag[o.status] ?? "tag"}>{o.status}</Text>
              </View>
            </View>
          </View>
        ))}
      </View>

      {/* 菜单 */}
      <View style={{ margin: "20px 24px" }}>
        {[
          { label: "我的邀请", sub: "邀请码 · 关系树 · 成长值", action: () => Taro.navigateTo({ url: "/pages/invite/index" }) },
          { label: "课程与直播", sub: "课表 · 回放", action: () => Taro.navigateTo({ url: "/pages/courses/index" }) },
          { label: "我的社群", sub: "入群进度 · 服务老师", action: () => Taro.switchTab({ url: "/pages/group/index" }) },
        ].map(m => (
          <View key={m.label} onClick={m.action} style={{
            background: "#1a2640", borderRadius: "24px", padding: "26px 28px", marginBottom: "16px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <View>
              <Text style={{ fontSize: "28px", fontWeight: 500, color: "#e2e8f0" }}>{m.label}</Text>
              <View style={{ marginTop: "4px" }}><Text className="muted">{m.sub}</Text></View>
            </View>
            <Text className="muted">›</Text>
          </View>
        ))}
      </View>

      {/* 常见问题 */}
      {faq.length > 0 && (
        <>
          <Text className="section-title">常见问题</Text>
          <View className="card" style={{ paddingTop: "8px", paddingBottom: "8px" }}>
            {faq.map((f, i) => (
              <View key={i} style={{ padding: "20px 0", borderBottom: i < faq.length - 1 ? "1px solid rgba(255,255,255,0.07)" : "none" }}
                onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                <Text style={{ fontSize: "26px", fontWeight: 600, color: "#e2e8f0" }}>{f.question}</Text>
                {openFaq === i && (
                  <View style={{ marginTop: "10px" }}><Text className="sec">{f.answer}</Text></View>
                )}
              </View>
            ))}
          </View>
        </>
      )}

      {/* 退出登录 */}
      <View style={{ margin: "28px 24px 0" }}>
        <Button onClick={() => void doLogout()} style={{
          width: "100%", padding: "18px 0", borderRadius: "24px", fontSize: "28px",
          background: "rgba(239,68,68,0.1)", color: "#f87171",
          border: "1px solid rgba(239,68,68,0.25)",
        }}>
          退出登录
        </Button>
      </View>
    </View>
  );
}
