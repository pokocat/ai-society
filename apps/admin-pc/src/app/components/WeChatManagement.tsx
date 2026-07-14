import { useState } from "react";
import { Search, Plus, X, ChevronLeft, ChevronRight, CheckCircle, Upload, Building2, Users, MessageCircle, ArrowRight, List, LayoutGrid, Save } from "lucide-react";
import { useProject } from "../contexts/ProjectContext";
import { useResources } from "../contexts/ResourceContext";

const L = {
  bg: "#0d1629",
  surface: "#131f35",
  border: "rgba(255,255,255,0.07)",
  borderLight: "rgba(255,255,255,0.04)",
  primary: "#4361ee",
  primaryBg: "rgba(67,97,238,0.15)",
  text: "#e2e8f0",
  textSec: "#94a3b8",
  muted: "#64748b",
  mutedLight: "#475569",
  surface2: "#1a2640",
};

// ─── 模拟数据 ─────────────────────────────────────────────────
const mockWechats = [
  { no: "00001", wechatId: "fengle_bj_01", phone: "138-0012-3456", status: "使用中", avatar: "吴", nickname: "蜂乐·吴思远", qqNo: "287634521", boundEmail: "wsy@fenglema.com", manager: "吴思远", certified: true, invitedNew: 42, scanCount: 386, friendCount: 487, city: "北京", project: "北京PRO服务", lastLogin: "2026-07-05", groupCount: 3 },
  { no: "00002", wechatId: "fengle_sh_01", phone: "139-0012-3457", status: "使用中", avatar: "林", nickname: "蜂乐·林小燕", qqNo: "345782910", boundEmail: "lxy@fenglema.com", manager: "林小燕", certified: true, invitedNew: 38, scanCount: 312, friendCount: 356, city: "上海", project: "上海体验官", lastLogin: "2026-07-05", groupCount: 2 },
  { no: "00003", wechatId: "fengle_gz_01", phone: "138-0012-3458", status: "异常", avatar: "刘", nickname: "蜂乐·刘刚", qqNo: "412893047", boundEmail: "lg@fenglema.com", manager: "刘刚", certified: false, invitedNew: 21, scanCount: 187, friendCount: 234, city: "广州", project: "广州代理培训", lastLogin: "2026-06-05", groupCount: 1 },
  { no: "00004", wechatId: "fengle_cd_01", phone: "152-0012-3461", status: "待交接", avatar: "赵", nickname: "蜂乐·赵志远", qqNo: "523019483", boundEmail: "zzr@fenglema.com", manager: "赵志远", certified: false, invitedNew: 9, scanCount: 67, friendCount: 67, city: "成都", project: "成都分站", lastLogin: "2026-07-01", groupCount: 1 },
  { no: "00005", wechatId: "fengle_sz_01", phone: "186-0012-3462", status: "使用中", avatar: "李", nickname: "蜂乐·李梦华", qqNo: "634102938", boundEmail: "lmh@fenglema.com", manager: "李梦华", certified: true, invitedNew: 31, scanCount: 278, friendCount: 310, city: "深圳", project: "深圳代理", lastLogin: "2026-07-04", groupCount: 2 },
  { no: "00006", wechatId: "fengle_hz_01", phone: "158-0012-3464", status: "使用中", avatar: "陈", nickname: "蜂乐·陈明", qqNo: "745293018", boundEmail: "cm@fenglema.com", manager: "陈明", certified: true, invitedNew: 18, scanCount: 134, friendCount: 140, city: "杭州", project: "杭州分站", lastLogin: "2026-07-05", groupCount: 1 },
  { no: "00007", wechatId: "fengle_bj_02", phone: "135-0012-3463", status: "库存", avatar: "库", nickname: "—", qqNo: "—", boundEmail: "—", manager: "—", certified: false, invitedNew: 0, scanCount: 0, friendCount: 0, city: "—", project: "—", lastLogin: "—", groupCount: 0 },
  { no: "00008", wechatId: "fengle_wh_01", phone: "137-0012-3466", status: "使用中", avatar: "王", nickname: "蜂乐·王芳", qqNo: "856304721", boundEmail: "wf@fenglema.com", manager: "王芳", certified: false, invitedNew: 14, scanCount: 98, friendCount: 120, city: "武汉", project: "武汉分站", lastLogin: "2026-07-03", groupCount: 1 },
  { no: "00009", wechatId: "fengle_nj_01", phone: "189-0012-3467", status: "使用中", avatar: "张", nickname: "蜂乐·张磊", qqNo: "967415830", boundEmail: "zl@fenglema.com", manager: "张磊", certified: true, invitedNew: 27, scanCount: 215, friendCount: 198, city: "南京", project: "南京分站", lastLogin: "2026-07-05", groupCount: 2 },
  { no: "00010", wechatId: "fengle_xa_01", phone: "177-0012-3468", status: "待交接", avatar: "孙", nickname: "蜂乐·孙浩", qqNo: "108526394", boundEmail: "sh@fenglema.com", manager: "孙浩（离职）", certified: false, invitedNew: 8, scanCount: 45, friendCount: 89, city: "西安", project: "西安分站", lastLogin: "2026-06-20", groupCount: 1 },
];

const statusCfg: Record<string, { bg: string; color: string }> = {
  "使用中": { bg: "rgba(16,185,129,0.15)", color: "#34d399" },
  "异常":   { bg: "rgba(239,68,68,0.15)", color: "#f87171" },
  "待交接": { bg: "rgba(245,158,11,0.15)", color: "#fbbf24" },
  "库存":   { bg: "rgba(100,116,139,0.15)", color: "#94a3b8" },
};

const getAccountPurpose = (wechatId: string, project: string) => {
  if (project.includes("分站") || project.includes("代理") || wechatId.includes("gz") || wechatId.includes("sz")) return "招商号";
  if (project.includes("体验") || project.includes("PRO") || project.includes("会员")) return "客服号";
  return "通用号";
};

const purposeCfg: Record<string, { bg: string; color: string; rule: string }> = {
  "招商号": { bg: "rgba(251,191,36,0.14)", color: "#fbbf24", rule: "主要承接全国游客群和城市分站流量" },
  "客服号": { bg: "rgba(34,211,238,0.12)", color: "#22d3ee", rule: "主要承接体验官会员群和售后服务" },
  "通用号": { bg: "rgba(129,140,248,0.14)", color: "#818cf8", rule: "可按项目手动配置群归属" },
};

type PersonalWechat = typeof mockWechats[number];
type ViewMode = "list" | "card";

const PAGE_SIZE = 8;

const getEnableState = (account: PersonalWechat) =>
  account.manager !== "—" && account.groupCount > 0 ? "已启用" : "未启用";

const getServiceRegion = (city: string) => {
  if (["北京", "天津", "西安"].includes(city)) return "华北区";
  if (["上海", "杭州", "南京"].includes(city)) return "华东区";
  if (["广州", "深圳", "武汉"].includes(city)) return "华南区";
  if (["成都"].includes(city)) return "西南区";
  return "待配置";
};

const getScanNickname = (account: PersonalWechat) =>
  account.nickname === "—" ? "扫码时获取" : `${account.nickname}（扫码同步）`;

