import { useState } from "react";
import { Plus, X, ArrowRight, Zap, Settings, ChevronRight, Link, Search, Filter, RefreshCw } from "lucide-react";

const L = {
  bg: "#0d1629", surface: "#131f35", border: "rgba(255,255,255,0.07)", borderLight: "rgba(255,255,255,0.04)",
  primary: "#4361ee", primaryBg: "rgba(67,97,238,0.15)", text: "#e2e8f0", textSec: "#94a3b8",
  muted: "#64748b", mutedLight: "#475569", surface2: "#1a2640",
};

// ─── 模拟数据 ─────────────────────────────────────────────────
const channels = [
  { id: 1, platform: "微信小店", emoji: "🛍️", name: "主理人官方小店", accountId: "fenglema_shop",
    boundPersonal: "fengle_bj_01", boundWecom: "主理人企微-吴思远",
    monthlyTraffic: 1240, conversionRate: "8.3%", status: "已绑定",
    ruleDesc: "购买后→按城市匹配→对应PRO群（同步企微）", lastSync: "07-05 09:12" },
  { id: 2, platform: "抖音", emoji: "🎵", name: "@fenglema_official", accountId: "fenglema_douyin",
    boundPersonal: "fengle_sh_01", boundWecom: "主理人企微-林小燕",
    monthlyTraffic: 3680, conversionRate: "4.7%", status: "已绑定",
    ruleDesc: "评论区引流→加个人微信→体验官群（不同步企微）", lastSync: "07-05 08:00" },
  { id: 3, platform: "小红书", emoji: "📕", name: "fenglema_life", accountId: "fenglema_xhs",
    boundPersonal: "fengle_sz_01", boundWecom: "—",
    monthlyTraffic: 920, conversionRate: "6.2%", status: "已绑定",
    ruleDesc: "笔记评论→加微信→游客群→后续转PRO", lastSync: "07-04 22:30" },
  { id: 4, platform: "公众号", emoji: "📢", name: "主理人官方", accountId: "gh_fenglema",
    boundPersonal: "fengle_bj_01", boundWecom: "全员企微群",
    monthlyTraffic: 2100, conversionRate: "12.4%", status: "已绑定",
    ruleDesc: "关注后欢迎语→按城市分配→游客群", lastSync: "07-05 10:00" },
  { id: 5, platform: "视频号", emoji: "🎬", name: "主理人视频", accountId: "fenglema_channels",
    boundPersonal: "fengle_bj_01", boundWecom: "主理人企微-吴思远",
    monthlyTraffic: 560, conversionRate: "5.8%", status: "已绑定",
    ruleDesc: "直播间下单→自动添加微信→PRO群（同步企微）", lastSync: "07-05 11:00" },
  { id: 6, platform: "知乎", emoji: "🔵", name: "主理人创始人", accountId: "fenglema_zhihu",
    boundPersonal: "fengle_bj_01", boundWecom: "—",
    monthlyTraffic: 340, conversionRate: "9.1%", status: "待配置",
    ruleDesc: "暂未配置分配规则", lastSync: "—" },
  { id: 7, platform: "小红书", emoji: "📕", name: "fenglema_pro", accountId: "fenglema_pro_xhs",
    boundPersonal: "fengle_hz_01", boundWecom: "—",
    monthlyTraffic: 210, conversionRate: "7.4%", status: "已绑定",
    ruleDesc: "PRO干货笔记→加微信→PRO会员群", lastSync: "07-03 16:00" },
];

