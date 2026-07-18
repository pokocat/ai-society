import { useCallback, useState } from "react";
import { View, Text, Button } from "@tarojs/components";
import Taro, { useDidShow } from "@tarojs/taro";
import { getFaq, getInvite, getMe, getProfile, FaqItem, InviteData, MeData, ProfileCard } from "../../api/mp";
import { logout } from "../../utils/auth";
import { useTabSync } from "../../utils/tab";
import { M } from "../../theme";
import Icon, { IconName } from "../../components/Icon";

const orderStatusTag: Record<string, string> = {
  已支付: "tag tag--green", 待支付: "tag tag--amber", 已退款: "tag tag--red", 已取消: "tag",
};

/** 我的页（对齐设计稿 ProfileTab）：居中档案头 + 信息卡 + 订单记录 + 图标菜单 + FAQ + 退出登录。 */
export default function Mine() {
  const [me, setMe] = useState<MeData | null>(null);
  const [profile, setProfile] = useState<ProfileCard | null>(null);
  const [invite, setInvite] = useState<InviteData | null>(null);
  const [faq, setFaq] = useState<FaqItem[]>([]);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useTabSync(4);

  const load = useCallback(async () => {
    try {
      const [m, p, inv, f] = await Promise.all([getMe(), getProfile(), getInvite(), getFaq()]);
      setMe(m);
      setProfile(p);
      setInvite(inv);
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
    void Taro.reLaunch({ url: "/pages/index/index" });
  };

  const identity = me?.identity;
  const directInvites = (invite?.downline ?? []).filter(d => Number(d.level) === 1).length;
  const infoRows: Array<[string, string]> = [
    ["微信号", profile?.wechatId ?? "—"],
    ["所在城市", profile?.city ?? "—"],
    ["会员等级", me?.hasPaidEntitlement ? (identity?.identity ?? "会员") : "未开通"],
    ["入会时间", profile?.created_at ? String(profile.created_at).slice(0, 10) : "—"],
    ["来源渠道", profile?.source_channel ?? "—"],
    ["推荐人", profile?.referrer ? profile.referrer.name : "—"],
  ];

  const menus: Array<{ label: string; sub: string; icon: IconName; action: () => void }> = [
    {
      label: "我的邀请", icon: "heart",
      sub: directInvites > 0 ? `已邀请 ${directInvites} 人 · 关系树 · 成长值` : "邀请码 · 关系树 · 成长值",
      action: () => void Taro.navigateTo({ url: "/pages/invite/index" }),
    },
    { label: "课程与直播", sub: "课表 · 回放", icon: "tv", action: () => void Taro.navigateTo({ url: "/pages/courses/index" }) },
    { label: "我的社群", sub: "入群进度 · 服务老师", icon: "users", action: () => void Taro.switchTab({ url: "/pages/group/index" }) },
  ];

  return (
    <View className="page">
      {/* 居中档案头（渐变头区） */}
      <View className="hd" style={{ textAlign: "center", paddingTop: "56rpx" }}>
        <View className="avatar avatar--lg" style={{ margin: "0 auto" }}>
          {(me?.name ?? "主").trim().charAt(0)}
        </View>
        <View style={{ marginTop: "24rpx" }}>
          <Text style={{ fontSize: "36rpx", fontWeight: 700, color: "#ffffff" }}>{me?.name ?? "…"}</Text>
        </View>
        <View style={{ marginTop: "10rpx" }}>
          <Text className="t-muted">
            {me?.member_no}{profile?.phone ? ` · ${profile.phone}` : ""}{profile?.city ? ` · ${profile.city}` : ""}
          </Text>
        </View>
        <View className="f-center" style={{ gap: "16rpx", marginTop: "24rpx", flexWrap: "wrap" }}>
          {me?.hasPaidEntitlement ? (
            <View className="tag">
              <Icon name="star" size={18} color="#7c9aff" fill />
              {identity?.identity ?? "会员"}
              {identity?.valid_until ? ` · 至 ${String(identity.valid_until).slice(0, 10)}` : ""}
            </View>
          ) : (
            <Text className="tag tag--gray">未开通会员</Text>
          )}
          <Text className="tag tag--amber">积分 {(me?.pointsTotal ?? 0).toLocaleString()}</Text>
          <Text className="tag tag--green">成长值 {(me?.growthTotal ?? 0).toLocaleString()}</Text>
        </View>
      </View>

      {/* 信息卡（全部真实字段，缺失显示 —） */}
      <View className="card" style={{ paddingTop: "6rpx", paddingBottom: "6rpx" }}>
        {infoRows.map(([k, v]) => (
          <View key={k} className="row">
            <Text className="t-muted" style={{ fontSize: "24rpx" }}>{k}</Text>
            <Text className="t-body" style={{ fontWeight: 500 }}>{v}</Text>
          </View>
        ))}
      </View>

      {/* 订单记录 */}
      <View className="section-head">
        <Text className="section-title">订单记录</Text>
      </View>
      <View className="card" style={{ paddingTop: "6rpx", paddingBottom: "6rpx" }}>
        {(me?.orders ?? []).length === 0 && (
          <View style={{ padding: "30rpx 0" }}><Text className="t-muted">暂无订单</Text></View>
        )}
        {(me?.orders ?? []).map(o => (
          <View key={o.order_no} className="row">
            <View className="f f-1" style={{ gap: "20rpx" }}>
              <View className="li-icon" style={{ background: "rgba(79,110,247,0.15)" }}>
                <Icon name="package" size={26} color="#7c9aff" />
              </View>
              <View className="f-1">
                <Text className="t-body">{o.plan_name}</Text>
                <View style={{ marginTop: "6rpx" }}>
                  <Text className="t-muted">{o.paid_at ? String(o.paid_at).slice(0, 10) : o.order_no}</Text>
                </View>
              </View>
            </View>
            <View style={{ textAlign: "right" }}>
              <Text style={{ fontSize: "28rpx", fontWeight: 700, color: "#34d399" }}>
                ¥{(o.amount_cents / 100).toFixed(2)}
              </Text>
              <View style={{ marginTop: "6rpx" }}>
                <Text className={orderStatusTag[o.status] ?? "tag"}>{o.status}</Text>
              </View>
            </View>
          </View>
        ))}
      </View>

      {/* 图标菜单 */}
      <View style={{ margin: "6rpx 40rpx 0" }}>
        {menus.map(m => (
          <View
            key={m.label}
            className="f"
            onClick={m.action}
            style={{ gap: "22rpx", background: M.surface2, borderRadius: "30rpx", padding: "26rpx 28rpx", marginBottom: "16rpx" }}
          >
            <Icon name={m.icon} size={34} color="#7c9aff" />
            <View className="f-1">
              <Text className="t-body" style={{ fontWeight: 500 }}>{m.label}</Text>
              <View style={{ marginTop: "4rpx" }}><Text className="t-muted">{m.sub}</Text></View>
            </View>
            <Icon name="chevron-right" size={30} color={M.muted} />
          </View>
        ))}
      </View>

      {/* 常见问题 */}
      {faq.length > 0 && (
        <>
          <View className="section-head">
            <View className="f" style={{ gap: "10rpx" }}>
              <Icon name="help-circle" size={28} color="#7c9aff" />
              <Text className="section-title">常见问题</Text>
            </View>
          </View>
          <View className="card" style={{ paddingTop: "6rpx", paddingBottom: "6rpx" }}>
            {faq.map((f, i) => (
              <View
                key={i}
                style={{ padding: "22rpx 0", borderBottom: i < faq.length - 1 ? `1rpx solid ${M.border}` : "none" }}
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
              >
                <View className="f-between">
                  <Text className="t-body" style={{ fontWeight: 600 }}>{f.question}</Text>
                  <Icon name="chevron-right" size={26} color={M.muted} style={{ transform: openFaq === i ? "rotate(90deg)" : "none" }} />
                </View>
                {openFaq === i && (
                  <View style={{ marginTop: "12rpx" }}><Text className="t-sec">{f.answer}</Text></View>
                )}
              </View>
            ))}
          </View>
        </>
      )}

      {/* 退出登录 */}
      <View style={{ margin: "20rpx 40rpx 0" }}>
        <Button className="btn btn--danger" onClick={() => void doLogout()}>
          <Icon name="log-out" size={28} color="#f87171" />
          退出登录
        </Button>
      </View>
    </View>
  );
}