const normalizeSearch = (value: string) =>
  value.toLowerCase().replace(/[^\w\u4e00-\u9fa5]+/g, "");

const matchesWechatSearch = (account: PersonalWechat, keyword: string) => {
  const query = keyword.trim().toLowerCase();
  if (!query) return true;
  const raw = [
    account.wechatId,
    account.phone,
    account.manager,
    account.city,
    account.nickname,
    getScanNickname(account),
    account.boundEmail,
    account.qqNo,
  ].join(" ").toLowerCase();
  return raw.includes(query) || normalizeSearch(raw).includes(normalizeSearch(query));
};

// ─── 新建微信号弹窗 ────────────────────────────────────────────
function NewWechatModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ no: "", wechatId: "", phone: "", nickname: "", qqNo: "", boundEmail: "", manager: "", city: "", project: "", status: "使用中" });
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const cities = ["北京", "上海", "广州", "深圳", "成都", "杭州", "武汉", "南京", "西安", "其他"];
  const statuses = ["使用中", "库存", "待交接"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}>
      <div className="w-[520px] rounded-2xl overflow-hidden shadow-2xl" style={{ background: L.surface, border: `1px solid ${L.border}` }}>
        {/* 弹窗头 */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: `1px solid ${L.border}` }}>
          <span className="font-semibold" style={{ color: L.text }}>新建微信号</span>
          <button onClick={onClose}><X size={16} style={{ color: L.muted }} /></button>
        </div>

        <div className="p-6 grid grid-cols-2 gap-4" style={{ maxHeight: "70vh", overflowY: "auto" }}>
          {[
            { label: "编号", key: "no", placeholder: "如 00011" },
            { label: "微信号", key: "wechatId", placeholder: "如 fengle_bj_03" },
            { label: "绑定手机号", key: "phone", placeholder: "138-xxxx-xxxx" },
            { label: "微信昵称", key: "nickname", placeholder: "如 蜂乐·张三" },
            { label: "QQ号", key: "qqNo", placeholder: "可选" },
            { label: "绑定邮箱", key: "boundEmail", placeholder: "可选" },
            { label: "负责人", key: "manager", placeholder: "保管人姓名" },
            { label: "归属项目", key: "project", placeholder: "如 北京PRO服务" },
          ].map(f => (
            <div key={f.key}>
              <label className="block text-xs mb-1.5" style={{ color: L.muted }}>{f.label}</label>
              <input
                className="w-full px-3 py-2 rounded-lg text-xs outline-none"
                style={{ background: "#1a2640", border: `1px solid ${L.border}`, color: L.text }}
                placeholder={f.placeholder}
                value={(form as any)[f.key]}
                onChange={e => set(f.key, e.target.value)}
              />
            </div>
          ))}

          <div>
            <label className="block text-xs mb-1.5" style={{ color: L.muted }}>城市分站</label>
            <select className="w-full px-3 py-2 rounded-lg text-xs outline-none" style={{ background: "#1a2640", border: `1px solid ${L.border}`, color: L.text }} value={form.city} onChange={e => set("city", e.target.value)}>
              <option value="">请选择</option>
              {cities.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs mb-1.5" style={{ color: L.muted }}>初始状态</label>
            <select className="w-full px-3 py-2 rounded-lg text-xs outline-none" style={{ background: "#1a2640", border: `1px solid ${L.border}`, color: L.text }} value={form.status} onChange={e => set("status", e.target.value)}>
              {statuses.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* 上传头像 */}
          <div className="col-span-2">
            <label className="block text-xs mb-1.5" style={{ color: L.muted }}>微信头像</label>
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg border-dashed cursor-pointer" style={{ border: `1px dashed ${L.border}`, background: L.bg }}>
              <Upload size={14} style={{ color: L.primary }} />
              <span className="text-xs" style={{ color: L.primary }}>点击上传微信头像截图</span>
            </div>
          </div>

          {/* 备注 */}
          <div className="col-span-2">
            <label className="block text-xs mb-1.5" style={{ color: L.muted }}>备注</label>
            <textarea className="w-full px-3 py-2 rounded-lg text-xs outline-none resize-none" rows={2}
              style={{ background: "#1a2640", border: `1px solid ${L.border}`, color: L.text }}
              placeholder="其他说明..." />
          </div>
        </div>

        <div className="flex gap-3 px-6 py-4" style={{ borderTop: `1px solid ${L.border}` }}>
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm" style={{ background: L.bg, color: L.muted, border: `1px solid ${L.border}` }}>取消</button>
          <button className="flex-1 py-2.5 rounded-xl text-sm text-white font-medium" style={{ background: "linear-gradient(135deg, #4361ee, #3451d1)" }}>保存</button>
        </div>
      </div>
    </div>
  );
}

// ─── 企业微信数据 ─────────────────────────────────────────────
const wecomAccounts = [
  { id: 1, wecomId: "蜂乐玛企微-吴思远", corpId: "ww_fenglema_bj", linkedPersonal: "fengle_bj_01",
    admin: "吴思远", dept: "北京服务中心", members: 487, groups: ["北京PRO企微群", "北京体验官企微群", "内部协作群"],
    status: "正常", syncStatus: "已同步", lastSync: "2026-07-05", city: "北京", note: "负责北京所有PRO用户的企微添加和群管理" },
  { id: 2, wecomId: "蜂乐玛企微-林小燕", corpId: "ww_fenglema_sh", linkedPersonal: "fengle_sh_01",
    admin: "林小燕", dept: "上海服务中心", members: 356, groups: ["上海PRO企微群", "上海体验官企微群"],
    status: "正常", syncStatus: "已同步", lastSync: "2026-07-05", city: "上海", note: "负责上海用户的企微双微信管理" },
  { id: 3, wecomId: "蜂乐玛企微-刘刚", corpId: "ww_fenglema_gz", linkedPersonal: "fengle_gz_01",
    admin: "刘刚", dept: "广州服务中心", members: 234, groups: ["广州代理企微群"],
    status: "异常", syncStatus: "同步失败", lastSync: "2026-06-05", city: "广州", note: "企微30天未登录，与个人微信同步失败" },
  { id: 4, wecomId: "蜂乐玛企微-李梦华", corpId: "ww_fenglema_sz", linkedPersonal: "fengle_sz_01",
    admin: "李梦华", dept: "深圳服务中心", members: 310, groups: ["深圳代理企微群", "深圳游客企微群"],
    status: "正常", syncStatus: "已同步", lastSync: "2026-07-04", city: "深圳", note: "" },
  { id: 5, wecomId: "蜂乐玛企微-陈明", corpId: "ww_fenglema_hz", linkedPersonal: "fengle_hz_01",
    admin: "陈明", dept: "杭州服务中心", members: 140, groups: ["杭州会员企微群"],
    status: "正常", syncStatus: "已同步", lastSync: "2026-07-05", city: "杭州", note: "" },
];

type WecomAccount = typeof wecomAccounts[number];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block mb-1.5" style={{ color: L.muted, fontSize: 10 }}>{label}</span>
      {children}
    </label>
  );
}

