import { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, Button } from "@tarojs/components";
import Taro, { useShareAppMessage } from "@tarojs/taro";
import {
  createOrder, getCourses, getEarnings, getInvite, getMe, getMyGroup, getPlans, getTasks, payOrder,
  Course, EarningsData, GroupData, InviteData, MeData, MemberTask, Plan,
} from "../../api/mp";
import { captureInviteCode } from "../../utils/auth";
import { useTabSync } from "../../utils/tab";
import { M } from "../../theme";
import Icon from "../../components/Icon";
import Sheet from "../../components/Sheet";

/**
 * 首页（对齐设计稿 HomeTab）：问候头 + 消息铃铛 + 会员卡 + 快捷四宫格 + 课程公告轮播 +
 * 我的数据 + 服务老师（弹层联系）+ 待办任务。未开通会员时展示套餐购买（M3b Mock 支付）。
 * 所有数字均来自真实接口；通知内容由待办/排课/入群进度真实数据聚合而成。
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
  const [serviceOpen, setServiceOpen] = useState(false);
  const [notifyOpen, setNotifyOpen] = useState(false);

  useTabSync(0);

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

  // 通知：全部由真实数据聚合（待办任务 / 未结束排课 / 入群进度）
  const notifications = useMemo(() => {
    const items: string[] = [];
    if (tasks.length > 0) items.push(`你有 ${tasks.length} 项任务待完成，完成可得积分`);
    courses.forEach(c => items.push(`${c.status === "直播中" ? "正在直播" : "即将开课"}：${c.title}`));
    const a = group?.assignment;
    if (a && a.status !== "已入群") items.push(`入群进度更新：${a.group_name} 匹配对接中`);
    return items;
  }, [tasks, courses, group]);

  const directInvites = (invite?.downline ?? []).filter(d => Number(d.level) === 1).length;
  const identity = me?.identity;
  const period = identity?.valid_from && identity?.valid_until
    ? `${String(identity.valid_from).slice(0, 10).replace(/-/g, ".")} → ${String(identity.valid_until).slice(0, 10).replace(/-/g, ".")}`
    : null;
  const teacher = group?.serviceTeacher;
  const course = courses[courseIdx];

  const quickActions = [
    { label: "入群码", icon: "qr-code" as const, color: "#4f6ef7", action: () => void Taro.switchTab({ url: "/pages/group/index" }) },
    { label: "邀请好友", icon: "gift" as const, color: "#10b981", action: () => void Taro.navigateTo({ url: "/pages/invite/index" }) },
    { label: "课程直播", icon: "tv" as const, color: "#f59e0b", action: () => void Taro.navigateTo({ url: "/pages/courses/index" }) },
    { label: "我的收益", icon: "wallet" as const, color: "#ec4899", action: () => void Taro.switchTab({ url: "/pages/earnings/index" }) },
  ];

  return (
    <View className="page">
      {/* 渐变头区：问候 + 铃铛 + 会员卡 + 快捷宫格 */}
      <View className="hd" style={{ paddingBottom: "8rpx" }}>
        <View className="f-between" style={{ marginBottom: "36rpx" }}>
          <View>
            <View className="f" style={{ gap: "12rpx" }}>
              <Text style={{ fontSize: "32rpx", fontWeight: 600, color: M.text }}>
                {me ? `嗨，${me.name}` : "登录中…"}
              </Text>
              <Icon name="sparkles" size={26} color="#a78bfa" />
            </View>
            <View className="f" style={{ gap: "10rpx", marginTop: "8rpx" }}>
              <Icon name="star" size={20} color="#f59e0b" fill />
              <Text className="t-muted">
                {me
                  ? me.hasPaidEntitlement
                    ? `${identity?.identity ?? "会员"} · ${me.city ?? "未填城市"}${identity?.valid_until ? ` · 有效至 ${String(identity.valid_until).slice(0, 10)}` : ""}`
                    : `${me.member_no} · 尚未开通会员`
                  : ""}
              </Text>
            </View>
          </View>
          <View style={{ position: "relative" }} onClick={() => setNotifyOpen(true)}>
            <View className="f-center" style={{ width: "68rpx", height: "68rpx", borderRadius: "50%", background: M.surface2 }}>
              <Icon name="bell" size={32} color={M.textSec} />
            </View>
            {notifications.length > 0 && <View className="badge">{notifications.length}</View>}
          </View>
        </View>

        {/* 会员卡 */}
        <View className="card-hero" style={{ margin: "0 0 30rpx" }}>
          <View className="f-between" style={{ alignItems: "flex-start", marginBottom: "36rpx" }}>
            <View>
              <View className="f" style={{ gap: "10rpx", marginBottom: "8rpx" }}>
                <Icon name="star" size={24} color="#fbbf24" fill />
                <Text style={{ fontSize: "22rpx", fontWeight: 600, color: "#ffffff" }}>
                  {me?.hasPaidEntitlement ? `${identity?.identity ?? "会员"}` : "会员卡 · 未开通"}
                </Text>
              </View>
              <Text style={{ fontSize: "38rpx", fontWeight: 700, color: "#ffffff" }}>主理人私域会员</Text>
            </View>
            <View className="avatar avatar--card avatar--sm" style={{ borderRadius: "24rpx" }}>
              {(me?.name ?? "主").trim().charAt(0)}
            </View>
          </View>
          <View className="f-between" style={{ alignItems: "flex-end" }}>
            <View>
              <Text style={{ fontSize: "22rpx", color: "rgba(255,255,255,0.65)" }}>会员有效期</Text>
              <View style={{ marginTop: "4rpx" }}>
                <Text style={{ fontSize: "26rpx", fontWeight: 500, color: "#ffffff" }}>
                  {me?.hasPaidEntitlement ? (period ?? "—") : "未开通"}
                </Text>
              </View>
            </View>
            <View style={{ textAlign: "right" }}>
              <Text style={{ fontSize: "22rpx", color: "rgba(255,255,255,0.65)" }}>积分余额</Text>
              <View style={{ marginTop: "4rpx" }}>
                <Text style={{ fontSize: "30rpx", fontWeight: 700, color: "#ffffff" }}>
                  {(me?.pointsTotal ?? 0).toLocaleString()} 分
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* 快捷宫格 */}
        <View className="qa-grid" style={{ margin: "0" }}>
          {quickActions.map(a => (
            <View key={a.label} className="qa-tile" onClick={a.action}>
              <View className="qa-icon" style={{ background: `${a.color}22` }}>
                <Icon name={a.icon} size={32} color={a.color} />
              </View>
              <Text className="qa-label">{a.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* 课程公告轮播（真实排课；无排课不显示） */}
      {course && (
        <View className="card" style={{ marginTop: "30rpx" }} onClick={() => void Taro.navigateTo({ url: "/pages/courses/index" })}>
          <View className="f-between">
            <View className="f f-1" style={{ gap: "20rpx" }}>
              <View className="dot--pulse" />
              <View className="f-1">
                <Text className="t-body" style={{ fontWeight: 500 }}>{course.title}</Text>
                <View style={{ marginTop: "4rpx" }}>
                  <Text className="t-muted">
                    {course.speaker ? `${course.speaker} · ` : ""}
                    {String(course.scheduled_at).slice(5, 16).replace("T", " ")} · {course.status}
                  </Text>
                </View>
              </View>
            </View>
            <View className="f" style={{ gap: "10rpx" }} onClick={e => e.stopPropagation()}>
              {courses.map((_, i) => (
                <View key={i} className={i === courseIdx ? "dot dot--active" : "dot"} onClick={() => setCourseIdx(i)} />
              ))}
            </View>
          </View>
        </View>
      )}

      {/* 我的数据（真实：关系链影响力/直接邀请/可提现） */}
      <View className="section-head section-head--first">
        <Text className="section-title">我的数据</Text>
      </View>
      <View className="stat-grid">
        {[
          { label: "影响力(≤3级)", value: String(invite?.influence ?? 0), color: "#7c9aff" },
          { label: "直接邀请", value: `${directInvites} 人`, color: "#34d399" },
          { label: "可提现", value: `¥${Number(earnings?.summary.withdrawable ?? 0).toLocaleString()}`, color: "#f59e0b" },
        ].map(s => (
          <View key={s.label} className="stat-card">
            <Text className="stat-label">{s.label}</Text>
            <View>
              <Text className="stat-value" style={{ color: s.color }}>{s.value}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* 我的服务老师（本群主责客服；未分配不显示） */}
      {teacher && (
        <>
          <View className="section-head">
            <Text className="section-title">我的服务老师</Text>
          </View>
          <View className="card f" style={{ gap: "26rpx" }}>
            <View className="avatar avatar--md">{teacher.name.charAt(0)}</View>
            <View className="f-1">
              <Text className="t-strong">{teacher.name}</Text>
              <View style={{ marginTop: "6rpx" }}>
                <Text className="t-muted">
                  {teacher.service_region ? `${teacher.service_region} · ` : ""}{teacher.role}
                </Text>
              </View>
            </View>
            <View className="btn btn--primary btn--mini" onClick={() => setServiceOpen(true)}>联系</View>
          </View>
        </>
      )}

      {/* 待办任务（真实 member_task；无待办不显示） */}
      {tasks.length > 0 && (
        <>
          <View className="section-head">
            <Text className="section-title">待办事项</Text>
            <Text className="t-primary" onClick={() => void Taro.switchTab({ url: "/pages/tasks/index" })}>查看全部</Text>
          </View>
          <View className="card" style={{ paddingTop: "6rpx", paddingBottom: "6rpx" }}>
            {tasks.map(t => (
              <View key={t.id} className="row" onClick={() => void Taro.switchTab({ url: "/pages/tasks/index" })}>
                <View className="f f-1" style={{ gap: "22rpx" }}>
                  <View className="todo-dot" style={t.priority === "高" ? { borderColor: M.red } : undefined} />
                  <Text className="t-sec">{t.title}</Text>
                </View>
                <Text className="t-muted">{t.deadline ? String(t.deadline).slice(5, 10) : ""}</Text>
              </View>
            ))}
          </View>
        </>
      )}

      {/* 未开通会员：套餐购买（真实下单 + Mock 支付） */}
      {me != null && !me.hasPaidEntitlement && (
        <>
          <View className="section-head">
            <Text className="section-title">开通会员</Text>
          </View>
          <View className="card">
            {plans.map(p => (
              <View key={p.plan_code} className="row">
                <View>
                  <Text className="t-strong">{p.name}</Text>
                  <View style={{ marginTop: "4rpx" }}>
                    <Text className="t-muted">{p.grant_identity} · {p.duration_days} 天</Text>
                  </View>
                </View>
                <Button className="btn btn--primary btn--mini" loading={busy === p.plan_code} onClick={() => void buy(p)}>
                  ¥{(p.price_cents / 100).toFixed(0)} 开通
                </Button>
              </View>
            ))}
            <View style={{ marginTop: "16rpx" }}>
              <Text className="t-muted">当前为演示支付（Mock）；正式版走微信虚拟支付</Text>
            </View>
          </View>
        </>
      )}

      {/* 邀请裂变入口 */}
      <View className="card" style={{ marginTop: "6rpx" }}>
        <View className="f" style={{ gap: "12rpx" }}>
          <Icon name="gift" size={32} color="#34d399" />
          <Text className="t-title">邀请好友，一起进圈</Text>
        </View>
        <View style={{ marginTop: "10rpx" }}>
          <Text className="t-muted">好友经你的邀请码加入，你得成长值奖励</Text>
        </View>
        <View className="f" style={{ gap: "22rpx", marginTop: "28rpx" }}>
          <Button className="btn btn--gradient" style={{ flex: 1, fontSize: "28rpx", padding: "20rpx 0" }} openType="share">
            转发给好友
          </Button>
          <Button className="btn btn--ghost" style={{ flex: 1 }} onClick={() => void Taro.navigateTo({ url: "/pages/invite/index" })}>
            我的邀请
          </Button>
        </View>
      </View>

      {/* 联系服务老师弹层 */}
      {serviceOpen && teacher && (
        <Sheet title="联系服务老师" onClose={() => setServiceOpen(false)}>
          <View className="f" style={{ gap: "22rpx", marginTop: "30rpx", padding: "24rpx", borderRadius: "30rpx", background: M.surface2 }}>
            <View className="avatar avatar--sm" style={{ borderRadius: "22rpx" }}>{teacher.name.charAt(0)}</View>
            <View className="f-1">
              <Text className="t-body" style={{ fontWeight: 500 }}>{teacher.name}</Text>
              <View style={{ marginTop: "6rpx" }}>
                <Text className="t-muted">
                  {teacher.service_region ? `${teacher.service_region} · ` : ""}{teacher.role} · 专属服务
                </Text>
              </View>
            </View>
            <Icon name="headphones" size={34} color="#34d399" />
          </View>
          <View style={{ marginTop: "20rpx" }}>
            <Text className="t-muted">入群、权益、课程问题都可以在社群里 @ 老师，老师会第一时间回复。</Text>
          </View>
          <Button
            className="btn btn--primary"
            style={{ marginTop: "30rpx" }}
            onClick={() => {
              setServiceOpen(false);
              void Taro.switchTab({ url: "/pages/group/index" });
            }}
          >
            去社群找老师
          </Button>
        </Sheet>
      )}

      {/* 消息通知弹层（真实数据聚合） */}
      {notifyOpen && (
        <Sheet title="消息通知" onClose={() => setNotifyOpen(false)}>
          <View style={{ marginTop: "30rpx" }}>
            {notifications.length === 0 && (
              <View style={{ padding: "30rpx 0" }}>
                <Text className="t-muted">暂无新消息</Text>
              </View>
            )}
            {notifications.map((msg, i) => (
              <View key={msg} className="f" style={{ gap: "20rpx", padding: "22rpx", borderRadius: "24rpx", background: M.surface2, marginBottom: "16rpx", alignItems: "flex-start" }}>
                <Icon name="megaphone" size={28} color={i === 0 ? "#a78bfa" : M.primary} style={{ marginTop: "4rpx" }} />
                <Text className="t-sec f-1">{msg}</Text>
                <View style={{ width: "14rpx", height: "14rpx", borderRadius: "50%", background: M.primary, marginTop: "10rpx" }} />
              </View>
            ))}
          </View>
          <Button className="btn btn--ghost" style={{ marginTop: "20rpx" }} onClick={() => setNotifyOpen(false)}>
            知道了
          </Button>
        </Sheet>
      )}
    </View>
  );
}
