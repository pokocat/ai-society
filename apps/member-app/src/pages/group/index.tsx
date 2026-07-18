import { useCallback, useState } from "react";
import { View, Text, Image, Button } from "@tarojs/components";
import Taro, { useDidShow } from "@tarojs/taro";
import { getMyGroup, GroupData } from "../../api/mp";
import { useTabSync } from "../../utils/tab";
import { M } from "../../theme";
import Icon from "../../components/Icon";

/** 入群漏斗对外话术（内部八态 → 用户视角三段） */
function statusLabel(status: string): { label: string; hint: string } {
  if (status === "已入群") return { label: "已入群", hint: "你已在专属社群中，欢迎多多互动" };
  if (["待加好友", "已加好友", "待邀请", "已邀请"].includes(status)) {
    return { label: "客服对接中", hint: "专属客服正在添加你的微信并邀请入群，请留意好友申请" };
  }
  return { label: "匹配中", hint: "运营正在为你匹配最合适的群" };
}

/** 社群页（对齐设计稿 CommunityTab）：渐变群卡 + 容量进度条 + 入群二维码弹窗 + 服务老师。 */
export default function Group() {
  const [data, setData] = useState<GroupData | null>(null);
  const [showQR, setShowQR] = useState(false);

  useTabSync(1);

  const load = useCallback(async () => {
    try {
      setData(await getMyGroup());
    } catch (e) {
      Taro.showToast({ title: (e as Error).message, icon: "none" });
    }
  }, []);

  useDidShow(() => { void load(); });

  const a = data?.assignment;
  const st = a ? statusLabel(a.status) : null;
  const ratio = a && a.target_capacity > 0 ? Math.min(1, a.member_count / a.target_capacity) : 0;
  const nearFull = ratio >= 0.9;
  const teacher = data?.serviceTeacher;

  return (
    <View className="page">
      <View className="hd">
        <Text className="hd-title">我的社群</Text>
        <View>
          <Text className="hd-sub">
            {a ? (a.status === "已入群" ? "已加入 1 个群" : `入群进度：${st!.label}`) : "尚未分配社群"}
          </Text>
        </View>
      </View>

      {!data ? (
        <View className="card"><Text className="t-muted">加载中…</Text></View>
      ) : !a ? (
        <View className="card" style={{ textAlign: "center", padding: "70rpx 32rpx" }}>
          <Text className="t-title">{data.hasPaidEntitlement ? "正在为你匹配社群" : "开通会员后进群"}</Text>
          <View style={{ marginTop: "14rpx" }}><Text className="t-muted">{data.hint}</Text></View>
          {!data.hasPaidEntitlement && (
            <Button className="btn btn--gradient" style={{ marginTop: "40rpx" }}
              onClick={() => void Taro.switchTab({ url: "/pages/index/index" })}>
              去开通会员
            </Button>
          )}
        </View>
      ) : (
        <>
          {/* 已加入 / 进行中 群卡（渐变高亮） */}
          <View style={{ margin: "0 40rpx 10rpx" }}>
            <Text className="t-primary" style={{ fontWeight: 600, fontSize: "22rpx" }}>
              {a.status === "已入群" ? "已加入" : "为你安排的群"}
            </Text>
          </View>
          <View className="card-glow">
            <View className="f" style={{ gap: "22rpx", marginBottom: "26rpx" }}>
              <View className="avatar avatar--md">{a.group_name.charAt(0)}</View>
              <View className="f-1">
                <Text className="t-strong">{a.group_name}</Text>
                <View style={{ marginTop: "6rpx" }}>
                  <Text className="t-muted">
                    {a.member_count} 人{teacher ? ` · ${teacher.name}` : ""}
                  </Text>
                </View>
              </View>
              <Text className={a.status === "已入群" ? "tag tag--green" : "tag"}>{st!.label}</Text>
            </View>

            {/* 群容量 */}
            <View className="f-between" style={{ marginBottom: "10rpx" }}>
              <Text className="t-muted">群容量</Text>
              <Text style={{ fontSize: "22rpx", color: nearFull ? "#f87171" : M.textSec }}>
                {a.member_count}/{a.target_capacity}{nearFull ? " · 接近满群" : ""}
              </Text>
            </View>
            <View className="progress-track">
              <View
                className={nearFull ? "progress-fill progress-fill--danger" : "progress-fill"}
                style={{ width: `${Math.round(ratio * 100)}%` }}
              />
            </View>

            <View style={{ marginTop: "22rpx" }}>
              <Text className="t-muted">{st!.hint}</Text>
            </View>
            {a.joined_at && (
              <View style={{ marginTop: "6rpx" }}>
                <Text className="t-muted">入群时间：{String(a.joined_at).slice(0, 10)}</Text>
              </View>
            )}

            {data.groupQrcodeUrl && a.status !== "已入群" && (
              <Button className="btn btn--primary" style={{ marginTop: "30rpx" }} onClick={() => setShowQR(true)}>
                <Icon name="qr-code" size={30} color="#ffffff" />
                查看入群二维码
              </Button>
            )}
          </View>

          {/* 服务老师 */}
          {teacher && (
            <View className="card f" style={{ gap: "26rpx" }}>
              <View className="avatar avatar--md">{teacher.name.charAt(0)}</View>
              <View className="f-1">
                <Text className="t-strong">{teacher.name}</Text>
                <View style={{ marginTop: "6rpx" }}>
                  <Text className="t-muted">
                    {teacher.service_region ? `${teacher.service_region} · ` : ""}专属服务老师（{teacher.role}）
                  </Text>
                </View>
                <View style={{ marginTop: "6rpx" }}>
                  <Text className="t-muted">入群/服务问题都可以在群里 @ 老师</Text>
                </View>
              </View>
              <Icon name="headphones" size={34} color="#34d399" />
            </View>
          )}

          {/* 入群二维码弹窗（真实 group_qrcode） */}
          {showQR && data.groupQrcodeUrl && (
            <View className="modal-mask" catchMove onClick={() => setShowQR(false)}>
              <View className="modal-body" onClick={e => e.stopPropagation()}>
                <Text className="t-strong">{a.group_name}</Text>
                <View style={{ marginTop: "8rpx" }}>
                  <Text className="t-muted">长按识别进群</Text>
                </View>
                <View className="qr-box">
                  <Image src={data.groupQrcodeUrl} showMenuByLongpress style={{ width: "360rpx", height: "360rpx" }} />
                </View>
                <Button className="btn btn--ghost" style={{ marginTop: "30rpx" }} onClick={() => setShowQR(false)}>
                  关闭
                </Button>
              </View>
            </View>
          )}
        </>
      )}
    </View>
  );
}
