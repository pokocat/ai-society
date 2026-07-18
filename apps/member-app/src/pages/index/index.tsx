import { useCallback, useEffect, useState } from "react";
import { View, Text, Button } from "@tarojs/components";
import Taro, { useShareAppMessage } from "@tarojs/taro";
import {
  createOrder, getCourses, getEarnings, getInvite, getMe, getMyGroup, getPlans, getTasks, payOrder,
  Course, EarningsData, GroupData, InviteData, MeData, MemberTask, Plan,
} from "../../api/mp";
import { captureInviteCode } from "../../utils/auth";

/**
 * 首页（对齐设计稿 HomeTab）：问候头 + 会员卡（有效期/积分）+ 快捷四宫格 + 课程公告 +
 * 本月数据 + 我的服务老师 + 待办任务。未开通会员时展示套餐购买（M3b Mock 支付）。
 * 所有数字均来自真实接口，无占位假数据。
 */
export default function Index() {
  const [me, setMe] = useState<MeData | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [invite, setInvite] = useState<InviteData | null>(null);
  const [earnings, setEarnings] = useState<EarningsData | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [tasks, setTasks] = useState<MemberTask[]>([]);
  const [group, setGroup] = useState<GroupData | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [courseIdx, setCourseIdx] = useState(0);

  const load = useCallback(async () => {
    try {
      const [m, inv, e, c, t, g] = await Promise.all([
        getMe(), getInvite(), getEarnings(), getCourses(), getTasks(), getMyGroup(),
      ]);
      setMe(m);
      setInvite(inv);
      setEarnings(e);
      setCourses(c.filter(x => x.status !== "已结束").slice(0, 3));
      setCourseIdx(0);
      setTasks(t.filter(x => !x.done).slice(0, 3));
      setGroup(g);
      if (!m.hasPaidEntitlement) setPlans(await getPlans());
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
    path: invite?.sharePath ?? "/pages/index/index",
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

  const directInvites = (invite?.downline ?? []).filter(d => Number(d.level) === 1).length;
  const identity = me?.identity;
  const period = identity?.valid_from && identity?.valid_until
    ? `${String(identity.valid_from).slice(0, 10)} → ${String(identity.valid_until).slice(0, 10)}`
    : null;
  const teacher = group?.serviceTeacher;

  return (
    <View style={{ paddingBottom: "32px" }}>
      {/* 问候头 */}
      <View style={{ padding: "32px 24px 0" }}>
        <Text style={{ fontSize: "34px", fontWeight: 600, color: "#e2e8f0" }}>
          {me ? `嗨，${me.name}` : "登录中…"}
        </Text>
        <View style={{ marginTop: "6px" }}>
          <Text className="muted">
            {me
              ? me.hasPaidEntitlement
                ? `${identity?.identity ?? "会员"} · ${me.city ?? "未填城市"}${identity?.valid_until ? ` · 有效至 ${String(identity.valid_until).slice(0, 10)}` : ""}`
                : `${me.member_no} · 尚未开通会员`
              : ""}
          </Text>
        </View>
      </View>

      {/* 会员卡 */}
      <View className="card-hero">
        <View style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <View>
            <Text style={{ fontSize: "22px", fontWeight: 600, color: "#ffffff" }}>
              {me?.hasPaidEntitlement ? `★ ${identity?.identity ?? "会员"}` : "会员卡"}
            </Text>
            <View style={{ marginTop: "8px" }}>
              <Text style={{ fontSize: "38px", fontWeight: 700, color: "#ffffff" }}>主理人私域会员</Text>
            </View>
          </View>
          <View style={{
            width: "80px", height: "80px", borderRadius: "28px", background: "rgba(255,255,255,0.2)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Text style={{ fontSize: "36px", fontWeight: 700, color: "#ffffff" }}>
              {(me?.name ?? "主").trim().charAt(0)}
            </Text>
          </View>
        </View>
        <View style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: "36px" }}>
          <View>
            <Text style={{ fontSize: "22px", color: "rgba(255,255,255,0.65)" }}>会员有效期</Text>
            <View>
              <Text style={{ fontSize: "26px", fontWeight: 500, color: "#ffffff" }}>
                {me?.hasPaidEntitlement ? (period ?? "—") : "未开通"}
              </Text>
            </View>
          </View>
          <View style={{ textAlign: "right" }}>
            <Text style={{ fontSize: "22px", color: "rgba(255,255,255,0.65)" }}>积分余额</Text>
            <View>
              <Text style={{ fontSize: "30px", fontWeight: 700, color: "#ffffff" }}>
                {(me?.pointsTotal ?? 0).toLocaleString()} 分
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* 快捷四宫格 */}
      <View style={{ display: "flex", gap: "16px", margin: "0 24px" }}>
        {[
          { label: "入群码", emoji: "🔗", action: () => Taro.switchTab({ url: "/pages/group/index" }) },
          { label: "邀请好友", emoji: "🎁", action: () => Taro.navigateTo({ url: "/pages/invite/index" }) },
          { label: "课程直播", emoji: "📺", action: () => Taro.navigateTo({ url: "/pages/courses/index" }) },
          { label: "我的收益", emoji: "💰", action: () => Taro.switchTab({ url: "/pages/earnings/index" }) },
        ].map(a => (
          <View key={a.label} onClick={a.action} style={{
            flex: 1, background: "#1a2640", borderRadius: "24px", padding: "24px 0",
            display: "flex", flexDirection: "column", alignItems: "center", gap: "10px",
          }}>
            <Text style={{ fontSize: "34px" }}>{a.emoji}</Text>
            <Text style={{ fontSize: "22px", color: "#94a3b8" }}>{a.label}</Text>
          </View>
        ))}
      </View>

      {/* 课程/直播公告（真实排课数据；无排课则不显示） */}
      {courses.length > 0 && courses[courseIdx] && (
        <View className="card" onClick={() => Taro.navigateTo({ url: "/pages/courses/index" })}>
          <View style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <View style={{ display: "flex", alignItems: "center", gap: "14px", flex: 1, minWidth: 0 }}>
              <View style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#4361ee", flexShrink: 0 }} />
              <View style={{ minWidth: 0 }}>
                <Text style={{ fontSize: "26px", fontWeight: 500, color: "#e2e8f0" }}>
                  {courses[courseIdx].title}
                </Text>
                <View>
                  <Text className="muted">
                    {courses[courseIdx].speaker ? `${courses[courseIdx].speaker} · ` : ""}
                    {String(courses[courseIdx].scheduled_at).slice(5, 16).replace("T", " ")} · {courses[courseIdx].status}
                  </Text>
                </View>
              </View>
            </View>
            <View style={{ display: "flex", gap: "8px", flexShrink: 0 }} onClick={e => e.stopPropagation()}>
              {courses.map((_, i) => (
                <View key={i} onClick={() => setCourseIdx(i)} style={{
                  width: "12px", height: "12px", borderRadius: "50%",
                  background: i === courseIdx ? "#4361ee" : "rgba(255,255,255,0.15)",
                }} />
              ))}
            </View>
          </View>
        </View>
      )}

      {/* 我的数据（全部真实：关系链影响力/直接邀请/可提现） */}
      <Text className="section-title">我的数据</Text>
      <View style={{ display: "flex", gap: "16px", margin: "16px 24px 0" }}>
        {[
          { label: "影响力(≤3级)", value: String(invite?.influence ?? 0), color: "#7c9aff" },
          { label: "直接邀请", value: `${directInvites} 人`, color: "#34d399" },
          { label: "可提现", value: `¥${Number(earnings?.summary.withdrawable ?? 0).toLocaleString()}`, color: "#f59e0b" },
        ].map(s => (
          <View key={s.label} style={{ flex: 1, background: "#1a2640", borderRadius: "24px", padding: "22px 20px" }}>
            <Text className="muted">{s.label}</Text>
            <View style={{ marginTop: "8px" }}>
              <Text style={{ fontSize: "30px", fontWeight: 700, color: s.color }}>{s.value}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* 我的服务老师（来自本群主责客服；未分配群/未配置则不显示） */}
      {teacher && (
        <>
          <Text className="section-title">我的服务老师</Text>
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
                  {teacher.service_region ? `${teacher.service_region} · ` : ""}{teacher.role}
                </Text>
              </View>
            </View>
            <Button className="btn-primary" size="mini"
              onClick={() => Taro.switchTab({ url: "/pages/group/index" })}>
              联系
            </Button>
          </View>
        </>
      )}

      {/* 待办任务（真实 member_task；全部完成/无任务则不显示） */}
      {tasks.length > 0 && (
        <>
          <View style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "28px 24px 4px" }}>
            <Text style={{ fontSize: "28px", fontWeight: 600, color: "#e2e8f0" }}>待办任务</Text>
            <Text style={{ fontSize: "24px", color: "#7c9aff" }}
              onClick={() => Taro.switchTab({ url: "/pages/tasks/index" })}>
              查看全部
            </Text>
          </View>
          <View className="card" style={{ paddingTop: "8px", paddingBottom: "8px" }}>
            {tasks.map(t => (
              <View key={t.id} className="row" onClick={() => Taro.switchTab({ url: "/pages/tasks/index" })}>
                <View style={{ display: "flex", alignItems: "center", gap: "18px", flex: 1, minWidth: 0 }}>
                  <View style={{
                    width: "28px", height: "28px", borderRadius: "50%", flexShrink: 0,
                    border: `3px solid ${t.priority === "高" ? "#ef4444" : "#64748b"}`,
                  }} />
                  <Text style={{ fontSize: "26px", color: "#94a3b8" }}>{t.title}</Text>
                </View>
                <Text className="muted">{t.deadline ? String(t.deadline).slice(5, 10) : ""}</Text>
              </View>
            ))}
          </View>
        </>
      )}

      {/* 未开通会员：套餐购买（真实下单+Mock 支付） */}
      {me != null && !me.hasPaidEntitlement && (
        <>
          <Text className="section-title">开通会员</Text>
          <View className="card">
            {plans.map(p => (
              <View key={p.plan_code} className="row">
                <View>
                  <Text style={{ fontSize: "28px", fontWeight: 600, color: "#e2e8f0" }}>{p.name}</Text>
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
        </>
      )}

      {/* 邀请入口 */}
      <View className="card">
        <Text className="title">邀请好友，一起进圈</Text>
        <View style={{ marginTop: "8px" }}>
          <Text className="muted">好友经你的邀请码加入，你得成长值奖励</Text>
        </View>
        <View style={{ display: "flex", gap: "16px", marginTop: "24px" }}>
          <Button className="btn-gradient" style={{ flex: 1 }} openType="share">转发给好友</Button>
          <Button className="btn-ghost" style={{ flex: 1 }}
            onClick={() => Taro.navigateTo({ url: "/pages/invite/index" })}>
            我的邀请
          </Button>
        </View>
      </View>
    </View>
  );
}
