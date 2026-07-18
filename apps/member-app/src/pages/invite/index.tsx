import { useCallback, useEffect, useState } from "react";
import { View, Text, Button } from "@tarojs/components";
import Taro, { useDidShow, useShareAppMessage } from "@tarojs/taro";
import { getInvite, InviteData } from "../../api/mp";
import { M } from "../../theme";
import Icon from "../../components/Icon";

/** 裂变主页：专属邀请码（渐变主卡）+ 转发/复制 + 三级下线树 + 成长值。数据全部真实（referral_edge）。 */
export default function Invite() {
  const [data, setData] = useState<InviteData | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await getInvite());
    } catch (e) {
      Taro.showToast({ title: (e as Error).message, icon: "none" });
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useDidShow(() => { void load(); });

  useShareAppMessage(() => ({
    title: "我在主理人公社，邀你一起进圈子",
    path: data?.sharePath ?? "/pages/index/index",
  }));

  const copyCode = () => {
    if (!data) return;
    void Taro.setClipboardData({ data: data.inviteCode });
  };

  const byLevel = (level: number) => (data?.downline ?? []).filter(d => Number(d.level) === level);
  const levelColor = ["#7c9aff", "#34d399", "#f59e0b"];

  return (
    <View className="page page--sub" style={{ paddingTop: "30rpx" }}>
      {/* 邀请码主卡 */}
      <View className="card-hero" style={{ textAlign: "center" }}>
        <View>
          <View className="f-center" style={{ gap: "10rpx" }}>
            <Icon name="gift" size={26} color="rgba(255,255,255,0.75)" />
            <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: "24rpx" }}>我的专属邀请码（7 天自动轮换）</Text>
          </View>
          <View style={{ margin: "26rpx 0" }}>
            <Text style={{ color: "#ffffff", fontSize: "56rpx", fontWeight: 700, letterSpacing: "6rpx" }}>
              {data?.inviteCode ?? "…"}
            </Text>
          </View>
          <View className="f" style={{ gap: "20rpx" }}>
            <Button
              className="btn"
              style={{ flex: 1, background: "rgba(255,255,255,0.92)", color: "#4361ee", fontWeight: 700 }}
              openType="share"
            >
              <Icon name="share-2" size={26} color="#4361ee" />
              转发邀请
            </Button>
            <Button
              className="btn"
              style={{ flex: 1, background: "rgba(255,255,255,0.16)", color: "#ffffff", border: "1rpx solid rgba(255,255,255,0.35)" }}
              onClick={copyCode}
            >
              <Icon name="copy" size={26} color="#ffffff" />
              复制邀请码
            </Button>
          </View>
          {data?.qrcodeMock && (
            <View style={{ marginTop: "22rpx" }}>
              <Text style={{ color: "rgba(255,255,255,0.55)", fontSize: "20rpx" }}>
                专属小程序码将在正式版提供（当前演示环境）
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* 三项统计 */}
      <View className="stat-grid">
        {[
          { label: "覆盖人数(≤3级)", value: String(data?.influence ?? 0), color: "#7c9aff" },
          { label: "直接邀请", value: String(byLevel(1).length), color: "#34d399" },
          { label: "邀请成长值", value: String(data?.inviteGrowth ?? 0), color: "#f59e0b" },
        ].map(s => (
          <View key={s.label} className="stat-card" style={{ textAlign: "center" }}>
            <View>
              <Text className="stat-value" style={{ color: s.color, marginTop: 0 }}>{s.value}</Text>
            </View>
            <View style={{ marginTop: "8rpx" }}>
              <Text className="stat-label">{s.label}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* 邀请树 */}
      <View className="card">
        <View className="f" style={{ gap: "12rpx" }}>
          <Icon name="users" size={30} color="#7c9aff" />
          <Text className="t-title">我的邀请树</Text>
        </View>
        {[1, 2, 3].map(level => {
          const rows = byLevel(level);
          if (!rows.length) return null;
          return (
            <View key={level} style={{ marginTop: "22rpx" }}>
              <Text className="tag" style={{ background: `${levelColor[level - 1]}22`, color: levelColor[level - 1] }}>
                LV{level} · {rows.length} 人
              </Text>
              {rows.map(d => (
                <View
                  key={d.member_no}
                  className="f-between"
                  style={{
                    padding: "18rpx 0",
                    paddingLeft: `${(level - 1) * 30}rpx`,
                    borderBottom: `1rpx solid ${M.border}`,
                  }}
                >
                  <View className="f" style={{ gap: "16rpx" }}>
                    <View
                      className="f-center"
                      style={{
                        width: "52rpx", height: "52rpx", borderRadius: "18rpx",
                        background: `${levelColor[level - 1]}22`,
                        color: levelColor[level - 1], fontSize: "24rpx", fontWeight: 600,
                      }}
                    >
                      {d.name.trim().charAt(0)}
                    </View>
                    <Text className="t-body">{d.name}</Text>
                  </View>
                  <Text className="t-muted">
                    {d.city ?? ""}{d.direct_downline > 0 ? ` · 又邀 ${d.direct_downline} 人` : ""}
                  </Text>
                </View>
              ))}
            </View>
          );
        })}
        {(data?.downline ?? []).length === 0 && (
          <View style={{ marginTop: "18rpx" }}>
            <Text className="t-muted">还没有邀请记录——转发给第一位好友吧</Text>
          </View>
        )}
      </View>

      <View style={{ margin: "0 40rpx" }}>
        <Text className="t-muted">
          邀请奖励为成长值/会员时长等虚拟权益，不涉及现金返利；关系链最多记录三级，仅用于归因统计。
        </Text>
      </View>
    </View>
  );
}
