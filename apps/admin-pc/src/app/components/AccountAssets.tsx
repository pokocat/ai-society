import { useState } from "react";
import { Search, Plus, AlertTriangle, X, Phone, Mail, MessageCircle, Globe, ChevronDown, Filter, ExternalLink, Upload, CreditCard, Eye, EyeOff, CheckCircle } from "lucide-react";

const S = { surface: "#ffffff", border: "rgba(5,8,5,0.14)", borderLight: "rgba(5,8,5,0.1)", muted: "#68705a", bg: "#ffffff", primary: "#b6ff00", primaryBg: "rgba(182,255,0,0.24)", text: "#050805", textSec: "#2f3a29", surface2: "#f7ffd9" };

// ─── 模拟数据 ───────────────────────────────────────────────
const phones = [
  { id: 1, number: "138-0012-3456", carrier: "中国移动", region: "北京市朝阳区",  idOwner: "吴思远", idNumber: "110105198801011234", idFront: true,  idBack: true,  assignedTo: "吴思远", assignedProject: "北京PRO服务",    registrations: ["微信 fengle_bj_01", "支付宝"],           manager: "吴思远",         status: "使用中", risk: "normal",   note: "北京主号" },
  { id: 2, number: "139-0012-3457", carrier: "中国联通", region: "上海市浦东新区", idOwner: "林小燕", idNumber: "310115199203154321", idFront: true,  idBack: true,  assignedTo: "林小燕", assignedProject: "上海体验官服务",  registrations: ["微信 fengle_sh_01", "抖音 @fenglema_sh"], manager: "林小燕",         status: "使用中", risk: "normal",   note: "上海主号" },
  { id: 3, number: "138-0012-3458", carrier: "中国移动", region: "广州市天河区",  idOwner: "刘刚",   idNumber: "440106199507223456", idFront: true,  idBack: false, assignedTo: "刘刚",   assignedProject: "广州代理培训",    registrations: ["微信 fengle_gz_01"],                     manager: "刘刚",           status: "异常",   risk: "high",     note: "30天未登录微信，身份证背面未上传" },
  { id: 4, number: "152-0012-3461", carrier: "中国电信", region: "成都市武侯区",  idOwner: "赵志远", idNumber: "510104199212075678", idFront: true,  idBack: true,  assignedTo: "赵志远", assignedProject: "成都分站",         registrations: ["微信 fengle_cd_01"],                     manager: "赵志远（待交接）", status: "待交接", risk: "warning",  note: "人员离职，待交接" },
  { id: 5, number: "186-0012-3462", carrier: "中国移动", region: "深圳市南山区",  idOwner: "李梦华", idNumber: "440305199409186789", idFront: true,  idBack: true,  assignedTo: "李梦华", assignedProject: "深圳代理",          registrations: ["微信 fengle_sz_01"],                     manager: "李梦华",         status: "使用中", risk: "normal",   note: "深圳主号" },
  { id: 6, number: "135-0012-3463", carrier: "中国联通", region: "待分配",        idOwner: "—",      idNumber: "—",                 idFront: false, idBack: false, assignedTo: "—",      assignedProject: "—",                registrations: [],                                        manager: "—",              status: "空闲",   risk: "normal",   note: "备用号，身份证信息待补充" },
  { id: 7, number: "158-0012-3464", carrier: "中国移动", region: "杭州市西湖区",  idOwner: "陈明",   idNumber: "330106199305280123", idFront: true,  idBack: true,  assignedTo: "陈明",   assignedProject: "杭州分站",          registrations: ["微信 fengle_hz_01"],                     manager: "陈明",           status: "使用中", risk: "normal",   note: "杭州主号" },
];

const wechats = [
  { id: 1, wechatId: "fengle_bj_01", boundPhone: "138-0012-3456", friendCount: 487, groups: ["北京PRO会员群01", "北京PRO会员群02", "北京体验官备用群"], manager: "吴思远", project: "北京PRO服务", status: "使用中", risk: "normal", lastLogin: "2026-07-05" },
  { id: 2, wechatId: "fengle_sh_01", boundPhone: "139-0012-3457", friendCount: 356, groups: ["上海PRO会员群01", "上海游客群01"], manager: "林小燕", project: "上海体验官", status: "使用中", risk: "normal", lastLogin: "2026-07-05" },
  { id: 3, wechatId: "fengle_gz_01", boundPhone: "138-0012-3458", friendCount: 234, groups: ["广州代理群01"], manager: "刘刚", project: "广州代理培训", status: "异常", risk: "high", lastLogin: "2026-06-05" },
  { id: 4, wechatId: "fengle_cd_01", boundPhone: "152-0012-3461", friendCount: 67, groups: ["成都分站群01"], manager: "赵志远", project: "成都分站", status: "待交接", risk: "warning", lastLogin: "2026-07-01" },
  { id: 5, wechatId: "fengle_sz_01", boundPhone: "186-0012-3462", friendCount: 310, groups: ["深圳代理群01", "深圳游客群01"], manager: "李梦华", project: "深圳代理", status: "使用中", risk: "normal", lastLogin: "2026-07-04" },
  { id: 6, wechatId: "fengle_bj_02", boundPhone: "—（未绑定手机）", friendCount: 0, groups: [], manager: "—", project: "—", status: "库存", risk: "normal", lastLogin: "—" },
  { id: 7, wechatId: "fengle_hz_01", boundPhone: "158-0012-3464", friendCount: 140, groups: ["杭州会员群01"], manager: "陈明", project: "杭州分站", status: "使用中", risk: "normal", lastLogin: "2026-07-05" },
];

