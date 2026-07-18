import { useCallback, useEffect, useState } from "react";
import { View, Text, Button } from "@tarojs/components";
import Taro, { useDidShow, useShareAppMessage } from "@tarojs/taro";
import { getInvite, InviteData } from "../../api/mp";

/** 裂变主页：专属邀请码 + 转发 + 下线树（≤3 级）+ 成长值。 */
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

  return (
    <View style={{ paddingBottom: "32px" }}>
      <View className="card-hero" style={{ textAlign: "center" }}>
        <Text style={{ color: "rgba(255,255,255,0.65)", fontSize: "24px" }}>我的专属邀请码（7 天自动轮换）</Text>
        <View style={{ margin: "24px 0" }}>
          <Text style={{ color: "#ffffff", fontSize: "56px", fontWeight: 700, letterSpacing: "4px" }}>
            {data?.inviteCode ?? "…"}
          </Text>
        </View>
        <View style={{ display: "flex", gap: "16px" }}>
          <Button style={{
            flex: 1, background: "rgba(255,255,255,0.92)", color: "#4361ee",
            fontWeight: 700, borderRadius: "24px", fontSize: "28px", border: "none",
          }} openType="share">
            转发邀请
          </Button>
          <Button style={{
            flex: 1, background: "rgba(255,255,255,0.16)", color: "#ffffff",
            borderRadius: "24px", fontSize: "28px", border: "1px solid rgba(255,255,255,0.35)",
          }} onClick={copyCode}>
            复制邀请码
          </Button>
        </View>
        {data?.qrcodeMock && (
          <View style={{ marginTop: "20px" }}>
            <Text style={{ color: "rgba(255,255,255,0.55)", fontSize: "22px" }}>
              专属小程序码将在正式版提供（当前演示环境）
            </Text>
          </View>
        )}
      </View>

      <View className="card" style={{ display: "flex", justifyContent: "space-around", textAlign: "center" }}>
        <View>
          <Text className="title" style={{ color: "#7c9aff" }}>{data?.influence ?? 0}</Text>
          <View><Text className="muted">覆盖人数（≤3级）</Text></View>
        </View>
        <View>
          <Text className="title" style={{ color: "#34d399" }}>{byLevel(1).length}</Text>
          <View><Text className="muted">直接邀请</Text></View>
        </View>
        <View>
          <Text className="title" style={{ color: "#f59e0b" }}>{data?.inviteGrowth ?? 0}</Text>
          <View><Text className="muted">邀请成长值</Text></View>
        </View>
      </View>

      <View className="card">
        <Text className="title">我的邀请树</Text>
        {[1, 2, 3].map(level => {
          const rows = byLevel(level);
          if (!rows.length) return null;
          return (
            <View key={level} style={{ marginTop: "18px" }}>
              <Text className="tag">LV{level} · {rows.length} 人</Text>
              {rows.map(d => (
                <View key={d.member_no} style={{
                  display: "flex", justifyContent: "space-between",
                  padding: "16px 0", paddingLeft: `${(level - 1) * 28}px`,
                  borderBottom: "1px solid rgba(255,255,255,0.07)",
                }}>
                  <Text style={{ color: "#e2e8f0", fontSize: "28px" }}>{d.name}</Text>
                  <Text className="muted">
                    {d.city ?? ""}{d.direct_downline > 0 ? ` · 又邀 ${d.direct_downline} 人` : ""}
                  </Text>
                </View>
              ))}
            </View>
          );
        })}
        {(data?.downline ?? []).length === 0 && (
          <View style={{ marginTop: "16px" }}>
            <Text className="muted">还没有邀请记录——转发给第一位好友吧</Text>
          </View>
        )}
      </View>

      <View className="card" style={{ background: "transparent", border: "none" }}>
        <Text className="muted">
          邀请奖励为成长值/会员时长等虚拟权益，不涉及现金返利；关系链最多记录三级，仅用于归因统计。
        </Text>
      </View>
    </View>
  );
}
