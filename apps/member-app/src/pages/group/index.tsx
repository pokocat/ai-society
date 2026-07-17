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

export default function Group() {
  const [data, setData] = useState<GroupData | null>(null);

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

  return (
    <View>
      {!data ? (
        <View className="card"><Text className="muted">加载中…</Text></View>
      ) : !a ? (
        <View className="card" style={{ textAlign: "center" }}>
          <Text className="title">{data.hasPaidEntitlement ? "正在为你匹配社群" : "开通会员后进群"}</Text>
          <View style={{ marginTop: "12px" }}><Text className="muted">{data.hint}</Text></View>
          {!data.hasPaidEntitlement && (
            <Button className="btn-primary" style={{ marginTop: "24px" }}
              onClick={() => Taro.switchTab({ url: "/pages/index/index" })}>
              去开通会员
            </Button>
          )}
        </View>
      ) : (
        <>
          <View className="card">
            <View style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Text className="title">{a.group_name}</Text>
              <Text className="tag">{st!.label}</Text>
            </View>
            <View style={{ marginTop: "10px" }}>
              <Text className="muted">{a.member_count}/{a.target_capacity} 人 · {st!.hint}</Text>
            </View>
            {a.joined_at && (
              <View style={{ marginTop: "6px" }}>
                <Text className="muted">入群时间：{String(a.joined_at).slice(0, 10)}</Text>
              </View>
            )}
          </View>
          {data.groupQrcodeUrl && a.status !== "已入群" && (
            <View className="card" style={{ textAlign: "center" }}>
              <Text className="muted">也可以扫码直接加入</Text>
              <Image src={data.groupQrcodeUrl} style={{ width: "320px", height: "320px", marginTop: "16px" }} />
            </View>
          )}
        </>
      )}
    </View>
  );
}