const inputStyle = {
  background: L.bg,
  border: `1px solid ${L.border}`,
  color: L.text,
  fontSize: 11,
};

function PersonalDetailPanel({ account, onChange, onClose }: { account: PersonalWechat; onChange: (patch: Partial<PersonalWechat>) => void; onClose: () => void }) {
  const { accounts, groups } = useResources();
  const purpose = getAccountPurpose(account.wechatId, account.project);
  const pc = purposeCfg[purpose];
  const st = statusCfg[account.status] || statusCfg["库存"];
  const enableState = getEnableState(account);
  const region = getServiceRegion(account.city);
  const resourceAccount = accounts.find(item => item.type === "个人微信" && item.account === account.wechatId);
  const serviceGroups = resourceAccount ? groups.filter(group => group.personalWechat === resourceAccount.id) : [];

  return (
    <aside className="w-[330px] flex-shrink-0 rounded-xl flex flex-col overflow-hidden" style={{ background: L.surface, border: `1px solid ${L.border}` }}>
      <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: `1px solid ${L.border}` }}>
        <div>
          <div className="font-semibold" style={{ color: L.text, fontSize: 13 }}>个人微信详情</div>
          <div className="mt-0.5" style={{ color: L.muted, fontSize: 9 }}>{account.no} · {account.wechatId}</div>
        </div>
        <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: L.bg }}><X size={14} style={{ color: L.muted }} /></button>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        <div className="p-3 rounded-xl" style={{ background: L.bg, border: `1px solid ${L.border}` }}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-semibold" style={{ background: account.status === "库存" ? L.surface2 : "linear-gradient(135deg, #4361ee, #7c3aed)" }}>{account.avatar}</div>
            <div className="min-w-0">
              <div className="font-semibold truncate" style={{ color: L.text, fontSize: 13 }}>{account.nickname}</div>
              <div className="mt-1 flex gap-1.5">
                <span className="px-1.5 py-0.5 rounded text-xs" style={{ background: st.bg, color: st.color }}>{account.status}</span>
                <span className="px-1.5 py-0.5 rounded text-xs" style={{ background: pc.bg, color: pc.color }}>{purpose}</span>
                <span className="px-1.5 py-0.5 rounded text-xs" style={{ background: enableState === "已启用" ? "rgba(16,185,129,0.15)" : "rgba(100,116,139,0.15)", color: enableState === "已启用" ? "#34d399" : L.muted }}>{enableState}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="微信号"><input value={account.wechatId} onChange={event => onChange({ wechatId: event.target.value })} className="w-full px-3 py-2 rounded-lg outline-none" style={inputStyle} /></Field>
          <Field label="绑定人手机"><input value={account.phone} onChange={event => onChange({ phone: event.target.value })} className="w-full px-3 py-2 rounded-lg outline-none" style={inputStyle} /></Field>
          <Field label="微信昵称"><input value={account.nickname} onChange={event => onChange({ nickname: event.target.value })} className="w-full px-3 py-2 rounded-lg outline-none" style={inputStyle} /></Field>
          <Field label="扫码昵称"><input value={getScanNickname(account)} readOnly className="w-full px-3 py-2 rounded-lg outline-none" style={{ ...inputStyle, color: L.muted }} /></Field>
          <Field label="负责人"><input value={account.manager} onChange={event => onChange({ manager: event.target.value })} className="w-full px-3 py-2 rounded-lg outline-none" style={inputStyle} /></Field>
          <Field label="状态"><select value={account.status} onChange={event => onChange({ status: event.target.value })} className="w-full px-3 py-2 rounded-lg outline-none" style={inputStyle}><option>使用中</option><option>异常</option><option>待交接</option><option>库存</option></select></Field>
          <Field label="城市分站"><input value={account.city} onChange={event => onChange({ city: event.target.value })} className="w-full px-3 py-2 rounded-lg outline-none" style={inputStyle} /></Field>
          <Field label="服务大区"><input value={region} readOnly className="w-full px-3 py-2 rounded-lg outline-none" style={{ ...inputStyle, color: L.muted }} /></Field>
          <Field label="QQ号"><input value={account.qqNo} onChange={event => onChange({ qqNo: event.target.value })} className="w-full px-3 py-2 rounded-lg outline-none" style={inputStyle} /></Field>
          <Field label="绑定邮箱"><input value={account.boundEmail} onChange={event => onChange({ boundEmail: event.target.value })} className="w-full px-3 py-2 rounded-lg outline-none" style={inputStyle} /></Field>
          <Field label="归属项目"><input value={account.project} onChange={event => onChange({ project: event.target.value })} className="w-full px-3 py-2 rounded-lg outline-none" style={inputStyle} /></Field>
          <Field label="最近登录"><input value={account.lastLogin} onChange={event => onChange({ lastLogin: event.target.value })} className="w-full px-3 py-2 rounded-lg outline-none" style={inputStyle} /></Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-xl" style={{ background: L.bg, border: `1px solid ${L.border}` }}>
            <div style={{ color: L.muted, fontSize: 10 }}>启用来源</div>
            <div className="mt-1.5" style={{ color: L.textSec, fontSize: 11 }}>{enableState === "已启用" ? "已绑定负责人和社群" : "未绑定负责人或社群"}</div>
          </div>
          <div className="p-3 rounded-xl border-dashed" style={{ background: L.bg, border: `1px dashed ${L.border}` }}>
            <div style={{ color: L.muted, fontSize: 10 }}>微信头像</div>
            <div className="mt-1.5 flex items-center gap-2" style={{ color: L.primary, fontSize: 11 }}><Upload size={12} /> 扫码时获取 / 可手动上传</div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[["好友", account.friendCount], ["群数", account.groupCount], ["扫码", account.scanCount]].map(([label, value]) => (
            <div key={label as string} className="p-2 rounded-lg text-center" style={{ background: L.bg }}>
              <div className="font-semibold" style={{ color: L.primary, fontSize: 13 }}>{value as number}</div>
              <div className="mt-0.5" style={{ color: L.muted, fontSize: 9 }}>{label as string}</div>
            </div>
          ))}
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between"><span style={{ color: L.muted, fontSize: 10 }}>服务中的群</span><span style={{ color: L.primary, fontSize: 9 }}>反向查询</span></div>
          <div className="space-y-1.5">
            {serviceGroups.map(group => (
              <div key={group.id} className="flex items-center gap-2 px-2.5 py-2 rounded-lg" style={{ background: L.bg, border: `1px solid ${L.border}` }}>
                <Users size={12} style={{ color: L.primary }} />
                <span className="flex-1 min-w-0"><span className="block truncate" style={{ color: L.textSec, fontSize: 11 }}>{group.name}</span><span className="block mt-0.5" style={{ color: L.muted, fontSize: 9 }}>{group.memberCount}/{group.targetCapacity} · {group.city}</span></span>
                <span style={{ color: group.status === "容量预警" ? "#f87171" : L.primary, fontSize: 9 }}>{group.status}</span>
              </div>
            ))}
            {serviceGroups.length === 0 && <div className="px-3 py-4 text-center rounded-lg" style={{ background: L.bg, color: L.muted, fontSize: 10 }}>当前未配置服务群</div>}
          </div>
        </div>
      </div>

      <div className="p-4 flex gap-2" style={{ borderTop: `1px solid ${L.border}` }}>
        <button className="flex-1 py-2 rounded-lg text-xs flex items-center justify-center gap-1.5 text-white" style={{ background: "linear-gradient(135deg, #4361ee, #3451d1)" }}><Save size={13} />保存修改</button>
        <button className="px-3 py-2 rounded-lg text-xs" style={{ background: "rgba(245,158,11,0.15)", color: "#fbbf24" }}>发起交接</button>
      </div>
    </aside>
  );
}