const assignRules = [
  { id: 1, name: "抖音购买PRO会员", trigger: "来源：抖音 + 订单金额 ≥ 2980元",
    wechat: "按城市匹配对应个人微信", group: "对应城市 PRO 会员群", wecom: "同步企业微信", priority: 1, active: true },
  { id: 2, name: "小红书引流体验营", trigger: "来源：小红书 + 标签含「体验营」",
    wechat: "fengle_sz_01", group: "深圳体验官群01", wecom: "不同步企微", priority: 2, active: true },
  { id: 3, name: "公众号新关注用户", trigger: "来源：公众号关注 + 无历史订单",
    wechat: "按城市匹配个人微信", group: "对应城市游客群", wecom: "不同步企微", priority: 3, active: true },
  { id: 4, name: "视频号直播间购买", trigger: "来源：视频号直播 + 任意购买",
    wechat: "fengle_bj_01", group: "北京PRO会员群01", wecom: "同步企业微信", priority: 4, active: true },
  { id: 5, name: "微信小店代理授权", trigger: "来源：微信小店 + 商品类型=代理",
    wechat: "按城市匹配对应微信", group: "对应城市代理群", wecom: "同步企业微信", priority: 5, active: true },
  { id: 6, name: "知乎专栏引流", trigger: "来源：知乎 + 填写意向表单",
    wechat: "fengle_bj_01", group: "北京游客群01", wecom: "不同步企微", priority: 6, active: false },
];

const trafficLog = [
  { time: "07-05 14:23", user: "李云天", phone: "138****4567", source: "抖音", sourceDetail: "视频《私域运营秘诀》评论区",
    assignedWeChat: "fengle_bj_01", assignedGroup: "北京PRO会员群01", wecomSync: true, ruleHit: "抖音购买PRO会员" },
  { time: "07-05 13:45", user: "张晓红", phone: "139****4568", source: "小红书", sourceDetail: "fenglema_life 笔记《健康分享》",
    assignedWeChat: "fengle_sh_01", assignedGroup: "上海游客群01", wecomSync: false, ruleHit: "小红书引流体验营" },
  { time: "07-05 11:20", user: "王建国", phone: "158****4569", source: "微信小店", sourceDetail: "代理授权套餐下单",
    assignedWeChat: "fengle_gz_01", assignedGroup: "广州代理群01", wecomSync: true, ruleHit: "微信小店代理授权" },
  { time: "07-05 10:00", user: "陈美玲", phone: "137****4570", source: "公众号", sourceDetail: "主理人官方 · 关注引流",
    assignedWeChat: "fengle_cd_01", assignedGroup: "成都分站群01", wecomSync: false, ruleHit: "公众号新关注用户" },
  { time: "07-04 18:30", user: "赵志远", phone: "186****4571", source: "视频号", sourceDetail: "直播回放《7月城市合伙人》",
    assignedWeChat: "fengle_sz_01", assignedGroup: "深圳代理群01", wecomSync: true, ruleHit: "视频号直播间购买" },
  { time: "07-04 16:00", user: "孙伟明", phone: "152****4572", source: "小红书", sourceDetail: "fenglema_pro 笔记《PRO干货》",
    assignedWeChat: "fengle_hz_01", assignedGroup: "杭州会员群01", wecomSync: false, ruleHit: "小红书引流体验营" },
  { time: "07-04 14:12", user: "刘晓峰", phone: "138****5432", source: "抖音", sourceDetail: "视频《社群运营》点击橱窗",
    assignedWeChat: "fengle_bj_01", assignedGroup: "北京体验官群01", wecomSync: true, ruleHit: "抖音购买PRO会员" },
  { time: "07-04 09:30", user: "赵雨晴", phone: "139****4321", source: "公众号", sourceDetail: "主理人官方 · 文章引流",
    assignedWeChat: "fengle_sh_01", assignedGroup: "上海游客群01", wecomSync: false, ruleHit: "公众号新关注用户" },
];

const platformColors: Record<string, { bg: string; color: string; border: string }> = {
  "微信小店": { bg: "rgba(16,185,129,0.15)", color: "#34d399", border: "rgba(16,185,129,0.3)" },
  "抖音":     { bg: "#fce7f3", color: "#9d174d", border: "#fbcfe8" },
  "小红书":   { bg: "rgba(239,68,68,0.15)", color: "#f87171", border: "rgba(239,68,68,0.3)" },
  "公众号":   { bg: "rgba(16,185,129,0.15)", color: "#34d399", border: "rgba(16,185,129,0.3)" },
  "视频号":   { bg: "rgba(67,97,238,0.15)", color: "#818cf8", border: "rgba(67,97,238,0.3)" },
  "知乎":     { bg: "rgba(67,97,238,0.15)", color: "#818cf8", border: "rgba(67,97,238,0.3)" },
};