const mediaAccounts = [
  {
    id: 1, group: "微信生态", platform: "公众号", emoji: "📢", color: "#10b981", colorBg: "rgba(16,185,129,0.1)",
    name: "蜂乐玛官方", verified: true,
    loginType: "邮箱登录", loginId: "admin@fenglema.com", pwdStore: "公司密码库 1Password",
    followers: "12,800", contentCount: "286篇文章", lastPost: "2026-07-04", engagement: "4.2%",
    manager: "内容运营团队", status: "使用中", risk: "normal",
    note: "主要内容发布渠道，绑定小程序和视频号同一主体",
    tags: ["认证账号", "已绑小程序", "已绑视频号"],
  },
  {
    id: 2, group: "微信生态", platform: "视频号", emoji: "🎬", color: "#6366f1", colorBg: "rgba(99,102,241,0.1)",
    name: "蜂乐玛视频", verified: true,
    loginType: "微信账号关联（无独立账号密码）", loginId: "关联公众号主体登录", pwdStore: "无需单独密码",
    followers: "4,200", contentCount: "68个视频", lastPost: "2026-07-03", engagement: "6.8%",
    manager: "内容运营团队", status: "使用中", risk: "normal",
    note: "与公众号同一主体，通过公众号后台管理，无需单独账号",
    tags: ["挂载公众号", "直播功能已开通"],
  },
  {
    id: 3, group: "内容平台", platform: "抖音", emoji: "🎵", color: "#ec4899", colorBg: "rgba(236,72,153,0.1)",
    name: "@fenglema_official", verified: true,
    loginType: "手机号登录", loginId: "139-0012-3459", pwdStore: "公司密码库 1Password",
    followers: "28,600", contentCount: "142个视频", lastPost: "2026-07-05", engagement: "8.3%",
    manager: "张晓红", status: "使用中", risk: "normal",
    note: "主推流量渠道，已开通企业号橱窗，每周3-5条更新",
    tags: ["企业蓝V", "橱窗已开通", "直播已开通"],
  },
  {
    id: 4, group: "内容平台", platform: "小红书", emoji: "📕", color: "#ef4444", colorBg: "rgba(239,68,68,0.1)",
    name: "fenglema_life", verified: false,
    loginType: "手机号登录（无需微信绑定）", loginId: "140-0012-3460", pwdStore: "公司密码库 1Password",
    followers: "9,300", contentCount: "234篇笔记", lastPost: "2026-07-04", engagement: "5.1%",
    manager: "王美丽", status: "使用中", risk: "normal",
    note: "生活方式内容为主，引流私域主账号",
    tags: ["个人号", "已申请专业号"],
  },
  {
    id: 5, group: "内容平台", platform: "小红书", emoji: "📕", color: "#ef4444", colorBg: "rgba(239,68,68,0.1)",
    name: "fenglema_pro", verified: true,
    loginType: "邮箱登录（独立账号，不绑手机）", loginId: "pro@fenglema.com", pwdStore: "公司密码库 1Password",
    followers: "3,100", contentCount: "87篇笔记", lastPost: "2026-06-28", engagement: "7.4%",
    manager: "王美丽", status: "使用中", risk: "normal",
    note: "PRO会员专属内容账号，主打深度干货，导流加入PRO",
    tags: ["专业号", "PRO专属"],
  },
  {
    id: 6, group: "内容平台", platform: "微博", emoji: "🐦", color: "#f59e0b", colorBg: "rgba(245,158,11,0.1)",
    name: "@蜂乐玛", verified: true,
    loginType: "手机号登录", loginId: "158-0012-3465", pwdStore: "公司密码库 1Password",
    followers: "5,700", contentCount: "1,240条微博", lastPost: "2026-07-02", engagement: "1.8%",
    manager: "内容运营团队", status: "使用中", risk: "normal",
    note: "品牌官微，更新频率低，主要用于品牌背书和官方声明",
    tags: ["蓝V认证", "低频更新"],
  },
  {
    id: 7, group: "内容平台", platform: "B站", emoji: "📺", color: "#60a5fa", colorBg: "rgba(96,165,250,0.1)",
    name: "蜂乐玛官方", verified: false,
    loginType: "邮箱登录", loginId: "bili@fenglema.com", pwdStore: "公司密码库 1Password",
    followers: "2,100", contentCount: "23个投稿", lastPost: "2026-03-10", engagement: "3.2%",
    manager: "内容运营团队", status: "空闲", risk: "normal",
    note: "长视频内容账号，目前暂停更新，待规划内容方向后重启",
    tags: ["暂停更新", "待重启"],
  },
  {
    id: 8, group: "内容平台", platform: "快手", emoji: "⚡", color: "#f97316", colorBg: "rgba(249,115,22,0.1)",
    name: "蜂乐玛快手号", verified: false,
    loginType: "手机号登录", loginId: "186-0012-3470", pwdStore: "公司密码库 1Password",
    followers: "1,340", contentCount: "31个视频", lastPost: "2026-05-20", engagement: "2.9%",
    manager: "张晓红", status: "空闲", risk: "normal",
    note: "下沉市场测试账号，ROI不佳，暂停投入",
    tags: ["测试阶段", "暂停更新"],
  },
  {
    id: 9, group: "内容平台", platform: "知乎", emoji: "🔵", color: "#3b82f6", colorBg: "rgba(59,130,246,0.1)",
    name: "蜂乐玛创始人", verified: true,
    loginType: "手机号登录", loginId: "138-0012-3456", pwdStore: "创始人本人保管",
    followers: "4,680", contentCount: "56篇专栏", lastPost: "2026-06-30", engagement: "9.1%",
    manager: "创始人王总", status: "使用中", risk: "normal",
    note: "创始人个人IP，主写私域运营方法论，高质量引流",
    tags: ["创始人IP", "专栏已开通", "知乎认证"],
  },
  {
    id: 10, group: "内容平台", platform: "领英", emoji: "💼", color: "#0ea5e9", colorBg: "rgba(14,165,233,0.1)",
    name: "蜂乐玛 FengleMa", verified: false,
    loginType: "邮箱登录（境外平台）", loginId: "admin@fenglema.com", pwdStore: "公司密码库 1Password",
    followers: "890", contentCount: "34篇动态", lastPost: "2026-06-15", engagement: "5.6%",
    manager: "内容运营团队", status: "空闲", risk: "normal",
    note: "面向B端和招募合伙人，更新频率低",
    tags: ["B端获客", "低频更新"],
  },
];

const emailOthers = [
  { id: 1, type: "邮箱", identifier: "admin@fenglema.com", usedFor: "公众号后台、小程序、视频号管理", manager: "系统管理", status: "使用中", risk: "normal" },
  { id: 2, type: "邮箱", identifier: "pro@fenglema.com", usedFor: "小红书PRO账号", manager: "王美丽", status: "使用中", risk: "normal" },
  { id: 3, type: "邮箱", identifier: "bili@fenglema.com", usedFor: "B站账号", manager: "内容运营团队", status: "使用中", risk: "normal" },
  { id: 4, type: "苹果ID", identifier: "apple@fenglema.com", usedFor: "iPhone 设备管理、TestFlight", manager: "技术团队", status: "使用中", risk: "normal" },
  { id: 5, type: "企业微信", identifier: "蜂乐玛科技有限公司", usedFor: "内部协作、客服接待", manager: "HR 团队", status: "使用中", risk: "normal" },
  { id: 6, type: "云账号", identifier: "阿里云 main@fenglema.com", usedFor: "服务器、OSS、域名", manager: "技术团队", status: "使用中", risk: "warning" },
];

// ─── 工具 ────────────────────────────────────────────────────
const statusStyle: Record<string, { bg: string; color: string }> = {
  "使用中": { bg: "rgba(34,197,94,0.16)", color: "#047a32" },
  "空闲":   { bg: "#f7ffd9", color: "#050805" },
  "异常":   { bg: "rgba(255,77,79,0.14)", color: "#d92d20" },
  "待交接": { bg: "rgba(242,182,0,0.18)", color: "#9a6b00" },
  "库存":   { bg: "rgba(5,8,5,0.08)", color: "#2f3a29" },
};

const platformIcon: Record<string, string> = {
  "公众号": "📢", "视频号": "🎬", "抖音": "🎵", "小红书": "📕", "微博": "🐦", "B站": "📺",
};

function StatusBadge({ status }: { status: string }) {
  const s = statusStyle[status] || { bg: "rgba(182,255,0,0.22)", color: "#050805" };
  return (
    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs w-fit font-medium" style={{ background: s.bg, color: s.color }}>
      <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: s.color }} />
      {status}
    </span>
  );
}

function RiskIcon({ risk }: { risk: string }) {
  if (risk === "high") return <AlertTriangle size={12} style={{ color: "#ef4444" }} />;
  if (risk === "warning") return <AlertTriangle size={12} style={{ color: "#f59e0b" }} />;
  return null;
}