function WecomDetailPanel({ account, onChange, onClose }: { account: WecomAccount; onChange: (patch: Partial<WecomAccount>) => void; onClose: () => void }) {
  const { accounts, groups } = useResources();
  const enterpriseResource = accounts.find(item => item.type === "企业微信" && item.account === account.corpId);
  const builtGroups = enterpriseResource ? groups.filter(group => group.builder === enterpriseResource.id) : [];
  const statusMap: Record<string, { bg: string; color: string }> = {
    "正常": { bg: "rgba(16,185,129,0.15)", color: "#34d399" },
    "异常": { bg: "rgba(239,68,68,0.15)", color: "#f87171" },
  };
  const syncMap: Record<string, { bg: string; color: string }> = {
    "已同步": { bg: "rgba(16,185,129,0.15)", color: "#34d399" },
    "同步失败": { bg: "rgba(239,68,68,0.15)", color: "#f87171" },
  };

  return (
    <aside className="w-[330px] flex-shrink-0 rounded-xl flex flex-col overflow-hidden" style={{ background: L.surface, border: `1px solid ${L.border}` }}>
      <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: `1px solid ${L.border}` }}>
        <div>
          <div className="font-semibold" style={{ color: L.text, fontSize: 13 }}>企业微信详情</div>
          <div className="mt-0.5" style={{ color: L.muted, fontSize: 9 }}>{account.corpId}</div>
        </div>
        <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: L.bg }}><X size={14} style={{ color: L.muted }} /></button>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        <div className="p-3 rounded-xl" style={{ background: L.bg, border: `1px solid ${L.border}` }}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-semibold" style={{ background: "linear-gradient(135deg, #4361ee, #3451d1)" }}>{account.admin[0]}</div>
            <div className="min-w-0">
              <div className="font-semibold truncate" style={{ color: L.text, fontSize: 13 }}>{account.wecomId}</div>
              <div className="mt-1 flex gap-1.5">
                <span className="px-1.5 py-0.5 rounded text-xs" style={{ background: statusMap[account.status].bg, color: statusMap[account.status].color }}>{account.status}</span>
                <span className="px-1.5 py-0.5 rounded text-xs" style={{ background: syncMap[account.syncStatus].bg, color: syncMap[account.syncStatus].color }}>{account.syncStatus}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="企业微信名"><input value={account.wecomId} onChange={event => onChange({ wecomId: event.target.value })} className="w-full px-3 py-2 rounded-lg outline-none" style={inputStyle} /></Field>
          <Field label="管理员"><input value={account.admin} onChange={event => onChange({ admin: event.target.value })} className="w-full px-3 py-2 rounded-lg outline-none" style={inputStyle} /></Field>
          <Field label="部门"><input value={account.dept} onChange={event => onChange({ dept: event.target.value })} className="w-full px-3 py-2 rounded-lg outline-none" style={inputStyle} /></Field>
          <Field label="城市"><input value={account.city} onChange={event => onChange({ city: event.target.value })} className="w-full px-3 py-2 rounded-lg outline-none" style={inputStyle} /></Field>
          <Field label="状态"><select value={account.status} onChange={event => onChange({ status: event.target.value })} className="w-full px-3 py-2 rounded-lg outline-none" style={inputStyle}><option>正常</option><option>异常</option></select></Field>
          <Field label="同步状态"><select value={account.syncStatus} onChange={event => onChange({ syncStatus: event.target.value })} className="w-full px-3 py-2 rounded-lg outline-none" style={inputStyle}><option>已同步</option><option>同步失败</option></select></Field>
          <Field label="绑定个人微信"><input value={account.linkedPersonal} onChange={event => onChange({ linkedPersonal: event.target.value })} className="w-full px-3 py-2 rounded-lg outline-none" style={inputStyle} /></Field>
          <Field label="最近同步"><input value={account.lastSync} onChange={event => onChange({ lastSync: event.target.value })} className="w-full px-3 py-2 rounded-lg outline-none" style={inputStyle} /></Field>
        </div>

        <Field label="备注"><textarea value={account.note} onChange={event => onChange({ note: event.target.value })} className="w-full px-3 py-2 rounded-lg outline-none resize-none" rows={3} style={inputStyle} /></Field>

        <div>
          <div className="mb-2" style={{ color: L.muted, fontSize: 10 }}>企微群组</div>
          <div className="space-y-1.5">
            {(builtGroups.length ? builtGroups.map(group => group.name) : account.groups).map(group => (
              <div key={group} className="flex items-center gap-2 px-2.5 py-2 rounded-lg" style={{ background: L.bg, border: `1px solid ${L.border}` }}>
                <Users size={12} style={{ color: L.primary }} />
                <span style={{ color: L.textSec, fontSize: 11 }}>{group}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="p-4 flex flex-col gap-2" style={{ borderTop: `1px solid ${L.border}` }}>
        <button className="w-full py-2 rounded-lg text-xs flex items-center justify-center gap-1.5 text-white" style={{ background: "linear-gradient(135deg, #4361ee, #3451d1)" }}><Save size={13} />保存企业微信</button>
        <div className="grid grid-cols-2 gap-2">
          <button className="py-2 rounded-lg text-xs" style={{ background: L.bg, border: `1px solid ${L.border}`, color: L.textSec }}>手动同步</button>
          <button className="py-2 rounded-lg text-xs" style={{ background: L.primaryBg, color: L.primary }}>新建群</button>
        </div>
      </div>
    </aside>
  );
}

// ─── 企业微信 Tab ─────────────────────────────────────────────
function WecomTab() {
  const [accounts, setAccounts] = useState(wecomAccounts);
  const [selected, setSelected] = useState<number | null>(accounts[0]?.id ?? null);
  const [viewMode, setViewMode] = useState<ViewMode>("card");
  const detail = accounts.find(w => w.id === selected);
  const statusCfg: Record<string, { bg: string; color: string }> = {
    "正常": { bg: "rgba(16,185,129,0.15)", color: "#34d399" },
    "异常": { bg: "rgba(239,68,68,0.15)", color: "#f87171" },
  };
  const syncCfg: Record<string, { bg: string; color: string }> = {
    "已同步": { bg: "rgba(16,185,129,0.15)", color: "#34d399" },
    "同步失败": { bg: "rgba(239,68,68,0.15)", color: "#f87171" },
  };
  const updateSelected = (patch: Partial<WecomAccount>) => {
    if (!selected) return;
    setAccounts(items => items.map(item => item.id === selected ? { ...item, ...patch } : item));
  };

  return (
    <div className="flex gap-4 flex-1 min-h-0">
      <div className="flex-1 flex flex-col gap-4">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 flex-shrink-0">
          {[
            { label: "企业微信总数", value: accounts.length, color: "#4361ee" },
            { label: "正常运营", value: accounts.filter(w => w.status === "正常").length, color: "#059669" },
            { label: "同步失败", value: accounts.filter(w => w.syncStatus === "同步失败").length, color: "#dc2626" },
            { label: "企微成员总数", value: accounts.reduce((s, w) => s + w.members, 0).toLocaleString(), color: "#7c3aed" },
          ].map(s => (
            <div key={s.label} className="rounded-xl px-4 py-3" style={{ background: L.surface, border: `1px solid ${L.border}` }}>
              <div className="text-xs" style={{ color: L.muted }}>{s.label}</div>
              <div className="text-xl font-bold mt-0.5" style={{ color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between flex-shrink-0">
          <div className="rounded-xl px-3 py-2 flex items-center gap-2" style={{ background: L.surface, border: `1px solid ${L.border}`, color: L.muted, fontSize: 11 }}>
            <Building2 size={13} style={{ color: L.primary }} />
            企微与个人微信绑定后，成员、群和工单同步回写项目系统
          </div>
          <div className="flex gap-0.5 p-1 rounded-xl" style={{ background: L.surface, border: `1px solid ${L.border}` }}>
            <button className="w-8 h-7 rounded-lg flex items-center justify-center" title="列表视图" style={{ background: viewMode === "list" ? L.primaryBg : "transparent" }} onClick={() => setViewMode("list")}><List size={14} style={{ color: viewMode === "list" ? L.primary : L.muted }} /></button>
            <button className="w-8 h-7 rounded-lg flex items-center justify-center" title="卡片视图" style={{ background: viewMode === "card" ? L.primaryBg : "transparent" }} onClick={() => setViewMode("card")}><LayoutGrid size={14} style={{ color: viewMode === "card" ? L.primary : L.muted }} /></button>
          </div>
        </div>

        {viewMode === "list" && (
          <div className="flex-1 rounded-xl overflow-hidden flex flex-col" style={{ background: L.surface, border: `1px solid ${L.border}` }}>
            <div className="grid grid-cols-[1.25fr_1fr_1fr_90px_90px_80px_90px_100px] px-4 py-2.5" style={{ color: L.muted, background: L.surface2, fontSize: 10 }}>
              <span>企业微信</span><span>部门 / 城市</span><span>绑定个人微信</span><span>成员</span><span>群数</span><span>状态</span><span>同步</span><span>最近同步</span>
            </div>
            <div className="flex-1 overflow-auto">
              {accounts.map(w => {
                const st = statusCfg[w.status];
                const sy = syncCfg[w.syncStatus];
                const isSelected = selected === w.id;
                return (
                  <button key={w.id} onClick={() => setSelected(w.id)} className="w-full grid grid-cols-[1.25fr_1fr_1fr_90px_90px_80px_90px_100px] px-4 py-3 items-center text-left" style={{ background: isSelected ? L.primaryBg : "transparent", borderTop: `1px solid ${L.borderLight}` }}>
                    <span className="flex items-center gap-2 min-w-0"><span className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-semibold" style={{ background: "linear-gradient(135deg, #4361ee, #3451d1)", fontSize: 11 }}>{w.admin[0]}</span><span className="min-w-0"><span className="block truncate" style={{ color: L.text, fontSize: 11 }}>{w.wecomId}</span><span className="block mt-0.5 truncate" style={{ color: L.muted, fontSize: 9 }}>{w.corpId}</span></span></span>
                    <span><span className="block" style={{ color: L.textSec, fontSize: 10 }}>{w.dept}</span><span className="block mt-0.5" style={{ color: L.muted, fontSize: 9 }}>{w.city}</span></span>
                    <span style={{ color: "#34d399", fontSize: 10 }}>{w.linkedPersonal}</span>
                    <span style={{ color: L.primary, fontSize: 10 }}>{w.members} 人</span>
                    <span style={{ color: L.primary, fontSize: 10 }}>{w.groups.length} 个</span>
                    <span><span className="px-1.5 py-0.5 rounded text-xs" style={{ background: st.bg, color: st.color }}>{w.status}</span></span>
                    <span><span className="px-1.5 py-0.5 rounded text-xs" style={{ background: sy.bg, color: sy.color }}>{w.syncStatus}</span></span>
                    <span style={{ color: L.muted, fontSize: 10 }}>{w.lastSync}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Wecom cards */}
        {viewMode === "card" && <div className="grid grid-cols-2 gap-3 flex-1 overflow-auto content-start pb-2">
          {accounts.map(w => {
            const st = statusCfg[w.status];
            const sy = syncCfg[w.syncStatus];
            const isSelected = selected === w.id;
            return (
              <div
                key={w.id}
                className="rounded-xl p-4 cursor-pointer transition-all"
                style={{ background: isSelected ? L.primaryBg : L.surface, border: isSelected ? `1px solid ${L.primary}` : `1px solid ${L.border}` }}
                onClick={() => setSelected(w.id)}
              >
                {/* Header */}
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0" style={{ background: "linear-gradient(135deg, #4361ee, #3451d1)" }}>
                    {w.admin[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold" style={{ color: L.text }}>{w.wecomId}</span>
                      <span className="px-1.5 py-0.5 rounded-full text-xs font-medium" style={{ background: st.bg, color: st.color }}>{w.status}</span>
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: L.muted }}>{w.dept} · {w.city}</div>
                  </div>
                </div>

                {/* 与个人微信关联 */}
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl mb-3" style={{ background: L.bg, border: `1px solid ${L.border}` }}>
                  <MessageCircle size={13} style={{ color: "#059669" }} />
                  <span className="text-xs" style={{ color: L.muted }}>绑定个人微信：</span>
                  <span className="text-xs font-semibold" style={{ color: "#059669" }}>{w.linkedPersonal}</span>
                  <ArrowRight size={11} style={{ color: L.mutedLight }} />
                  <span className="text-xs" style={{ color: L.muted }}>同步添加成员</span>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {[["成员数", w.members, "#4361ee"], ["群数量", w.groups.length, "#7c3aed"], ["城市", w.city, "#94a3b8"]].map(([l, v, c]) => (
                    <div key={l as string} className="rounded-lg px-2 py-1.5 text-center" style={{ background: L.bg }}>
                      <div className="text-xs font-semibold" style={{ color: c as string }}>{v}</div>
                      <div className="text-xs" style={{ color: L.muted, fontSize: "10px" }}>{l}</div>
                    </div>
                  ))}
                </div>

                {/* Sync status */}
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: sy.bg, color: sy.color }}>
                    {w.syncStatus}
                  </span>
                  <span className="text-xs" style={{ color: L.mutedLight }}>最近同步 {w.lastSync}</span>
                </div>

                {w.groups.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1 pt-2.5" style={{ borderTop: `1px solid ${L.borderLight}` }}>
                    {w.groups.map(g => (
                      <span key={g} className="px-2 py-0.5 rounded-full text-xs" style={{ background: L.primaryBg, color: L.primary }}>{g}</span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>}
      </div>

      {detail && <WecomDetailPanel account={detail} onChange={updateSelected} onClose={() => setSelected(null)} />}
    </div>
  );
}

// ─── 主组件 ───────────────────────────────────────────────────
export default function WeChatManagement() {
  const { currentProject } = useProject();
  const [personalAccounts, setPersonalAccounts] = useState(mockWechats);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("全部");
  const [purposeFilter, setPurposeFilter] = useState("全部用途");
  const [enableFilter, setEnableFilter] = useState("全部启用");
  const [regionFilter, setRegionFilter] = useState("全部大区");
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [selectedRow, setSelectedRow] = useState<string | null>(mockWechats[0]?.no ?? null);
  const [personalViewMode, setPersonalViewMode] = useState<ViewMode>("list");

  const statusTabs = ["全部", "使用中", "异常", "待交接", "库存"];
  const purposeTabs = ["全部用途", "招商号", "客服号", "通用号"];
  const enableTabs = ["全部启用", "已启用", "未启用"];
  const regionTabs = ["全部大区", ...Array.from(new Set(personalAccounts.map(account => getServiceRegion(account.city))))];

  const filtered = personalAccounts.filter(w =>
    (statusFilter === "全部" || w.status === statusFilter) &&
    (purposeFilter === "全部用途" || getAccountPurpose(w.wechatId, w.project) === purposeFilter) &&
    (enableFilter === "全部启用" || getEnableState(w) === enableFilter) &&
    (regionFilter === "全部大区" || getServiceRegion(w.city) === regionFilter) &&
    matchesWechatSearch(w, search)
  );
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const selectedPersonal = personalAccounts.find(account => account.no === selectedRow) ?? null;
  const updateSelectedPersonal = (patch: Partial<PersonalWechat>) => {
    if (!selectedRow) return;
    setPersonalAccounts(items => items.map(item => item.no === selectedRow ? { ...item, ...patch } : item));
  };

  const counts = { 全部: personalAccounts.length, 使用中: personalAccounts.filter(w => w.status === "使用中").length, 异常: personalAccounts.filter(w => w.status === "异常").length, 待交接: personalAccounts.filter(w => w.status === "待交接").length, 库存: personalAccounts.filter(w => w.status === "库存").length };
  const enableCounts = { 全部启用: personalAccounts.length, 已启用: personalAccounts.filter(w => getEnableState(w) === "已启用").length, 未启用: personalAccounts.filter(w => getEnableState(w) === "未启用").length };

  // 表头列定义
  const cols = [
    { label: "编号", w: 64 }, { label: "微信号", w: 156 }, { label: "绑定人手机", w: 130 },
    { label: "状态", w: 76 }, { label: "启用", w: 76 }, { label: "用途", w: 76 }, { label: "头像", w: 52 }, { label: "微信昵称", w: 126 },
    { label: "好友数", w: 64 }, { label: "群数量", w: 64 }, { label: "QQ号", w: 100 },
    { label: "绑定邮箱", w: 170 }, { label: "负责人", w: 90 }, { label: "认证", w: 56 },
    { label: "已邀新人", w: 72 }, { label: "扫描量", w: 64 }, { label: "服务大区", w: 80 }, { label: "城市分站", w: 80 },
    { label: "最近登录", w: 90 }, { label: "操作", w: 100 },
  ];

  const [mainTab, setMainTab] = useState<"personal" | "wecom">("personal");

  return (
    <div className="p-6 h-full flex flex-col gap-4" style={{ background: L.bg }}>
      {showModal && <NewWechatModal onClose={() => setShowModal(false)} />}

      {/* 页头 */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-semibold" style={{ color: L.text }}>微信管理</h2>
            <span className="px-2 py-0.5 rounded-md" style={{ color: currentProject.accent, background: `${currentProject.accent}15`, fontSize: "9px" }}>{currentProject.shortName}</span>
          </div>
          <p className="text-xs mt-0.5" style={{ color: L.muted }}>管理当前项目的个人微信、企业微信及员工绑定关系</p>
        </div>
        <div className="flex gap-2">
          {/* 个人/企微切换 */}
          <div className="flex gap-0.5 p-1 rounded-xl" style={{ background: L.surface, border: `1px solid ${L.border}` }}>
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{ background: mainTab === "personal" ? L.primaryBg : "transparent", color: mainTab === "personal" ? L.primary : L.muted }}
              onClick={() => setMainTab("personal")}
            >
              <MessageCircle size={13} /> 个人微信
            </button>
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{ background: mainTab === "wecom" ? "rgba(67,97,238,0.15)" : "transparent", color: mainTab === "wecom" ? "#4361ee" : L.muted }}
              onClick={() => setMainTab("wecom")}
            >
              <Building2 size={13} /> 企业微信
            </button>
          </div>
          <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm text-white font-medium" style={{ background: "linear-gradient(135deg, #4361ee, #3451d1)" }} onClick={() => setShowModal(true)}>
            <Plus size={15} /> {mainTab === "personal" ? "新建微信号" : "新建企微账号"}
          </button>
        </div>
      </div>

      {/* 企业微信Tab内容 */}
      {mainTab === "wecom" && <WecomTab />}

      {/* 个人微信内容 */}
      {mainTab === "personal" && <>

      <div className="grid grid-cols-3 gap-3 flex-shrink-0">
        {purposeTabs.filter(tab => tab !== "全部用途").map(tab => {
          const cfg = purposeCfg[tab];
          const count = personalAccounts.filter(item => getAccountPurpose(item.wechatId, item.project) === tab).length;
          return (
            <button key={tab} onClick={() => { setPurposeFilter(tab); setPage(1); }} className="p-3 rounded-xl text-left transition-all" style={{ background: purposeFilter === tab ? `${cfg.color}18` : L.surface, border: `1px solid ${purposeFilter === tab ? `${cfg.color}55` : L.border}` }}>
              <div className="flex items-center justify-between">
                <span className="font-semibold" style={{ color: cfg.color, fontSize: 12 }}>{tab}</span>
                <span className="text-lg font-semibold" style={{ color: L.text }}>{count}</span>
              </div>
              <div className="mt-1" style={{ color: L.muted, fontSize: 10 }}>{cfg.rule}</div>
            </button>
          );
        })}
      </div>

      {/* 状态 Tab + 搜索 */}
      <div className="flex items-center gap-3 flex-shrink-0 flex-wrap">
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: L.surface, border: `1px solid ${L.border}`, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
          {statusTabs.map(t => (
            <button
              key={t}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all"
              style={{ background: statusFilter === t ? "linear-gradient(135deg, #4361ee, #3451d1)" : "transparent", color: statusFilter === t ? "white" : L.muted }}
              onClick={() => { setStatusFilter(t); setPage(1); }}
            >
              {t}
              <span className="px-1.5 py-0.5 rounded-full" style={{ background: statusFilter === t ? "rgba(255,255,255,0.25)" : L.primaryBg, color: statusFilter === t ? "white" : L.primary, fontSize: "10px" }}>
                {(counts as any)[t]}
              </span>
            </button>
          ))}
        </div>
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: L.surface, border: `1px solid ${L.border}` }}>
          {purposeTabs.map(t => (
            <button key={t} className="px-3 py-1.5 rounded-lg text-xs transition-all" style={{ background: purposeFilter === t ? L.primaryBg : "transparent", color: purposeFilter === t ? L.primary : L.muted }} onClick={() => { setPurposeFilter(t); setPage(1); }}>{t}</button>
          ))}
        </div>
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: L.surface, border: `1px solid ${L.border}` }}>
          {enableTabs.map(t => (
            <button key={t} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all" style={{ background: enableFilter === t ? L.primaryBg : "transparent", color: enableFilter === t ? L.primary : L.muted }} onClick={() => { setEnableFilter(t); setPage(1); }}>
              {t}
              <span className="px-1.5 py-0.5 rounded-full" style={{ background: enableFilter === t ? "rgba(67,97,238,0.18)" : L.bg, color: enableFilter === t ? L.primary : L.muted, fontSize: 10 }}>{(enableCounts as any)[t]}</span>
            </button>
          ))}
        </div>
        <select
          value={regionFilter}
          onChange={event => { setRegionFilter(event.target.value); setPage(1); }}
          className="px-3 py-2 rounded-xl outline-none"
          style={{ background: L.surface, border: `1px solid ${L.border}`, color: L.textSec, fontSize: 12 }}
        >
          {regionTabs.map(region => <option key={region}>{region}</option>)}
        </select>
        <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: L.surface, border: `1px solid ${L.border}`, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
          <Search size={13} style={{ color: L.muted }} />
          <input className="bg-transparent outline-none text-xs flex-1" style={{ color: L.textSec }} placeholder="粘贴完整微信昵称、微信号、手机号、负责人或城市搜索" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          {search && <button onClick={() => setSearch("")}><X size={12} style={{ color: L.muted }} /></button>}
        </div>
        <div className="text-xs px-3 py-2 rounded-xl" style={{ background: L.surface, border: `1px solid ${L.border}`, color: L.muted, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
          共 {filtered.length} 条
        </div>
        <div className="flex gap-0.5 p-1 rounded-xl" style={{ background: L.surface, border: `1px solid ${L.border}` }}>
          <button className="w-8 h-7 rounded-lg flex items-center justify-center" title="列表视图" style={{ background: personalViewMode === "list" ? L.primaryBg : "transparent" }} onClick={() => setPersonalViewMode("list")}><List size={14} style={{ color: personalViewMode === "list" ? L.primary : L.muted }} /></button>
          <button className="w-8 h-7 rounded-lg flex items-center justify-center" title="卡片视图" style={{ background: personalViewMode === "card" ? L.primaryBg : "transparent" }} onClick={() => setPersonalViewMode("card")}><LayoutGrid size={14} style={{ color: personalViewMode === "card" ? L.primary : L.muted }} /></button>
        </div>
      </div>

      <div className="px-3 py-2 rounded-xl flex-shrink-0" style={{ background: "rgba(67,97,238,0.09)", border: `1px solid ${L.border}`, color: L.textSec, fontSize: 11 }}>
        启用状态来自微信号和社群绑定关系；大区只选华北、华东、华南、西南等业务区，不再级联省份。微信昵称搜索会同时匹配原始昵称和去除特殊符号后的昵称。
      </div>

      <div className="flex-1 min-h-0 flex gap-4">
      {/* 数据表格 */}
      {personalViewMode === "list" && <div className="flex-1 rounded-xl overflow-hidden flex flex-col" style={{ background: L.surface, border: `1px solid ${L.border}`, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
        {/* 表头 */}
        <div className="flex items-center px-4 py-2.5 flex-shrink-0 overflow-x-auto" style={{ background: "#1a2640", borderBottom: `1px solid ${L.border}`, minWidth: "fit-content" }}>
          {cols.map(c => (
            <div key={c.label} className="flex-shrink-0 text-xs font-medium" style={{ width: c.w, color: L.muted }}>{c.label}</div>
          ))}
        </div>

        {/* 表体 */}
        <div className="flex-1 overflow-auto">
          {paged.map((w, idx) => {
            const st = statusCfg[w.status] || { bg: L.primaryBg, color: L.primary };
            const purpose = getAccountPurpose(w.wechatId, w.project);
            const pc = purposeCfg[purpose];
            const enableState = getEnableState(w);
            const region = getServiceRegion(w.city);
            const isSelected = selectedRow === w.no;
            const daysAgo = w.lastLogin !== "—" ? Math.floor((new Date("2026-07-05").getTime() - new Date(w.lastLogin).getTime()) / 86400000) : null;
            return (
              <div
                key={w.no}
                className="w-full flex items-center px-4 py-2.5 cursor-pointer transition-all text-left"
                style={{ background: isSelected ? L.primaryBg : "transparent", borderBottom: `1px solid ${L.borderLight}`, borderLeft: isSelected ? `2px solid ${L.primary}` : "2px solid transparent", minWidth: "fit-content" }}
                onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = L.surface2; }}
                onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                onClick={() => setSelectedRow(w.no)}
              >
                {/* 编号 */}
                <div className="flex-shrink-0 text-xs" style={{ width: 64, color: L.mutedLight }}>{w.no}</div>
                {/* 微信号 */}
                <div className="flex-shrink-0 text-xs font-medium" title={w.wechatId} style={{ width: 156, color: isSelected ? L.primary : L.text }}>{w.wechatId}</div>
                {/* 绑定人手机 */}
                <div className="flex-shrink-0 text-xs" style={{ width: 130, color: L.muted }}>{w.phone}</div>
                {/* 状态 */}
                <div className="flex-shrink-0" style={{ width: 76 }}>
                  <span className="px-1.5 py-0.5 rounded-full text-xs" style={{ background: st.bg, color: st.color }}>{w.status}</span>
                </div>
                {/* 启用 */}
                <div className="flex-shrink-0" style={{ width: 76 }}>
                  <span className="px-1.5 py-0.5 rounded-full text-xs" style={{ background: enableState === "已启用" ? "rgba(16,185,129,0.15)" : "rgba(100,116,139,0.15)", color: enableState === "已启用" ? "#34d399" : L.muted }}>{enableState}</span>
                </div>
                {/* 用途 */}
                <div className="flex-shrink-0" style={{ width: 76 }}>
                  <span className="px-1.5 py-0.5 rounded-full text-xs" style={{ background: pc.bg, color: pc.color }}>{purpose}</span>
                </div>
                {/* 头像 */}
                <div className="flex-shrink-0" style={{ width: 52 }}>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-semibold text-white" style={{ background: w.status === "库存" ? "rgba(255,255,255,0.07)" : "linear-gradient(135deg, #4361ee, #7c3aed)" }}>
                    <span style={{ color: w.status === "库存" ? L.muted : "white" }}>{w.avatar}</span>
                  </div>
                </div>
                {/* 微信昵称 */}
                <div className="flex-shrink-0 text-xs truncate" title={w.nickname} style={{ width: 126, color: L.muted }}>{w.nickname}</div>
                {/* 好友数 */}
                <div className="flex-shrink-0 text-xs" style={{ width: 64, color: L.primary }}>{w.friendCount}</div>
                {/* 群数量 */}
                <div className="flex-shrink-0 text-xs" style={{ width: 64, color: L.primary }}>{w.groupCount} 个</div>
                {/* QQ号 */}
                <div className="flex-shrink-0 text-xs" style={{ width: 100, color: L.muted }}>{w.qqNo}</div>
                {/* 绑定邮箱 */}
                <div className="flex-shrink-0 text-xs truncate" style={{ width: 170, color: L.muted }}>{w.boundEmail}</div>
                {/* 负责人 */}
                <div className="flex-shrink-0 text-xs" style={{ width: 90, color: L.textSec }}>{w.manager}</div>
                {/* 认证 */}
                <div className="flex-shrink-0" style={{ width: 56 }}>
                  {w.certified ? <CheckCircle size={14} style={{ color: "#34d399" }} /> : <span className="text-xs" style={{ color: L.mutedLight }}>—</span>}
                </div>
                {/* 已邀新人 */}
                <div className="flex-shrink-0 text-xs font-medium" style={{ width: 72, color: "#34d399" }}>{w.invitedNew}</div>
                {/* 扫描量 */}
                <div className="flex-shrink-0 text-xs" style={{ width: 64, color: L.muted }}>{w.scanCount}</div>
                {/* 服务大区 */}
                <div className="flex-shrink-0 text-xs" style={{ width: 80, color: region === "待配置" ? "#fbbf24" : L.muted }}>{region}</div>
                {/* 城市分站 */}
                <div className="flex-shrink-0 text-xs" style={{ width: 80, color: L.muted }}>{w.city}</div>
                {/* 最近登录 */}
                <div className="flex-shrink-0 text-xs" style={{ width: 90, color: daysAgo !== null && daysAgo > 7 ? "#f87171" : L.muted }}>
                  {daysAgo !== null ? (daysAgo === 0 ? "今天" : `${daysAgo}天前`) : "—"}
                </div>
                {/* 操作 */}
                <div className="flex-shrink-0 flex gap-1.5" style={{ width: 100 }}>
                  <button className="px-2 py-1 rounded text-xs" style={{ background: L.primaryBg, color: L.primary }} onClick={e => e.stopPropagation()}>编辑</button>
                  <button className="px-2 py-1 rounded text-xs" style={{ background: "rgba(245,158,11,0.15)", color: "#fbbf24" }} onClick={e => e.stopPropagation()}>交接</button>
                </div>
              </div>
            );
          })}

          {paged.length === 0 && (
            <div className="py-16 text-center" style={{ color: L.muted }}>
              <div className="text-2xl mb-2">📭</div>
              <div className="text-sm">暂无匹配数据</div>
            </div>
          )}
        </div>

        {/* 分页 */}
        <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" style={{ borderTop: `1px solid ${L.border}` }}>
          <div className="text-xs" style={{ color: L.muted }}>
            第 {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} 条，共 {filtered.length} 条
          </div>
          <div className="flex items-center gap-1">
            <button
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
              style={{ background: page === 1 ? L.bg : L.primaryBg, color: page === 1 ? L.mutedLight : L.primary }}
              onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            >
              <ChevronLeft size={13} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button
                key={p}
                className="w-7 h-7 rounded-lg text-xs transition-all"
                style={{ background: page === p ? "linear-gradient(135deg, #4361ee, #3451d1)" : L.bg, color: page === p ? "white" : L.muted, border: `1px solid ${page === p ? "transparent" : L.border}` }}
                onClick={() => setPage(p)}
              >
                {p}
              </button>
            ))}
            <button
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
              style={{ background: page === totalPages ? L.bg : L.primaryBg, color: page === totalPages ? L.mutedLight : L.primary }}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            >
              <ChevronRight size={13} />
            </button>
          </div>
          <div className="text-xs" style={{ color: L.muted }}>每页 {PAGE_SIZE} 条</div>
        </div>
      </div>}

      {personalViewMode === "card" && (
        <div className="flex-1 overflow-auto">
          <div className="grid grid-cols-3 gap-3 content-start pb-2">
            {paged.map(w => {
              const st = statusCfg[w.status] || { bg: L.primaryBg, color: L.primary };
              const purpose = getAccountPurpose(w.wechatId, w.project);
              const pc = purposeCfg[purpose];
              const enableState = getEnableState(w);
              const region = getServiceRegion(w.city);
              const isSelected = selectedRow === w.no;
              return (
                <button key={w.no} onClick={() => setSelectedRow(w.no)} className="rounded-xl p-4 text-left transition-all" style={{ background: isSelected ? L.primaryBg : L.surface, border: `1px solid ${isSelected ? L.primary : L.border}` }}>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-semibold" style={{ background: w.status === "库存" ? L.surface2 : "linear-gradient(135deg, #4361ee, #7c3aed)", fontSize: 13 }}>{w.avatar}</div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold truncate" style={{ color: L.text, fontSize: 12 }}>{w.wechatId}</div>
                      <div className="mt-0.5 truncate" style={{ color: L.muted, fontSize: 10 }}>{w.nickname} · {w.city}</div>
                      <div className="mt-2 flex gap-1.5">
                        <span className="px-1.5 py-0.5 rounded text-xs" style={{ background: st.bg, color: st.color }}>{w.status}</span>
                        <span className="px-1.5 py-0.5 rounded text-xs" style={{ background: enableState === "已启用" ? "rgba(16,185,129,0.15)" : "rgba(100,116,139,0.15)", color: enableState === "已启用" ? "#34d399" : L.muted }}>{enableState}</span>
                        <span className="px-1.5 py-0.5 rounded text-xs" style={{ background: pc.bg, color: pc.color }}>{purpose}</span>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-4">
                    {[["好友", w.friendCount], ["群数", w.groupCount], ["扫码", w.scanCount]].map(([label, value]) => (
                      <div key={label as string} className="rounded-lg px-2 py-1.5 text-center" style={{ background: L.bg }}>
                        <div className="font-semibold" style={{ color: L.primary, fontSize: 12 }}>{value as number}</div>
                        <div className="mt-0.5" style={{ color: L.muted, fontSize: 9 }}>{label as string}</div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 pt-3 flex items-center justify-between" style={{ borderTop: `1px solid ${L.borderLight}` }}>
                    <span style={{ color: L.muted, fontSize: 10 }}>负责人 {w.manager}</span>
                    <span style={{ color: region === "待配置" ? "#fbbf24" : L.muted, fontSize: 10 }}>{region}</span>
                    <span style={{ color: w.certified ? "#34d399" : L.muted, fontSize: 10 }}>{w.certified ? "已认证" : "未认证"}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {selectedPersonal && <PersonalDetailPanel account={selectedPersonal} onChange={updateSelectedPersonal} onClose={() => setSelectedRow(null)} />}
      </div>

      </> /* end personal WeChat */}
    </div>
  );
}
