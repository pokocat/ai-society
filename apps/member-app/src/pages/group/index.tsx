import { useCallback, useState } from "react";
import { View, Text, Image, Button } from "@tarojs/components";
import Taro, { useDidShow } from "@tarojs/taro";
import { getMyGroup, GroupData } from "../../api/mp";

/** 入群漏斗对外话术（内部八态 → 用户视角三段） */
function statusLabel(status: string): { label: string; hint: string } {
  if (status === "已入群") return { label: "已入群", hint: "你已在专属社群中，欢迎多多互动" };
  if (["待加好友", "已加好友", "待邀请", "已邀请"].includes(status)) {
    return { label: "客服对接中", hint: "专属客服正在添加你的微信并邀请入群，请留意好友申请" };
  }
  return { label: "匹配中", hint: "运营正在为你匹配最合适的群" };
}

/** 社群页（对齐设计稿 CommunityTab）：群卡 + 容量进度条 + 入群二维码弹窗 + 服务老师。 */
export default function Group() {
  const [data, setData] = useState<GroupData | null>(null);
  const [showQR, setShowQR] = useState(false);

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
    <View style={{ paddingBottom: "32px" }}>
      <View style={{ padding: "32px 24px 0" }}>
        <Text style={{ fontSize: "38px", fontWeight: 700, color: "#e2e8f0" }}>我的社群</Text>
        <View style={{ marginTop: "6px" }}>
          <Text className="muted">
            {a ? (a.status === "已入群" ? "已加入 1 个群" : `入群进度：${st!.label}`) : "尚未分配社群"}
          </Text>
        </View>
      </View>

      {!data ? (
        <View className="card"><Text className="muted">加载中…</Text></View>
      ) : !a ? (
        <View className="card" style={{ textAlign: "center", padding: "60px 32px" }}>
          <Text className="title">{data.hasPaidEntitlement ? "正在为你匹配社群" : "开通会员后进群"}</Text>
          <View style={{ marginTop: "12px" }}><Text className="muted">{data.hint}</Text></View>
          {!data.hasPaidEntitlement && (
            <Button className="btn-gradient" style={{ marginTop: "32px" }}
              onClick={() => Taro.switchTab({ url: "/pages/index/index" })}>
              去开通会员
            </Button>
          )}
        </View>
      ) : (
        <>
          {/* 群卡（渐变高亮） */}
          <View style={{
            margin: "20px 24px", borderRadius: "32px", padding: "32px",
            background: "linear-gradient(135deg, rgba(67,97,238,0.22), rgba(124,58,237,0.15))",
            border: "1px solid rgba(67,97,238,0.35)",
          }}>
            <View style={{ display: "flex", alignItems: "center", gap: "22px" }}>
              <View style={{
                width: "88px", height: "88px", borderRadius: "28px", flexShrink: 0,
                background: "linear-gradient(135deg, #4361ee, #7c3aed)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Text style={{ fontSize: "36px", fontWeight: 700, color: "#ffffff" }}>
                  {a.group_name.charAt(0)}
                </Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontSize: "30px", fontWeight: 600, color: "#e2e8f0" }}>{a.group_name}</Text>
                <View style={{ marginTop: "6px" }}>
                  <Text className="muted">
                    {a.member_count} 人{teacher ? ` · ${teacher.name}` : ""}
                  </Text>
                </View>
              </View>
              <Text className={a.status === "已入群" ? "tag tag-green" : "tag"}>{st!.label}</Text>
            </View>

            {/* 群容量 */}
            <View style={{ display: "flex", justifyContent: "space-between", margin: "26px 0 10px" }}>
              <Text className="muted">群容量</Text>
              <Text style={{ fontSize: "24px", color: nearFull ? "#f87171" : "#94a3b8" }}>
                {a.member_count}/{a.target_capacity}{nearFull ? " · 接近满群" : ""}
              </Text>
            </View>
            <View className="progress-track">
              <View className="progress-fill" style={{
                width: `${Math.round(ratio * 100)}%`,
                background: nearFull
                  ? "linear-gradient(90deg, #4361ee, #ef4444)"
                  : "linear-gradient(90deg, #4361ee, #10b981)",
              }} />
            </View>

            <View style={{ marginTop: "18px" }}>
              <Text className="muted">{st!.hint}</Text>
            </View>
            {a.joined_at && (
              <View style={{ marginTop: "6px" }}>
                <Text className="muted">入群时间：{String(a.joined_at).slice(0, 10)}</Text>
              </View>
            )}

            {data.groupQrcodeUrl && a.status !== "已入群" && (
              <Button className="btn-primary" style={{ marginTop: "26px", width: "100%" }}
                onClick={() => setShowQR(true)}>
                查看入群二维码
              </Button>
            )}
          </View>

          {/* 服务老师 */}
          {teacher && (
            <View className="card" style={{ display: "flex", alignItems: "center", gap: "24px" }}>
              <View style={{
                width: "88px", height: "88px", borderRadius: "28px", flexShrink: 0,
                background: "linear-gradient(135deg, #4361ee, #7c3aed)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Text style={{ fontSize: "36px", fontWeight: 700, color: "#ffffff" }}>{teacher.name.charAt(0)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: "30px", fontWeight: 600, color: "#e2e8f0" }}>{teacher.name}</Text>
                <View style={{ marginTop: "6px" }}>
                  <Text className="muted">
                    {teacher.service_region ? `${teacher.service_region} · ` : ""}专属服务老师（{teacher.role}）
                  </Text>
                </View>
                <View style={{ marginTop: "6px" }}>
                  <Text className="muted">入群/服务问题都可以在群里 @ 老师</Text>
                </View>
              </View>
            </View>
          )}

          {/* 入群二维码弹窗（真实 group_qrcode） */}
          {showQR && data.groupQrcodeUrl && (
            <View onClick={() => setShowQR(false)} style={{
              position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 50,
              background: "rgba(4,8,18,0.82)", display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <View onClick={e => e.stopPropagation()} style={{
                background: "#1a2640", borderRadius: "40px", padding: "44px", margin: "0 60px", textAlign: "center",
              }}>
                <Text style={{ fontSize: "30px", fontWeight: 600, color: "#e2e8f0" }}>{a.group_name}</Text>
                <View style={{ marginTop: "8px" }}>
                  <Text className="muted">长按识别进群</Text>
                </View>
                <View style={{ background: "#ffffff", borderRadius: "24px", padding: "20px", marginTop: "28px" }}>
                  <Image src={data.groupQrcodeUrl} showMenuByLongpress
                    style={{ width: "360px", height: "360px" }} />
                </View>
                <Button className="btn-ghost" style={{ marginTop: "28px", width: "100%" }}
                  onClick={() => setShowQR(false)}>
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