// ─── 渠道绑定 Tab ─────────────────────────────────────────────
function ChannelsTab() {
  const [selected, setSelected] = useState<number | null>(null);
  const detail = channels.find(c => c.id === selected);

  return (
    <div className="flex gap-4 flex-1 min-h-0">
      <div className="flex-1 flex flex-col gap-3">
        {/* Header stats */}
        <div className="grid grid-cols-4 gap-3 flex-shrink-0">
          {[
            { label: "已绑定渠道", value: channels.filter(c => c.status === "已绑定").length, color: "#34d399", bg: "rgba(16,185,129,0.15)" },
            { label: "待配置", value: channels.filter(c => c.status === "待配置").length, color: "#fbbf24", bg: "rgba(245,158,11,0.15)" },
            { label: "本月总流量", value: channels.reduce((s, c) => s + c.monthlyTraffic, 0).toLocaleString(), color: "#4361ee", bg: "rgba(67,97,238,0.12)" },
            { label: "平均转化率", value: "6.8%", color: "#059669", bg: "rgba(16,185,129,0.15)" },
          ].map(s => (
            <div key={s.label} className="rounded-xl px-4 py-3" style={{ background: L.surface, border: `1px solid ${L.border}` }}>
              <div className="text-xs" style={{ color: L.muted }}>{s.label}</div>
              <div className="text-xl font-bold mt-0.5" style={{ color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Channel cards */}
        <div className="grid grid-cols-2 gap-3 overflow-auto flex-1 content-start pb-2">
          {channels.map(c => {
            const pc = platformColors[c.platform] || { bg: "rgba(100,116,139,0.15)", color: "#94a3b8", border: "rgba(100,116,139,0.3)" };
            const isSelected = selected === c.id;
            return (
              <div
                key={c.id}
                className="rounded-xl p-4 cursor-pointer transition-all"
                style={{ background: isSelected ? L.primaryBg : L.surface, border: isSelected ? `1px solid ${L.primary}` : `1px solid ${L.border}`, boxShadow: isSelected ? "0 0 0 2px rgba(67,97,238,0.1)" : "none" }}
                onClick={() => setSelected(isSelected ? null : c.id)}
              >
                {/* 平台 + 状态 */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xl" style={{ background: pc.bg, border: `1px solid ${pc.border}` }}>
                      {c.emoji}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold" style={{ color: pc.color }}>{c.platform}</span>
                        <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ background: c.status === "已绑定" ? "rgba(16,185,129,0.15)" : "rgba(245,158,11,0.15)", color: c.status === "已绑定" ? "#34d399" : "#fbbf24" }}>{c.status}</span>
                      </div>
                      <div className="text-xs mt-0.5 font-medium" style={{ color: L.text }}>{c.name}</div>
                    </div>
                  </div>
                </div>

                {/* 数据 */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="rounded-lg px-2.5 py-2 text-center" style={{ background: L.bg }}>
                    <div className="text-sm font-bold" style={{ color: L.primary }}>{c.monthlyTraffic.toLocaleString()}</div>
                    <div className="text-xs" style={{ color: L.muted }}>月流量</div>
                  </div>
                  <div className="rounded-lg px-2.5 py-2 text-center" style={{ background: L.bg }}>
                    <div className="text-sm font-bold" style={{ color: "#059669" }}>{c.conversionRate}</div>
                    <div className="text-xs" style={{ color: L.muted }}>转化率</div>
                  </div>
                </div>

                {/* 绑定信息 */}
                <div className="space-y-1.5 pt-2.5" style={{ borderTop: `1px solid ${L.borderLight}` }}>
                  <div className="flex items-center gap-2 text-xs">
                    <span style={{ color: L.muted }}>个人微信：</span>
                    <span className="font-medium" style={{ color: "#4361ee" }}>{c.boundPersonal}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span style={{ color: L.muted }}>企业微信：</span>
                    <span style={{ color: c.boundWecom === "—" ? L.mutedLight : "#94a3b8" }}>{c.boundWecom}</span>
                  </div>
                  <div className="flex items-start gap-2 text-xs">
                    <span style={{ color: L.muted, flexShrink: 0 }}>分配规则：</span>
                    <span style={{ color: c.status === "已绑定" ? L.textSec : "#fbbf24" }}>{c.ruleDesc}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-2.5">
                  <span className="text-xs" style={{ color: L.mutedLight }}>同步 {c.lastSync}</span>
                  <button className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg" style={{ background: L.primaryBg, color: L.primary }} onClick={e => e.stopPropagation()}>
                    <Settings size={11} /> 配置规则
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detail panel */}
      {detail && (
        <div className="w-72 flex-shrink-0 rounded-xl flex flex-col overflow-hidden" style={{ background: L.surface, border: `1px solid ${L.border}` }}>
          <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" style={{ borderBottom: `1px solid ${L.border}` }}>
            <span className="text-sm font-semibold" style={{ color: L.text }}>渠道详情</span>
            <button onClick={() => setSelected(null)}><X size={14} style={{ color: L.muted }} /></button>
          </div>
          <div className="flex-1 overflow-auto p-4 space-y-4">
            <div className="text-center py-4 rounded-xl" style={{ background: L.bg }}>
              <div className="text-4xl mb-2">{detail.emoji}</div>
              <div className="text-sm font-semibold" style={{ color: L.text }}>{detail.name}</div>
              <div className="text-xs mt-0.5" style={{ color: L.muted }}>{detail.platform} · {detail.accountId}</div>
              <span className="mt-2 inline-block px-2.5 py-0.5 rounded-full text-xs font-medium" style={{ background: detail.status === "已绑定" ? "rgba(16,185,129,0.15)" : "rgba(245,158,11,0.15)", color: detail.status === "已绑定" ? "#34d399" : "#fbbf24" }}>{detail.status}</span>
            </div>

            {/* Flow diagram */}
            <div className="space-y-2">
              <div className="text-xs font-medium mb-2" style={{ color: L.primary }}>流量分配路径</div>
              {[
                { label: "流量来源", value: `${detail.platform} · ${detail.name}`, color: (platformColors[detail.platform] || { color: L.muted }).color },
                { label: "绑定个人微信", value: detail.boundPersonal, color: "#059669" },
                { label: "绑定企业微信", value: detail.boundWecom, color: "#4361ee" },
              ].map((r, i, arr) => (
                <div key={r.label}>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: L.bg, border: `1px solid ${L.border}` }}>
                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: r.color }}>{i + 1}</div>
                    <div>
                      <div className="text-xs" style={{ color: L.muted }}>{r.label}</div>
                      <div className="text-xs font-medium" style={{ color: L.text }}>{r.value}</div>
                    </div>
                  </div>
                  {i < arr.length - 1 && (
                    <div className="flex justify-center my-1"><ArrowRight size={14} style={{ color: L.mutedLight, transform: "rotate(90deg)" }} /></div>
                  )}
                </div>
              ))}
              <div className="flex justify-center my-1"><ArrowRight size={14} style={{ color: L.mutedLight, transform: "rotate(90deg)" }} /></div>
              <div className="px-3 py-2 rounded-xl" style={{ background: "rgba(67,97,238,0.12)", border: "1px solid rgba(99,102,241,0.25)" }}>
                <div className="text-xs" style={{ color: L.muted }}>分配规则</div>
                <div className="text-xs font-medium mt-0.5" style={{ color: L.primary }}>{detail.ruleDesc}</div>
              </div>
            </div>

            {[["本月流量", detail.monthlyTraffic.toLocaleString()], ["转化率", detail.conversionRate], ["最近同步", detail.lastSync]].map(([k, v]) => (
              <div key={k} className="flex justify-between py-1.5" style={{ borderBottom: `1px solid ${L.borderLight}` }}>
                <span className="text-xs" style={{ color: L.muted }}>{k}</span>
                <span className="text-xs font-medium" style={{ color: L.text }}>{v}</span>
              </div>
            ))}
          </div>
          <div className="p-4 flex flex-col gap-2 flex-shrink-0" style={{ borderTop: `1px solid ${L.border}` }}>
            <button className="w-full py-2 rounded-lg text-xs text-white font-medium" style={{ background: "linear-gradient(135deg, #4361ee, #3451d1)" }}>编辑绑定配置</button>
            <div className="grid grid-cols-2 gap-2">
              <button className="py-2 rounded-lg text-xs font-medium" style={{ background: L.bg, border: `1px solid ${L.border}`, color: L.textSec }}>
                <RefreshCw size={11} className="inline mr-1" />手动同步
              </button>
              <button className="py-2 rounded-lg text-xs font-medium" style={{ background: L.primaryBg, color: L.primary }}>查看流量</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 分配规则 Tab ─────────────────────────────────────────────
function RulesTab() {
  const [showNew, setShowNew] = useState(false);
  return (
    <div className="flex-1 overflow-auto space-y-3">
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="text-xs" style={{ color: L.muted }}>已配置 {assignRules.length} 条规则，按优先级顺序执行</div>
        <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs text-white font-medium" style={{ background: "linear-gradient(135deg, #4361ee, #3451d1)" }} onClick={() => setShowNew(!showNew)}>
          <Plus size={13} /> 新增规则
        </button>
      </div>

      {/* New rule form */}
      {showNew && (
        <div className="rounded-xl p-4" style={{ background: "rgba(67,97,238,0.08)", border: "2px dashed #4361ee" }}>
          <div className="text-sm font-semibold mb-3" style={{ color: L.primary }}>新增分配规则</div>
          <div className="grid grid-cols-2 gap-3">
            {[["规则名称","如：抖音体验营购买"],["触发条件","来源 + 标签/金额"],["绑定个人微信","选择微信号"],["分配到群组","选择群组"],["企业微信同步","同步/不同步"]].map(([l, p]) => (
              <div key={l}>
                <label className="block text-xs mb-1" style={{ color: L.muted }}>{l}</label>
                <input className="w-full px-3 py-2 rounded-lg text-xs outline-none" style={{ background: "#fff", border: `1px solid #c7d2fe`, color: L.text }} placeholder={p} />
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <button className="px-3 py-2 rounded-lg text-xs" style={{ background: "#fff", border: `1px solid ${L.border}`, color: L.textSec }} onClick={() => setShowNew(false)}>取消</button>
            <button className="px-4 py-2 rounded-lg text-xs text-white font-medium" style={{ background: "linear-gradient(135deg, #4361ee, #3451d1)" }}>保存规则</button>
          </div>
        </div>
      )}

      {assignRules.map((rule, idx) => (
        <div key={rule.id} className="rounded-xl p-4" style={{ background: L.surface, border: `1px solid ${L.border}` }}>
          <div className="flex items-start gap-4">
            {/* Priority */}
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0 mt-0.5" style={{ background: rule.active ? "linear-gradient(135deg, #4361ee, #3451d1)" : "#d1d5db" }}>
              {rule.priority}
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-sm font-semibold" style={{ color: L.text }}>{rule.name}</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: rule.active ? "rgba(16,185,129,0.15)" : "rgba(100,116,139,0.15)", color: rule.active ? "#34d399" : "#94a3b8" }}>
                  {rule.active ? "已启用" : "已停用"}
                </span>
              </div>

              {/* Flow */}
              <div className="flex items-center gap-2 flex-wrap">
                {[
                  { label: "触发条件", value: rule.trigger, color: "rgba(245,158,11,0.15)", textColor: "#fbbf24" },
                  { label: "→ 个人微信", value: rule.wechat, color: "rgba(16,185,129,0.15)", textColor: "#34d399" },
                  { label: "→ 分配群组", value: rule.group, color: "rgba(67,97,238,0.15)", textColor: "#4361ee" },
                  { label: "→ 企业微信", value: rule.wecom, color: rule.wecom === "同步企业微信" ? "rgba(3,105,161,0.2)" : "rgba(100,116,139,0.15)", textColor: rule.wecom === "同步企业微信" ? "#0369a1" : "#94a3b8" },
                ].map(step => (
                  <div key={step.label} className="px-2.5 py-1.5 rounded-xl text-xs" style={{ background: step.color }}>
                    <div style={{ color: step.textColor, fontSize: "10px", opacity: 0.8 }}>{step.label}</div>
                    <div style={{ color: step.textColor, fontWeight: 500 }}>{step.value}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2 flex-shrink-0">
              <button className="px-2.5 py-1.5 rounded-lg text-xs" style={{ background: L.bg, border: `1px solid ${L.border}`, color: L.muted }}>编辑</button>
              <button className="px-2.5 py-1.5 rounded-lg text-xs font-medium" style={{ background: rule.active ? "rgba(239,68,68,0.15)" : "rgba(16,185,129,0.15)", color: rule.active ? "#f87171" : "#34d399" }}>
                {rule.active ? "停用" : "启用"}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── 流量日志 Tab ─────────────────────────────────────────────
function TrafficLogTab() {
  const sourcePlatform: Record<string, string> = { "抖音": "🎵", "小红书": "📕", "微信小店": "🛍️", "公众号": "📢", "视频号": "🎬" };

  return (
    <div className="flex-1 rounded-xl overflow-hidden flex flex-col" style={{ background: L.surface, border: `1px solid ${L.border}` }}>
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" style={{ borderBottom: `1px solid ${L.border}`, background: "#1a2640" }}>
        <div className="flex items-center gap-2">
          <Zap size={14} style={{ color: L.primary }} />
          <span className="text-sm font-semibold" style={{ color: L.text }}>实时流量分配日志</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{ background: "#fff", border: `1px solid ${L.border}` }}>
            <Search size={12} style={{ color: L.muted }} />
            <input className="bg-transparent outline-none text-xs w-32" style={{ color: L.textSec }} placeholder="搜索用户、渠道..." />
          </div>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs" style={{ background: "#fff", border: `1px solid ${L.border}`, color: L.muted }}>
            <Filter size={12} /> 筛选
          </button>
        </div>
      </div>

      {/* Table header */}
      <div className="flex items-center px-4 py-2.5 text-xs font-medium flex-shrink-0" style={{ background: "#1a2640", borderBottom: `1px solid ${L.border}`, color: L.muted }}>
        {([["时间",80],["用户",90],["手机",110],["来源渠道",220],["分配个人微信",140],["分配群组",160],["企微同步",80],["命中规则",160]] as [string,number][]).map(([l,w]) => (
          <div key={l} className="flex-shrink-0" style={{ width: w }}>{l}</div>
        ))}
      </div>

      <div className="flex-1 overflow-auto">
        {trafficLog.map((log, idx) => (
          <div key={idx} className="flex items-center px-4 py-3 text-xs transition-all" style={{ background: idx % 2 === 0 ? "#131f35" : "#1a2640", borderBottom: `1px solid ${L.borderLight}` }}>
            <div className="flex-shrink-0" style={{ width: 80, color: L.muted }}>{log.time}</div>
            <div className="flex-shrink-0 font-medium" style={{ width: 90, color: L.text }}>{log.user}</div>
            <div className="flex-shrink-0" style={{ width: 110, color: L.muted }}>{log.phone}</div>
            <div className="flex-shrink-0" style={{ width: 220 }}>
              <div className="flex items-center gap-1.5">
                <span>{sourcePlatform[log.source] || "🌐"}</span>
                <div>
                  <span className="font-medium" style={{ color: L.textSec }}>{log.source}</span>
                  <div style={{ color: L.mutedLight, fontSize: "10px" }}>{log.sourceDetail}</div>
                </div>
              </div>
            </div>
            <div className="flex-shrink-0" style={{ width: 140, color: "#4361ee" }}>{log.assignedWeChat}</div>
            <div className="flex-shrink-0" style={{ width: 160, color: L.textSec }}>{log.assignedGroup}</div>
            <div className="flex-shrink-0" style={{ width: 80 }}>
              <span className="px-1.5 py-0.5 rounded-full text-xs font-medium" style={{ background: log.wecomSync ? "rgba(16,185,129,0.15)" : "rgba(100,116,139,0.15)", color: log.wecomSync ? "#34d399" : "#94a3b8" }}>
                {log.wecomSync ? "已同步" : "未同步"}
              </span>
            </div>
            <div className="flex-shrink-0" style={{ width: 160 }}>
              <span className="px-2 py-0.5 rounded-full text-xs" style={{ background: L.primaryBg, color: L.primary }}>{log.ruleHit}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="px-4 py-3 flex-shrink-0" style={{ borderTop: `1px solid ${L.border}`, background: "#1a2640" }}>
        <span className="text-xs" style={{ color: L.muted }}>共 {trafficLog.length} 条记录（今日）</span>
      </div>
    </div>
  );
}

// ─── 主组件 ───────────────────────────────────────────────────
const tabs = ["渠道绑定", "分配规则", "流量日志"];

export default function ChannelFlow() {
  const [activeTab, setActiveTab] = useState("渠道绑定");

  return (
    <div className="p-6 h-full flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between flex-shrink-0">
        <div>
          <h2 className="font-semibold" style={{ color: L.text }}>渠道流量与分配</h2>
          <p className="text-xs mt-0.5" style={{ color: L.muted }}>
            绑定各媒体渠道账号（微信小店/抖音/小红书等），配置用户从不同渠道进来后的自动分配规则
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-xl flex-shrink-0" style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)", color: "#34d399" }}>
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          实时同步中
        </div>
      </div>

      {/* 架构说明 */}
      <div className="rounded-xl p-4 flex items-start gap-4 flex-shrink-0" style={{ background: "#f0f9ff", border: "1px solid #bae6fd" }}>
        <Link size={16} style={{ color: "#0284c7", marginTop: 1, flexShrink: 0 }} />
        <div className="flex-1">
          <div className="text-xs font-semibold mb-1" style={{ color: "#0284c7" }}>渠道流量分配流程</div>
          <div className="flex items-center gap-2 flex-wrap text-xs">
            {["媒体账号发布内容", "用户点击/购买/关注", "系统识别来源渠道", "匹配分配规则", "分配到对应个人微信", "加入对应微信群", "同步企业微信（可选）"].map((s, i, arr) => (
              <div key={s} className="flex items-center gap-2">
                <span className="px-2 py-1 rounded-lg" style={{ background: "rgba(3,105,161,0.2)", color: "#0369a1" }}>{s}</span>
                {i < arr.length - 1 && <ArrowRight size={12} style={{ color: "#0284c7" }} />}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 rounded-xl flex-shrink-0 w-fit" style={{ background: L.bg, border: `1px solid ${L.border}` }}>
        {tabs.map(t => (
          <button
            key={t}
            className="px-5 py-2 rounded-lg text-xs font-medium transition-all"
            style={{ background: activeTab === t ? "#1a2640" : "transparent", color: activeTab === t ? L.primary : L.muted, boxShadow: activeTab === t ? "0 1px 3px rgba(0,0,0,0.08)" : "none" }}
            onClick={() => setActiveTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "渠道绑定" && <ChannelsTab />}
      {activeTab === "分配规则" && <RulesTab />}
      {activeTab === "流量日志" && <TrafficLogTab />}
    </div>
  );
}