function Row({ children, selected, onClick }: { children: React.ReactNode; selected: boolean; onClick: () => void }) {
  return (
    <div
      className="flex items-center px-4 py-2.5 cursor-pointer transition-all gap-4"
      style={{ background: selected ? S.primaryBg : "transparent", borderBottom: `1px solid ${S.borderLight}`, borderLeft: selected ? `2px solid ${S.primary}` : "2px solid transparent" }}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

function ColHead({ children, width }: { children: React.ReactNode; width: string }) {
  return <div className="flex-shrink-0 text-xs font-medium" style={{ color: S.muted, width }}>{children}</div>;
}

function Col({ children, width, highlight }: { children: React.ReactNode; width: string; highlight?: boolean }) {
  return <div className="flex-shrink-0 text-xs" style={{ width, color: highlight ? S.text : S.textSec }}>{children}</div>;
}

// ─── 总览 Tab ────────────────────────────────────────────────
const allAccounts = [
  ...phones.map(p => ({ id: `ph-${p.id}`, type: "手机号", identifier: p.number, detail: `${p.carrier} · 注册${p.registrations.length}个账号`, manager: p.manager, status: p.status, risk: p.risk })),
  ...wechats.map(w => ({ id: `wx-${w.id}`, type: "微信号", identifier: w.wechatId, detail: `好友${w.friendCount}人 · ${w.groups.length}个群`, manager: w.manager, status: w.status, risk: w.risk })),
  ...mediaAccounts.map(m => ({ id: `md-${m.id}`, type: m.platform, identifier: m.name, detail: `${m.loginType} · ${m.followers}粉丝`, manager: m.manager, status: m.status, risk: m.risk })),
  ...emailOthers.map(e => ({ id: `em-${e.id}`, type: e.type, identifier: e.identifier, detail: e.usedFor, manager: e.manager, status: e.status, risk: e.risk })),
];

const typeColors: Record<string, { bg: string; color: string }> = {
  "手机号":   { bg: "#ecffc4", color: "#050805" },
  "微信号":   { bg: "rgba(34,197,94,0.14)", color: "#047a32" },
  "公众号":   { bg: "#f7ffd9", color: "#050805" },
  "视频号":   { bg: "#f7ffd9", color: "#050805" },
  "抖音":     { bg: "#f7ffd9", color: "#050805" },
  "小红书":   { bg: "#f7ffd9", color: "#050805" },
  "邮箱":     { bg: "#f7ffd9", color: "#050805" },
  "苹果ID":   { bg: "rgba(5,8,5,0.08)", color: "#050805" },
  "企业微信": { bg: "rgba(34,197,94,0.14)", color: "#047a32" },
  "云账号":   { bg: "rgba(242,182,0,0.18)", color: "#9a6b00" },
};

function OverviewTab({ search }: { search: string }) {
  const [selected, setSelected] = useState<string | null>(null);
  const filtered = allAccounts.filter(a =>
    a.identifier.toLowerCase().includes(search.toLowerCase()) ||
    a.manager.includes(search) || a.type.includes(search)
  );
  const detail = allAccounts.find(a => a.id === selected);

  return (
    <div className="flex gap-4 flex-1 min-h-0">
      <div className="flex-1 rounded-xl overflow-hidden flex flex-col" style={{ background: S.surface, border: `1px solid ${S.border}` }}>
        <div className="flex items-center px-4 py-2.5 gap-4 flex-shrink-0" style={{ background: S.surface2, borderBottom: `1px solid ${S.border}` }}>
          <ColHead width="80px">类型</ColHead>
          <ColHead width="200px">账号标识</ColHead>
          <ColHead width="220px">详情</ColHead>
          <ColHead width="100px">保管人</ColHead>
          <ColHead width="80px">状态</ColHead>
          <ColHead width="40px">风险</ColHead>
        </div>
        <div className="overflow-auto flex-1">
          {filtered.map(a => {
            const tc = typeColors[a.type] || { bg: "#f7ffd9", color: "#050805" };
            return (
              <Row key={a.id} selected={selected === a.id} onClick={() => setSelected(selected === a.id ? null : a.id)}>
                <span className="flex-shrink-0 px-2 py-0.5 rounded-full text-xs" style={{ background: tc.bg, color: tc.color, width: "80px" }}>{a.type}</span>
                <Col width="200px" highlight><div className="flex items-center gap-1"><RiskIcon risk={a.risk} />{a.identifier}</div></Col>
                <Col width="220px">{a.detail}</Col>
                <Col width="100px">{a.manager}</Col>
                <div style={{ width: "80px" }}><StatusBadge status={a.status} /></div>
                <Col width="40px">{a.risk !== "normal" && <RiskIcon risk={a.risk} />}</Col>
              </Row>
            );
          })}
        </div>
      </div>

      {detail && (
        <div className="w-64 flex-shrink-0 rounded-xl p-4 flex flex-col gap-3" style={{ background: S.surface, border: `1px solid ${S.border}` }}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-white">账号详情</span>
            <button onClick={() => setSelected(null)}><X size={13} style={{ color: S.muted }} /></button>
          </div>
          <div className="py-3 rounded-xl text-center" style={{ background: "rgba(99,102,241,0.06)" }}>
            <div className="text-2xl mb-1">{platformIcon[detail.type] || "📱"}</div>
            <div className="text-sm font-semibold text-white">{detail.identifier}</div>
            <div className="text-xs mt-1" style={{ color: S.muted }}>{detail.type}</div>
            <div className="mt-2"><StatusBadge status={detail.status} /></div>
          </div>
          {[["保管人", detail.manager], ["详情", detail.detail]].map(([k, v]) => (
            <div key={k} className="flex justify-between py-1.5" style={{ borderBottom: `1px solid ${S.border}` }}>
              <span className="text-xs" style={{ color: S.muted }}>{k}</span>
              <span className="text-xs text-right max-w-[140px]" style={{ color: "#e2e8f0" }}>{v}</span>
            </div>
          ))}
          <div className="flex flex-col gap-2 mt-2">
            <button className="w-full py-2 rounded-lg text-xs text-white" style={{ background: "linear-gradient(135deg, #4361ee, #3451d1)" }}>编辑</button>
            <button className="w-full py-2 rounded-lg text-xs" style={{ background: "rgba(99,102,241,0.08)", color: "#4361ee" }}>发起交接</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 新增手机号弹窗 ──────────────────────────────────────────
function NewPhoneModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ number: "", carrier: "中国移动", region: "", idOwner: "", idNumber: "", assignedTo: "", assignedProject: "", note: "" });
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const inp = { background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.15)", color: "#e2e8f0" };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}>
      <div className="w-[560px] rounded-2xl overflow-hidden shadow-2xl" style={{ background: "#131f35", border: "1px solid rgba(99,102,241,0.25)" }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid rgba(99,102,241,0.15)" }}>
          <span className="text-white font-semibold">新增手机号</span>
          <button onClick={onClose}><X size={16} style={{ color: S.muted }} /></button>
        </div>

        <div className="p-6 space-y-5" style={{ maxHeight: "70vh", overflowY: "auto" }}>
          {/* 基本信息 */}
          <div>
            <div className="text-xs font-medium mb-3 flex items-center gap-2" style={{ color: "#4361ee" }}>
              <Phone size={13} /> 号码基本信息
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs mb-1.5" style={{ color: S.muted }}>手机号码 *</label>
                <input className="w-full px-3 py-2 rounded-lg text-xs outline-none" style={inp} placeholder="138-xxxx-xxxx" value={form.number} onChange={e => set("number", e.target.value)} />
              </div>
              <div>
                <label className="block text-xs mb-1.5" style={{ color: S.muted }}>运营商 *</label>
                <select className="w-full px-3 py-2 rounded-lg text-xs outline-none cursor-pointer" style={inp} value={form.carrier} onChange={e => set("carrier", e.target.value)}>
                  {["中国移动","中国联通","中国电信","中国广电"].map(c => <option key={c} value={c} style={{ background: "#131f35" }}>{c}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs mb-1.5" style={{ color: S.muted }}>号码归属区域 *</label>
                <input className="w-full px-3 py-2 rounded-lg text-xs outline-none" style={inp} placeholder="如 北京市朝阳区" value={form.region} onChange={e => set("region", e.target.value)} />
              </div>
            </div>
          </div>

          {/* 身份证信息 */}
          <div>
            <div className="text-xs font-medium mb-3 flex items-center gap-2" style={{ color: "#4361ee" }}>
              <CreditCard size={13} /> 注册身份证信息
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs mb-1.5" style={{ color: S.muted }}>身份证所有人 *</label>
                <input className="w-full px-3 py-2 rounded-lg text-xs outline-none" style={inp} placeholder="真实姓名" value={form.idOwner} onChange={e => set("idOwner", e.target.value)} />
              </div>
              <div>
                <label className="block text-xs mb-1.5" style={{ color: S.muted }}>身份证号码 *</label>
                <input className="w-full px-3 py-2 rounded-lg text-xs outline-none" style={inp} placeholder="18位身份证号" value={form.idNumber} onChange={e => set("idNumber", e.target.value)} />
              </div>

              {/* 身份证正面 */}
              <div>
                <label className="block text-xs mb-1.5" style={{ color: S.muted }}>身份证正面（人像面）</label>
                <div className="rounded-xl border-dashed cursor-pointer flex flex-col items-center justify-center gap-2 py-5" style={{ border: "1px dashed rgba(99,102,241,0.3)", background: "#1a2640" }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(99,102,241,0.1)" }}>
                    <CreditCard size={18} style={{ color: "#6366f1" }} />
                  </div>
                  <div className="text-center">
                    <div className="text-xs" style={{ color: "#4361ee" }}>点击上传正面</div>
                    <div className="text-xs mt-0.5" style={{ color: S.muted }}>JPG/PNG，≤5MB</div>
                  </div>
                  <div className="flex items-center gap-1 text-xs" style={{ color: S.muted }}>
                    <Upload size={10} /> 上传图片
                  </div>
                </div>
              </div>

              {/* 身份证反面 */}
              <div>
                <label className="block text-xs mb-1.5" style={{ color: S.muted }}>身份证反面（国徽面）</label>
                <div className="rounded-xl border-dashed cursor-pointer flex flex-col items-center justify-center gap-2 py-5" style={{ border: "1px dashed rgba(99,102,241,0.3)", background: "#1a2640" }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(99,102,241,0.1)" }}>
                    <CreditCard size={18} style={{ color: "#6366f1" }} />
                  </div>
                  <div className="text-center">
                    <div className="text-xs" style={{ color: "#4361ee" }}>点击上传反面</div>
                    <div className="text-xs mt-0.5" style={{ color: S.muted }}>JPG/PNG，≤5MB</div>
                  </div>
                  <div className="flex items-center gap-1 text-xs" style={{ color: S.muted }}>
                    <Upload size={10} /> 上传图片
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 分配信息 */}
          <div>
            <div className="text-xs font-medium mb-3 flex items-center gap-2" style={{ color: "#4361ee" }}>
              <Globe size={13} /> 分配与使用
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs mb-1.5" style={{ color: S.muted }}>分配给谁</label>
                <input className="w-full px-3 py-2 rounded-lg text-xs outline-none" style={inp} placeholder="保管人姓名" value={form.assignedTo} onChange={e => set("assignedTo", e.target.value)} />
              </div>
              <div>
                <label className="block text-xs mb-1.5" style={{ color: S.muted }}>归属项目</label>
                <input className="w-full px-3 py-2 rounded-lg text-xs outline-none" style={inp} placeholder="如 北京PRO服务" value={form.assignedProject} onChange={e => set("assignedProject", e.target.value)} />
              </div>
              <div className="col-span-2">
                <label className="block text-xs mb-1.5" style={{ color: S.muted }}>备注</label>
                <textarea className="w-full px-3 py-2 rounded-lg text-xs outline-none resize-none" rows={2} style={inp} placeholder="其他说明..." value={form.note} onChange={e => set("note", e.target.value)} />
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 px-6 py-4" style={{ borderTop: "1px solid rgba(99,102,241,0.15)" }}>
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm" style={{ background: "rgba(99,102,241,0.08)", color: "#4361ee" }}>取消</button>
          <button className="flex-1 py-2.5 rounded-xl text-sm text-white font-medium" style={{ background: "linear-gradient(135deg, #4361ee, #3451d1)" }}>保存</button>
        </div>
      </div>
    </div>
  );
}

// ─── 手机号 Tab ──────────────────────────────────────────────
function PhoneTab({ search }: { search: string }) {
  const [selected, setSelected] = useState<number | null>(null);
  const [showIdNum, setShowIdNum] = useState<Record<number, boolean>>({});
  const [showNewModal, setShowNewModal] = useState(false);

  const filtered = phones.filter(p =>
    p.number.includes(search) || p.manager.includes(search) ||
    p.carrier.includes(search) || p.region.includes(search) ||
    p.idOwner.includes(search) || p.assignedTo.includes(search) ||
    p.assignedProject.includes(search)
  );
  const detail = phones.find(p => p.id === selected);

  const maskId = (id: string) => id === "—" ? "—" : `${id.slice(0, 6)}****${id.slice(-4)}`;

  return (
    <div className="flex gap-4 flex-1 min-h-0">
      {showNewModal && <NewPhoneModal onClose={() => setShowNewModal(false)} />}

      <div className="flex-1 flex flex-col gap-3 min-w-0">
        {/* 操作栏 */}
        <div className="flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3 text-xs" style={{ color: S.muted }}>
            <span>共 <b style={{ color: "#e2e8f0" }}>{filtered.length}</b> 个手机号</span>
            <span style={{ color: "#ef4444" }}>● 身份证未完整：{phones.filter(p => !p.idFront || !p.idBack).length} 个</span>
            <span style={{ color: "#f59e0b" }}>● 待分配：{phones.filter(p => p.assignedTo === "—").length} 个</span>
          </div>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white" style={{ background: "linear-gradient(135deg, #4361ee, #3451d1)" }} onClick={() => setShowNewModal(true)}>
            <Plus size={13} /> 新增手机号
          </button>
        </div>

        {/* 表格 */}
        <div className="flex-1 rounded-xl overflow-hidden flex flex-col" style={{ background: S.surface, border: `1px solid ${S.border}` }}>
          {/* 表头 */}
          <div className="flex items-center px-4 py-2.5 flex-shrink-0" style={{ background: "#1a2640", borderBottom: `1px solid ${S.border}`, minWidth: "fit-content" }}>
            {([["手机号码",140],["运营商",80],["归属区域",120],["身份证人",90],["身份证号",150],["证件",64],["分配给",90],["归属项目",130],["已注册账号",200],["状态",80]] as [string,number][]).map(([l,w]) => (
              <div key={l} className="flex-shrink-0 text-xs" style={{ width: w, color: S.muted }}>{l}</div>
            ))}
          </div>

          {/* 表体 */}
          <div className="overflow-auto flex-1">
            {filtered.map((p, idx) => {
              const isSelected = selected === p.id;
              const idComplete = p.idFront && p.idBack;
              return (
                <div
                  key={p.id}
                  className="flex items-center px-4 py-2.5 cursor-pointer transition-all"
                  style={{ background: isSelected ? "rgba(99,102,241,0.08)" : idx % 2 === 0 ? "transparent" : "rgba(99,102,241,0.02)", borderBottom: `1px solid ${S.border}`, borderLeft: isSelected ? "2px solid #6366f1" : "2px solid transparent", minWidth: "fit-content" }}
                  onClick={() => setSelected(isSelected ? null : p.id)}
                >
                  {/* 手机号 */}
                  <div className="flex-shrink-0 flex items-center gap-1.5 text-xs" style={{ width: 140 }}>
                    <RiskIcon risk={p.risk} />
                    <Phone size={11} style={{ color: "#60a5fa" }} />
                    <span style={{ color: isSelected ? "#a5b4fc" : "#e2e8f0" }}>{p.number}</span>
                  </div>
                  {/* 运营商 */}
                  <div className="flex-shrink-0 text-xs" style={{ width: 80, color: "#64748b" }}>{p.carrier}</div>
                  {/* 归属区域 */}
                  <div className="flex-shrink-0 text-xs" style={{ width: 120, color: "#64748b" }}>{p.region}</div>
                  {/* 身份证人 */}
                  <div className="flex-shrink-0 text-xs font-medium" style={{ width: 90, color: "#e2e8f0" }}>{p.idOwner}</div>
                  {/* 身份证号 */}
                  <div className="flex-shrink-0 flex items-center gap-1.5 text-xs" style={{ width: 150 }}>
                    <span style={{ color: "#64748b", fontFamily: "monospace" }}>
                      {showIdNum[p.id] ? p.idNumber : maskId(p.idNumber)}
                    </span>
                    {p.idNumber !== "—" && (
                      <button onClick={e => { e.stopPropagation(); setShowIdNum(v => ({ ...v, [p.id]: !v[p.id] })); }}>
                        {showIdNum[p.id] ? <EyeOff size={10} style={{ color: S.muted }} /> : <Eye size={10} style={{ color: S.muted }} />}
                      </button>
                    )}
                  </div>
                  {/* 证件状态 */}
                  <div className="flex-shrink-0 flex items-center gap-1" style={{ width: 64 }}>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs" style={{ color: p.idFront ? "#10b981" : "#ef4444", fontSize: "10px" }}>{p.idFront ? "✓正" : "✗正"}</span>
                      <span className="text-xs" style={{ color: p.idBack ? "#10b981" : "#ef4444", fontSize: "10px" }}>{p.idBack ? "✓反" : "✗反"}</span>
                    </div>
                  </div>
                  {/* 分配给 */}
                  <div className="flex-shrink-0 text-xs" style={{ width: 90, color: p.assignedTo === "—" ? "#f59e0b" : "#94a3b8" }}>{p.assignedTo}</div>
                  {/* 归属项目 */}
                  <div className="flex-shrink-0 text-xs" style={{ width: 130, color: p.assignedProject === "—" ? S.muted : "#a5b4fc" }}>{p.assignedProject}</div>
                  {/* 已注册账号 */}
                  <div className="flex-shrink-0" style={{ width: 200 }}>
                    {p.registrations.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {p.registrations.map((r, i) => (
                          <span key={i} className="px-1.5 py-0.5 rounded-full" style={{ background: "rgba(99,102,241,0.1)", color: "#4361ee", fontSize: "10px" }}>{r}</span>
                        ))}
                      </div>
                    ) : <span style={{ color: S.muted, fontSize: "11px" }}>暂无</span>}
                  </div>
                  {/* 状态 */}
                  <div className="flex-shrink-0" style={{ width: 80 }}><StatusBadge status={p.status} /></div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 右侧详情面板 */}
      {detail && (
        <div className="w-[300px] flex-shrink-0 rounded-xl flex flex-col overflow-hidden" style={{ background: S.surface, border: `1px solid ${S.border}` }}>
          {/* 面板头 */}
          <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" style={{ borderBottom: `1px solid ${S.border}` }}>
            <span className="text-sm font-medium text-white">手机号详情</span>
            <button onClick={() => setSelected(null)}><X size={13} style={{ color: S.muted }} /></button>
          </div>

          <div className="flex-1 overflow-auto p-4 space-y-4">
            {/* 号码卡 */}
            <div className="py-4 rounded-xl text-center" style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)" }}>
              <Phone size={20} className="mx-auto mb-2" style={{ color: "#60a5fa" }} />
              <div className="text-lg font-semibold text-white">{detail.number}</div>
              <div className="text-xs mt-0.5" style={{ color: S.muted }}>{detail.carrier} · {detail.region}</div>
              <div className="mt-2"><StatusBadge status={detail.status} /></div>
            </div>

            {/* 身份证信息 */}
            <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${S.border}` }}>
              <div className="px-3 py-2 flex items-center gap-2" style={{ background: "rgba(99,102,241,0.08)", borderBottom: `1px solid ${S.border}` }}>
                <CreditCard size={13} style={{ color: "#4361ee" }} />
                <span className="text-xs font-medium" style={{ color: "#4361ee" }}>注册身份证</span>
                {detail.idFront && detail.idBack
                  ? <span className="ml-auto text-xs flex items-center gap-1" style={{ color: "#10b981" }}><CheckCircle size={11} /> 已完整上传</span>
                  : <span className="ml-auto text-xs flex items-center gap-1" style={{ color: "#ef4444" }}><AlertTriangle size={11} /> 资料不完整</span>
                }
              </div>
              <div className="p-3 space-y-2">
                <div className="flex justify-between text-xs">
                  <span style={{ color: S.muted }}>身份证所有人</span>
                  <span style={{ color: "#e2e8f0" }}>{detail.idOwner}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span style={{ color: S.muted }}>身份证号码</span>
                  <div className="flex items-center gap-1.5">
                    <span style={{ color: "#e2e8f0", fontFamily: "monospace" }}>
                      {showIdNum[detail.id] ? detail.idNumber : (detail.idNumber !== "—" ? `${detail.idNumber.slice(0,6)}****${detail.idNumber.slice(-4)}` : "—")}
                    </span>
                    {detail.idNumber !== "—" && (
                      <button onClick={() => setShowIdNum(v => ({ ...v, [detail.id]: !v[detail.id] }))}>
                        {showIdNum[detail.id] ? <EyeOff size={11} style={{ color: S.muted }} /> : <Eye size={11} style={{ color: S.muted }} />}
                      </button>
                    )}
                  </div>
                </div>

                {/* 证件正反面 */}
                <div className="grid grid-cols-2 gap-2 mt-3">
                  {/* 正面 */}
                  <div>
                    <div className="text-xs mb-1.5 flex items-center gap-1" style={{ color: S.muted }}>
                      正面（人像面）
                      {detail.idFront && <CheckCircle size={10} style={{ color: "#10b981" }} />}
                    </div>
                    {detail.idFront ? (
                      <div className="h-20 rounded-lg flex flex-col items-center justify-center gap-1 cursor-pointer" style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)" }}>
                        <CreditCard size={20} style={{ color: "#10b981" }} />
                        <span className="text-xs" style={{ color: "#10b981" }}>已上传</span>
                        <span className="text-xs" style={{ color: S.muted, fontSize: "10px" }}>点击查看</span>
                      </div>
                    ) : (
                      <div className="h-20 rounded-lg border-dashed flex flex-col items-center justify-center gap-1 cursor-pointer" style={{ border: "1px dashed rgba(239,68,68,0.4)", background: "rgba(239,68,68,0.04)" }}>
                        <Upload size={16} style={{ color: "#ef4444" }} />
                        <span className="text-xs" style={{ color: "#fca5a5" }}>未上传</span>
                        <span className="text-xs" style={{ color: S.muted, fontSize: "10px" }}>点击上传</span>
                      </div>
                    )}
                  </div>
                  {/* 反面 */}
                  <div>
                    <div className="text-xs mb-1.5 flex items-center gap-1" style={{ color: S.muted }}>
                      反面（国徽面）
                      {detail.idBack && <CheckCircle size={10} style={{ color: "#10b981" }} />}
                    </div>
                    {detail.idBack ? (
                      <div className="h-20 rounded-lg flex flex-col items-center justify-center gap-1 cursor-pointer" style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)" }}>
                        <CreditCard size={20} style={{ color: "#10b981" }} />
                        <span className="text-xs" style={{ color: "#10b981" }}>已上传</span>
                        <span className="text-xs" style={{ color: S.muted, fontSize: "10px" }}>点击查看</span>
                      </div>
                    ) : (
                      <div className="h-20 rounded-lg border-dashed flex flex-col items-center justify-center gap-1 cursor-pointer" style={{ border: "1px dashed rgba(239,68,68,0.4)", background: "rgba(239,68,68,0.04)" }}>
                        <Upload size={16} style={{ color: "#ef4444" }} />
                        <span className="text-xs" style={{ color: "#fca5a5" }}>未上传</span>
                        <span className="text-xs" style={{ color: S.muted, fontSize: "10px" }}>点击上传</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 分配信息 */}
            <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${S.border}` }}>
              <div className="px-3 py-2" style={{ background: "rgba(99,102,241,0.08)", borderBottom: `1px solid ${S.border}` }}>
                <span className="text-xs font-medium" style={{ color: "#4361ee" }}>分配 & 使用</span>
              </div>
              <div className="p-3 space-y-2">
                {[
                  ["分配给", detail.assignedTo],
                  ["归属项目", detail.assignedProject],
                  ["保管人", detail.manager],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between text-xs py-1" style={{ borderBottom: `1px solid rgba(99,102,241,0.08)` }}>
                    <span style={{ color: S.muted }}>{k}</span>
                    <span style={{ color: v === "—" ? "#f59e0b" : "#e2e8f0" }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 已注册账号 */}
            <div>
              <div className="text-xs mb-2" style={{ color: S.muted }}>
                已注册 {detail.registrations.length} 个平台账号
              </div>
              {detail.registrations.length > 0 ? detail.registrations.map((r, i) => (
                <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg mb-1.5" style={{ background: "rgba(99,102,241,0.06)", border: `1px solid ${S.border}` }}>
                  <Globe size={11} style={{ color: "#4361ee" }} />
                  <span className="text-xs" style={{ color: "#64748b" }}>{r}</span>
                </div>
              )) : (
                <div className="text-xs px-2.5 py-2 rounded-lg" style={{ background: "#1a2640", color: S.muted }}>该手机号尚未注册任何平台账号</div>
              )}
            </div>

            {/* 备注 */}
            {detail.note && (
              <div className="p-3 rounded-xl text-xs" style={{ background: "#1a2640", border: `1px solid ${S.border}`, color: "#64748b", lineHeight: 1.6 }}>
                {detail.note}
              </div>
            )}

            {/* 风险提示 */}
            {detail.risk !== "normal" && (
              <div className="flex items-start gap-2 p-3 rounded-xl" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                <AlertTriangle size={12} style={{ color: "#ef4444", marginTop: 1, flexShrink: 0 }} />
                <span className="text-xs" style={{ color: "#fca5a5" }}>
                  {detail.risk === "high" ? "账号存在异常，请尽快处理" : "存在交接风险，请及时处理"}
                </span>
              </div>
            )}
          </div>

          {/* 操作按钮 */}
          <div className="p-4 flex flex-col gap-2 flex-shrink-0" style={{ borderTop: `1px solid ${S.border}` }}>
            <button className="w-full py-2 rounded-lg text-xs text-white" style={{ background: "linear-gradient(135deg, #4361ee, #3451d1)" }}>编辑信息</button>
            <div className="grid grid-cols-2 gap-2">
              <button className="py-2 rounded-lg text-xs" style={{ background: "rgba(99,102,241,0.08)", color: "#4361ee" }}>登记关联账号</button>
              <button className="py-2 rounded-lg text-xs" style={{ background: "rgba(245,158,11,0.15)", color: "#fbbf24" }}>重新分配</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 微信号 Tab ──────────────────────────────────────────────
function WechatTab({ search }: { search: string }) {
  const [selected, setSelected] = useState<number | null>(null);
  const filtered = wechats.filter(w => w.wechatId.includes(search) || w.manager.includes(search) || w.project.includes(search));
  const detail = wechats.find(w => w.id === selected);

  return (
    <div className="flex gap-4 flex-1 min-h-0">
      <div className="flex-1 rounded-xl overflow-hidden flex flex-col" style={{ background: S.surface, border: `1px solid ${S.border}` }}>
        <div className="flex items-center px-4 py-2.5 gap-4 flex-shrink-0" style={{ background: "#1a2640", borderBottom: `1px solid ${S.border}` }}>
          <ColHead width="160px">微信号</ColHead>
          <ColHead width="160px">绑定手机</ColHead>
          <ColHead width="70px">好友数</ColHead>
          <ColHead width="60px">群数量</ColHead>
          <ColHead width="100px">保管人</ColHead>
          <ColHead width="120px">归属项目</ColHead>
          <ColHead width="80px">状态</ColHead>
          <ColHead width="80px">最近登录</ColHead>
        </div>
        <div className="overflow-auto flex-1">
          {filtered.map(w => {
            const daysAgo = w.lastLogin !== "—" ? Math.floor((new Date("2026-07-05").getTime() - new Date(w.lastLogin).getTime()) / 86400000) : null;
            const loginRisk = daysAgo !== null && daysAgo > 7;
            return (
              <Row key={w.id} selected={selected === w.id} onClick={() => setSelected(selected === w.id ? null : w.id)}>
                <Col width="160px" highlight>
                  <div className="flex items-center gap-1.5">
                    <RiskIcon risk={w.risk} />
                    <MessageCircle size={12} style={{ color: "#10b981" }} />
                    {w.wechatId}
                  </div>
                </Col>
                <Col width="160px">
                  {w.boundPhone === "—（未绑定手机）" ? (
                    <span className="px-1.5 py-0.5 rounded text-xs" style={{ background: "rgba(245,158,11,0.15)", color: "#fbbf24", fontSize: "10px" }}>未绑定手机号</span>
                  ) : w.boundPhone}
                </Col>
                <Col width="70px">{w.friendCount}</Col>
                <Col width="60px">{w.groups.length} 个</Col>
                <Col width="100px">{w.manager}</Col>
                <Col width="120px">{w.project}</Col>
                <div style={{ width: "80px" }}><StatusBadge status={w.status} /></div>
                <Col width="80px">
                  <span style={{ color: loginRisk ? "#ef4444" : "#94a3b8" }}>
                    {daysAgo !== null ? `${daysAgo}天前` : "—"}
                  </span>
                </Col>
              </Row>
            );
          })}
        </div>
      </div>

      {detail && (
        <div className="w-64 flex-shrink-0 rounded-xl p-4 flex flex-col gap-3" style={{ background: S.surface, border: `1px solid ${S.border}` }}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-white">微信号详情</span>
            <button onClick={() => setSelected(null)}><X size={13} style={{ color: S.muted }} /></button>
          </div>
          <div className="py-3 rounded-xl text-center" style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)" }}>
            <MessageCircle size={20} className="mx-auto mb-1" style={{ color: "#10b981" }} />
            <div className="text-sm font-semibold text-white">{detail.wechatId}</div>
            {detail.boundPhone === "—（未绑定手机）" ? (
              <span className="mt-1 inline-block px-2 py-0.5 rounded-full text-xs" style={{ background: "rgba(245,158,11,0.15)", color: "#fbbf24" }}>未绑定手机号</span>
            ) : <div className="text-xs mt-1" style={{ color: S.muted }}>{detail.boundPhone}</div>}
            <div className="mt-2"><StatusBadge status={detail.status} /></div>
          </div>
          {detail.groups.length > 0 && (
            <div>
              <div className="text-xs mb-1.5" style={{ color: S.muted }}>管理 {detail.groups.length} 个群组</div>
              {detail.groups.map((g, i) => (
                <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg mb-1" style={{ background: "rgba(16,185,129,0.06)" }}>
                  <span className="text-xs" style={{ color: "#6ee7b7" }}>{g}</span>
                </div>
              ))}
            </div>
          )}
          {[["保管人", detail.manager], ["归属项目", detail.project], ["好友数", `${detail.friendCount} 人`], ["最近登录", detail.lastLogin]].map(([k, v]) => (
            <div key={k} className="flex justify-between py-1.5" style={{ borderBottom: `1px solid ${S.border}` }}>
              <span className="text-xs" style={{ color: S.muted }}>{k}</span>
              <span className="text-xs" style={{ color: "#e2e8f0" }}>{v}</span>
            </div>
          ))}
          <div className="flex flex-col gap-2 mt-auto">
            <button className="w-full py-2 rounded-lg text-xs text-white" style={{ background: "linear-gradient(135deg, #4361ee, #3451d1)" }}>编辑信息</button>
            <button className="w-full py-2 rounded-lg text-xs" style={{ background: "rgba(99,102,241,0.08)", color: "#4361ee" }}>发起交接</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 媒体账号 Tab ─────────────────────────────────────────────
function MediaTab({ search }: { search: string }) {
  const [selected, setSelected] = useState<number | null>(null);

  const filtered = mediaAccounts.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.platform.includes(search) ||
    m.manager.includes(search) ||
    m.loginId.includes(search)
  );
  const detail = mediaAccounts.find(m => m.id === selected);

  const wechatGroup = filtered.filter(m => m.group === "微信生态");
  const contentGroup = filtered.filter(m => m.group === "内容平台");

  const totalFollowers = mediaAccounts.reduce((sum, m) => {
    const n = parseInt(m.followers.replace(/,/g, ""));
    return sum + (isNaN(n) ? 0 : n);
  }, 0);
  const activeCount = mediaAccounts.filter(m => m.status === "使用中").length;
  const idleCount = mediaAccounts.filter(m => m.status === "空闲").length;

  function PlatformCard({ m }: { m: typeof mediaAccounts[0] }) {
    const isSelected = selected === m.id;
    return (
      <div
        className="rounded-xl p-4 cursor-pointer transition-all"
        style={{
          background: isSelected ? `${m.colorBg}` : S.surface,
          border: isSelected ? `1px solid ${m.color}40` : `1px solid ${S.border}`,
          boxShadow: isSelected ? `0 0 16px ${m.color}18` : "none",
        }}
        onClick={() => setSelected(isSelected ? null : m.id)}
      >
        {/* 顶部：平台标识 + 状态 */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
              style={{ background: m.colorBg, border: `1px solid ${m.color}30` }}>
              {m.emoji}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold" style={{ color: m.color }}>{m.platform}</span>
                {m.verified && (
                  <span className="px-1 py-0.5 rounded text-xs" style={{ background: `${m.color}20`, color: m.color, fontSize: "9px" }}>✓ 认证</span>
                )}
              </div>
              <div className="text-sm font-medium text-white mt-0.5">{m.name}</div>
            </div>
          </div>
          <StatusBadge status={m.status} />
        </div>

        {/* 核心数据：粉丝、内容量、互动率 */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="rounded-lg px-2 py-1.5 text-center" style={{ background: "rgba(99,102,241,0.06)" }}>
            <div className="font-semibold" style={{ color: m.color, fontSize: "13px" }}>{m.followers}</div>
            <div className="text-xs mt-0.5" style={{ color: S.muted, fontSize: "10px" }}>粉丝</div>
          </div>
          <div className="rounded-lg px-2 py-1.5 text-center" style={{ background: "rgba(99,102,241,0.06)" }}>
            <div className="font-semibold text-white" style={{ fontSize: "13px" }}>{m.contentCount}</div>
            <div className="text-xs mt-0.5" style={{ color: S.muted, fontSize: "10px" }}>内容</div>
          </div>
          <div className="rounded-lg px-2 py-1.5 text-center" style={{ background: "rgba(99,102,241,0.06)" }}>
            <div className="font-semibold" style={{ color: "#10b981", fontSize: "13px" }}>{m.engagement}</div>
            <div className="text-xs mt-0.5" style={{ color: S.muted, fontSize: "10px" }}>互动率</div>
          </div>
        </div>

        {/* 标签 */}
        <div className="flex flex-wrap gap-1 mb-3">
          {m.tags.map(t => (
            <span key={t} className="px-1.5 py-0.5 rounded-full" style={{ background: "rgba(99,102,241,0.08)", color: "#4361ee", fontSize: "10px" }}>{t}</span>
          ))}
        </div>

        {/* 底部：登录方式 + 保管人 + 最近发布 */}
        <div className="pt-2.5 space-y-1.5" style={{ borderTop: `1px solid ${S.border}` }}>
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: S.muted }}>登录方式</span>
            <span className="px-1.5 py-0.5 rounded text-xs" style={{ background: "rgba(99,102,241,0.08)", color: "#4361ee", fontSize: "10px" }}>{m.loginType}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: S.muted }}>保管人</span>
            <span className="text-xs" style={{ color: "#64748b" }}>{m.manager}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: S.muted }}>最近发布</span>
            <span className="text-xs" style={{ color: m.status === "空闲" ? "#ef4444" : "#94a3b8" }}>{m.lastPost}</span>
          </div>
        </div>
      </div>
    );
  }

  function GroupSection({ title, accounts, accentColor }: { title: string; accounts: typeof mediaAccounts; accentColor: string }) {
    if (accounts.length === 0) return null;
    return (
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1 h-4 rounded-full" style={{ background: accentColor }} />
          <span className="text-sm font-medium text-white">{title}</span>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(99,102,241,0.08)", color: S.muted }}>{accounts.length} 个账号</span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {accounts.map(m => <PlatformCard key={m.id} m={m} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-4 flex-1 min-h-0">
      {/* 左侧主区域 */}
      <div className="flex-1 flex flex-col gap-4 min-w-0 overflow-auto">
        {/* 汇总数据条 */}
        <div className="grid grid-cols-4 gap-3 flex-shrink-0">
          {[
            { label: "媒体账号总数", value: mediaAccounts.length, color: "#6366f1" },
            { label: "全平台粉丝合计", value: `${(totalFollowers / 10000).toFixed(1)}万`, color: "#10b981" },
            { label: "正常运营", value: activeCount, color: "#3b82f6" },
            { label: "暂停/空闲", value: idleCount, color: "#f59e0b" },
          ].map(s => (
            <div key={s.label} className="rounded-xl px-3 py-2.5 flex-shrink-0" style={{ background: S.surface, border: `1px solid ${S.border}` }}>
              <div className="text-xs" style={{ color: S.muted }}>{s.label}</div>
              <div className="font-semibold mt-0.5" style={{ color: s.color, fontSize: "18px" }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* 分组卡片 */}
        <div className="space-y-6 pb-4">
          <GroupSection title="微信生态" accounts={wechatGroup} accentColor="#10b981" />
          <GroupSection title="内容平台" accounts={contentGroup} accentColor="#6366f1" />
          {filtered.length === 0 && (
            <div className="text-center py-12" style={{ color: S.muted }}>
              <div className="text-2xl mb-2">🔍</div>
              <div className="text-sm">未找到匹配的媒体账号</div>
            </div>
          )}
        </div>
      </div>

      {/* 右侧详情面板 */}
      {detail && (
        <div className="w-72 flex-shrink-0 rounded-xl p-4 flex flex-col gap-3 overflow-auto" style={{ background: S.surface, border: `1px solid ${S.border}` }}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-white">账号详情</span>
            <button onClick={() => setSelected(null)}><X size={13} style={{ color: S.muted }} /></button>
          </div>

          {/* 平台头 */}
          <div className="py-4 rounded-xl text-center" style={{ background: detail.colorBg, border: `1px solid ${detail.color}30` }}>
            <div className="text-4xl mb-2">{detail.emoji}</div>
            <div className="text-sm font-semibold text-white">{detail.name}</div>
            <div className="text-xs mt-0.5" style={{ color: S.muted }}>{detail.platform}</div>
            <div className="flex items-center justify-center gap-2 mt-2">
              <StatusBadge status={detail.status} />
              {detail.verified && (
                <span className="px-1.5 py-0.5 rounded text-xs" style={{ background: `${detail.color}20`, color: detail.color, fontSize: "10px" }}>✓ 已认证</span>
              )}
            </div>
          </div>

          {/* 数据指标 */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "粉丝", value: detail.followers, color: detail.color },
              { label: "内容", value: detail.contentCount, color: "#e2e8f0" },
              { label: "互动率", value: detail.engagement, color: "#10b981" },
            ].map(s => (
              <div key={s.label} className="rounded-lg px-2 py-2 text-center" style={{ background: "rgba(99,102,241,0.06)" }}>
                <div className="text-xs font-semibold" style={{ color: s.color }}>{s.value}</div>
                <div className="text-xs mt-0.5" style={{ color: S.muted, fontSize: "10px" }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* 标签 */}
          <div className="flex flex-wrap gap-1">
            {detail.tags.map(t => (
              <span key={t} className="px-2 py-0.5 rounded-full text-xs" style={{ background: "rgba(67,97,238,0.12)", color: "#4361ee" }}>{t}</span>
            ))}
          </div>

          {/* 账号凭证 */}
          <div className="rounded-xl p-3 space-y-2" style={{ background: "rgba(99,102,241,0.06)", border: `1px solid ${S.border}` }}>
            <div className="text-xs font-medium mb-1" style={{ color: "#4361ee" }}>登录凭证</div>
            <div className="flex justify-between">
              <span className="text-xs" style={{ color: S.muted }}>登录方式</span>
              <span className="text-xs" style={{ color: "#e2e8f0" }}>{detail.loginType}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs" style={{ color: S.muted }}>登录 ID</span>
              <span className="text-xs text-right max-w-[160px]" style={{ color: "#e2e8f0" }}>{detail.loginId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs" style={{ color: S.muted }}>密码保管</span>
              <span className="text-xs text-right max-w-[160px]" style={{ color: "#92400e" }}>{detail.pwdStore}</span>
            </div>
          </div>

          {/* 运营信息 */}
          {[
            ["保管人", detail.manager],
            ["最近发布", detail.lastPost],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between py-1.5" style={{ borderBottom: `1px solid ${S.border}` }}>
              <span className="text-xs" style={{ color: S.muted }}>{k}</span>
              <span className="text-xs" style={{ color: "#e2e8f0" }}>{v}</span>
            </div>
          ))}

          {/* 备注 */}
          {detail.note && (
            <div className="p-3 rounded-xl text-xs" style={{ background: "rgba(99,102,241,0.05)", color: "#64748b", lineHeight: 1.6 }}>
              {detail.note}
            </div>
          )}

          <div className="flex flex-col gap-2 mt-auto">
            <button className="w-full py-2 rounded-lg text-xs text-white" style={{ background: "linear-gradient(135deg, #4361ee, #3451d1)" }}>编辑信息</button>
            <button className="w-full py-2 rounded-lg text-xs flex items-center justify-center gap-1" style={{ background: "rgba(99,102,241,0.08)", color: "#4361ee" }}>
              <ExternalLink size={11} /> 打开平台后台
            </button>
            {detail.status === "空闲" && (
              <button className="w-full py-2 rounded-lg text-xs" style={{ background: "rgba(16,185,129,0.08)", color: "#10b981" }}>重启账号运营</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 邮箱/其他 Tab ────────────────────────────────────────────
function EmailOtherTab({ search }: { search: string }) {
  const filtered = emailOthers.filter(e => e.identifier.includes(search) || e.manager.includes(search) || e.type.includes(search) || e.usedFor.includes(search));
  return (
    <div className="flex-1 rounded-xl overflow-hidden flex flex-col" style={{ background: S.surface, border: `1px solid ${S.border}` }}>
      <div className="flex items-center px-4 py-2.5 gap-4 flex-shrink-0" style={{ background: "#1a2640", borderBottom: `1px solid ${S.border}` }}>
        <ColHead width="90px">账号类型</ColHead>
        <ColHead width="230px">账号标识</ColHead>
        <ColHead width="280px">用于哪些平台/用途</ColHead>
        <ColHead width="100px">保管人</ColHead>
        <ColHead width="80px">状态</ColHead>
      </div>
      <div className="overflow-auto flex-1">
        {filtered.map(e => {
          const tc = typeColors[e.type] || { bg: "rgba(99,102,241,0.1)", color: "#4361ee" };
          return (
            <div key={e.id} className="flex items-center px-4 py-3 gap-4" style={{ borderBottom: `1px solid ${S.border}` }}>
              <span className="flex-shrink-0 px-2 py-0.5 rounded-full text-xs" style={{ background: tc.bg, color: tc.color, width: "90px" }}>{e.type}</span>
              <Col width="230px" highlight>
                <div className="flex items-center gap-1.5">
                  {e.risk !== "normal" && <RiskIcon risk={e.risk} />}
                  <Mail size={11} style={{ color: "#c4b5fd" }} />
                  {e.identifier}
                </div>
              </Col>
              <Col width="280px">{e.usedFor}</Col>
              <Col width="100px">{e.manager}</Col>
              <div style={{ width: "80px" }}><StatusBadge status={e.status} /></div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── 主组件 ──────────────────────────────────────────────────
const tabs = [
  { id: "all",   label: "总览",    count: allAccounts.length,    icon: Globe },
  { id: "phone", label: "手机号",  count: phones.length,         icon: Phone },
  { id: "wx",    label: "微信号",  count: wechats.length,        icon: MessageCircle },
  { id: "media", label: "媒体账号", count: mediaAccounts.length,  icon: Globe },
  { id: "other", label: "邮箱/其他", count: emailOthers.length,  icon: Mail },
];

export default function AccountAssets() {
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("全部状态");

  const riskCount = allAccounts.filter(a => a.risk !== "normal").length;

  return (
    <div className="p-6 h-full flex flex-col gap-4">
      {/* 页头 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white font-semibold">账号资产中心</h2>
          <p className="text-xs mt-0.5" style={{ color: S.muted }}>统一管理手机号、微信号、媒体账号和其他凭证，支持跨平台关联查看</p>
        </div>
        <div className="flex gap-2">
          {riskCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#fca5a5" }}>
              <AlertTriangle size={12} /> {riskCount} 个账号存在风险
            </div>
          )}
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs text-white" style={{ background: "linear-gradient(135deg, #4361ee, #3451d1)" }}>
            <Plus size={13} /> 新增账号
          </button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: "账号总数", value: allAccounts.length, color: "#6366f1" },
          { label: "手机号", value: phones.length, color: "#60a5fa" },
          { label: "微信号", value: wechats.length, color: "#10b981" },
          { label: "媒体账号", value: mediaAccounts.length, color: "#a78bfa" },
          { label: "⚠ 风险账号", value: riskCount, color: "#ef4444" },
        ].map(s => (
          <div key={s.label} className="rounded-xl px-3 py-2.5" style={{ background: S.surface, border: `1px solid ${S.border}` }}>
            <div className="text-xs" style={{ color: S.muted }}>{s.label}</div>
            <div className="font-semibold mt-0.5" style={{ color: s.color, fontSize: "20px" }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Tab 栏 + 搜索 */}
      <div className="flex items-center gap-2">
        <div className="flex gap-1 p-1 rounded-xl flex-shrink-0" style={{ background: S.surface, border: `1px solid ${S.border}` }}>
          {tabs.map(t => (
            <button
              key={t.id}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all"
              style={{ background: activeTab === t.id ? "linear-gradient(135deg, #6366f1, #4f46e5)" : "transparent", color: activeTab === t.id ? "white" : S.muted }}
              onClick={() => setActiveTab(t.id)}
            >
              {t.label}
              <span className="px-1.5 py-0.5 rounded-full" style={{ background: activeTab === t.id ? "rgba(255,255,255,0.2)" : "rgba(99,102,241,0.12)", color: activeTab === t.id ? "white" : "#a5b4fc", fontSize: "10px" }}>
                {t.count}
              </span>
            </button>
          ))}
        </div>

        <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: S.surface, border: `1px solid ${S.border}` }}>
          <Search size={13} style={{ color: S.muted }} />
          <input
            className="bg-transparent outline-none text-xs flex-1"
            style={{ color: "#64748b" }}
            placeholder={activeTab === "phone" ? "搜索手机号、运营商、保管人..." : activeTab === "wx" ? "搜索微信号、保管人、项目..." : activeTab === "media" ? "搜索平台、账号名称、登录ID..." : "搜索账号、保管人..."}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && <button onClick={() => setSearch("")}><X size={12} style={{ color: S.muted }} /></button>}
        </div>

        <div className="relative flex-shrink-0">
          <select
            className="appearance-none px-3 py-2 pr-7 rounded-xl text-xs outline-none cursor-pointer"
            style={{ background: S.surface, border: `1px solid ${S.border}`, color: "#64748b" }}
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            {["全部状态", "使用中", "空闲", "异常", "待交接", "库存"].map(o => (
              <option key={o} value={o} style={{ background: "#111228" }}>{o}</option>
            ))}
          </select>
          <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: S.muted }} />
        </div>

        <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs flex-shrink-0" style={{ background: S.surface, border: `1px solid ${S.border}`, color: "#64748b" }}>
          <Filter size={12} /> 导出
        </button>
      </div>

      {/* Tab 内容 */}
      {activeTab === "all"   && <OverviewTab search={search} />}
      {activeTab === "phone" && <PhoneTab search={search} />}
      {activeTab === "wx"    && <WechatTab search={search} />}
      {activeTab === "media" && <MediaTab search={search} />}
      {activeTab === "other" && <EmailOtherTab search={search} />}
    </div>
  );
}
