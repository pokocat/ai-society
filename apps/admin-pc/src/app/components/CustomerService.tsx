import { useState } from "react";
import { Search, Plus, X, ChevronLeft, ChevronRight, ArrowLeft, Eye, EyeOff, KeyRound, ShieldCheck } from "lucide-react";
import { useProject } from "../contexts/ProjectContext";

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

const PAGE_SIZE = 8;

// ─── 模拟数据 ─────────────────────────────────────────────────
const csStaff = [
  { no: "00001", gender: "女", name: "杨桂英", phone: "13732112621", account: "admin1", area: "华北/吉林", area2: "华北/吉林/吉...", role: "探哥", wechatCount: 0, groupCount: 0, wechats: [] },
  { no: "00009", gender: "女", name: "李娜",   phone: "13732112621", account: "admin2", area: "华南/广西",   area2: "华南/广西/南...", role: "假面", wechatCount: 8, groupCount: 30, wechats: ["FLA001","FLA002"] },
  { no: "00002", gender: "男", name: "吴杰",   phone: "15796482156", account: "admin3", area: "华东/安徽",   area2: "华东/安徽/合...", role: "探哥", wechatCount: 5, groupCount: 30, wechats: ["FLA003","FLA004","FLA005"] },
  { no: "00003", gender: "女", name: "傅小小", phone: "18965442359", account: "admin4", area: "华东/浙江",   area2: "华东/浙江/杭...", role: "假面", wechatCount: 6, groupCount: 30, wechats: ["FLA001","FLA006"] },
  { no: "00004", gender: "男", name: "李超",   phone: "14562358974", account: "admin5", area: "华西/甘肃",   area2: "华西/甘肃/兰...", role: "假面", wechatCount: 9, groupCount: 30, wechats: ["FLA002","FLA007"] },
  { no: "00005", gender: "男", name: "邓磊",   phone: "13754821454", account: "admin6", area: "华中/河北",   area2: "华中/河北/石...", role: "探哥", wechatCount: 1, groupCount: 30, wechats: ["FLA003"] },
  { no: "00006", gender: "男", name: "何杰",   phone: "14858944572", account: "admin7", area: "华南/广西",   area2: "华南/广西/桂...", role: "假面", wechatCount: 1, groupCount: 30, wechats: ["FLA004"] },
  { no: "00007", gender: "男", name: "徐尚",   phone: "15648295763", account: "admin8", area: "华北/辽宁",   area2: "华北/辽宁/沈...", role: "假面", wechatCount: 3, groupCount: 30, wechats: ["FLA001","FLA005","FLA006"] },
  { no: "00008", gender: "女", name: "谭敏仪", phone: "15487235464", account: "admin9", area: "华中/河北",   area2: "华中/河北/保...", role: "假面", wechatCount: 4, groupCount: 30, wechats: ["FLA002","FLA003","FLA007"] },
  { no: "00010", gender: "女", name: "陈小芬", phone: "13987654321", account: "admin10", area: "华东/江苏",  area2: "华东/江苏/南...", role: "探哥", wechatCount: 6, groupCount: 30, wechats: ["FLA004","FLA005"] },
];

// 客服详情页内的微信群数据（按Tab区分）
const wechatTabs = ["FLA001","FLA002","FLA003","FLA004","FLA005","FLA006","FLA007"];
const groupDetail = Array.from({ length: 8 }, (_, i) => ({
  groupNo: `0000${i + 1}`, name: `主理人体验官${i + 1}群`, city: "北京", maskType: "棉花", maskCount: 5,
  status: ["配置完成","待配置","配置完成","配置完成","待配置","配置完成","配置完成","配置完成"][i],
  wechat: "FLA001", type: ["体验官群","游客群","PRO会员群","尊享群","体验官群","家族群","游客群","分站群"][i],
  pushCount: [100, 786, 491, 774, 204, 589, 780, 308][i],
  scanCount: [100, 864, 765, 220, 164, 538, 967, 453][i],
  memberCount: [100, 786, 491, 200, 204, 500, 380, 308][i],
  allowSignup: i % 3 !== 0, recruitTime: `2018-0${(i % 9) + 1}-${10 + i}`,
}));

// ─── 新建客服弹窗 ─────────────────────────────────────────────
function NewStaffModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ no: "", gender: "男", name: "", phone: "", account: "", password: "", role: "探哥" });
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const inputStyle = { background: "#1a2640", border: `1px solid ${L.border}`, color: L.text };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}>
      <div className="w-[400px] rounded-2xl overflow-hidden shadow-2xl" style={{ background: L.surface, border: `1px solid ${L.border}` }}>
        {/* 弹窗头 */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: `1px solid ${L.border}` }}>
          <span className="font-semibold" style={{ color: L.text }}>新建客服</span>
          <button onClick={onClose}><X size={16} style={{ color: L.muted }} /></button>
        </div>

        {/* 表单 */}
        <div className="px-6 py-5 space-y-4">
          {/* 工号 */}
          <div className="flex items-center gap-3">
            <label className="w-20 text-right text-xs flex-shrink-0" style={{ color: L.muted }}>工号：</label>
            <input className="flex-1 px-3 py-2 rounded-lg text-xs outline-none" style={inputStyle} placeholder="000010" value={form.no} onChange={e => set("no", e.target.value)} />
          </div>

          {/* 性别 — 下拉 */}
          <div className="flex items-center gap-3">
            <label className="w-20 text-right text-xs flex-shrink-0" style={{ color: L.muted }}>性别：</label>
            <select className="flex-1 px-3 py-2 rounded-lg text-xs outline-none cursor-pointer" style={inputStyle} value={form.gender} onChange={e => set("gender", e.target.value)}>
              {["男","女"].map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>

          {/* 姓名 */}
          <div className="flex items-center gap-3">
            <label className="w-20 text-right text-xs flex-shrink-0" style={{ color: L.muted }}>姓名：</label>
            <input className="flex-1 px-3 py-2 rounded-lg text-xs outline-none" style={inputStyle} placeholder="皮卡丘" value={form.name} onChange={e => set("name", e.target.value)} />
          </div>

          {/* 手机 */}
          <div className="flex items-center gap-3">
            <label className="w-20 text-right text-xs flex-shrink-0" style={{ color: L.muted }}>手机：</label>
            <input className="flex-1 px-3 py-2 rounded-lg text-xs outline-none" style={inputStyle} placeholder="13732112621" value={form.phone} onChange={e => set("phone", e.target.value)} />
          </div>

          {/* 登录账号 */}
          <div className="flex items-center gap-3">
            <label className="w-20 text-right text-xs flex-shrink-0" style={{ color: L.muted }}>登录账号：</label>
            <input className="flex-1 px-3 py-2 rounded-lg text-xs outline-none" style={inputStyle} placeholder="admin1" value={form.account} onChange={e => set("account", e.target.value)} />
          </div>

          {/* 密码 */}
          <div className="flex items-center gap-3">
            <label className="w-20 text-right text-xs flex-shrink-0" style={{ color: L.muted }}>密码：</label>
            <input type="password" className="flex-1 px-3 py-2 rounded-lg text-xs outline-none" style={inputStyle} placeholder="13732112621" value={form.password} onChange={e => set("password", e.target.value)} />
          </div>

          {/* 服务管 — 下拉 */}
          <div className="flex items-center gap-3">
            <label className="w-20 text-right text-xs flex-shrink-0" style={{ color: L.muted }}>服务管：</label>
            <select className="flex-1 px-3 py-2 rounded-lg text-xs outline-none cursor-pointer" style={inputStyle} value={form.role} onChange={e => set("role", e.target.value)}>
              {["探哥","假面"].map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex justify-center px-6 py-4" style={{ borderTop: `1px solid ${L.border}` }}>
          <button className="px-10 py-2.5 rounded-xl text-sm text-white font-medium" style={{ background: "linear-gradient(135deg, #4361ee, #3451d1)" }} onClick={onClose}>
            保存
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── 客服详情页 ───────────────────────────────────────────────
function StaffDetail({ staff, onBack }: { staff: typeof csStaff[0]; onBack: () => void }) {
  const [activeTab, setActiveTab] = useState(wechatTabs[0]);
  const statusCfg: Record<string, { bg: string; color: string }> = {
    "配置完成": { bg: "rgba(16,185,129,0.15)", color: "#34d399" },
    "待配置":   { bg: "rgba(245,158,11,0.15)", color: "#fbbf24" },
  };
  const typeCfg: Record<string, { color: string }> = {
    "体验官群": { color: "#34d399" }, "游客群": { color: "#94a3b8" },
    "PRO会员群": { color: "#4361ee" }, "尊享群": { color: "#fbbf24" },
    "家族群": { color: "#9d174d" }, "分站群": { color: "#818cf8" },
  };

  return (
    <div className="p-6 h-full flex flex-col gap-4" style={{ background: L.bg }}>
      {/* 面包屑 */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <button className="flex items-center gap-1.5 text-sm" style={{ color: L.primary }} onClick={onBack}>
          <ArrowLeft size={15} /> 返回客服列表
        </button>
        <span style={{ color: L.muted }}>›</span>
        <span className="text-sm font-medium" style={{ color: L.text }}>客服·{staff.name}</span>
      </div>

      {/* 客服信息卡 */}
      <div className="rounded-xl p-5 flex-shrink-0" style={{ background: L.surface, border: `1px solid ${L.border}`, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
        <div className="flex items-start gap-5">
          {/* 头像 */}
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold text-white flex-shrink-0" style={{ background: "linear-gradient(135deg, #4361ee, #7c3aed)" }}>
            {staff.name[0]}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-lg font-semibold" style={{ color: L.text }}>{staff.name}</span>
              <span className="px-2 py-0.5 rounded-full text-xs" style={{ background: staff.gender === "女" ? "#fce7f3" : "rgba(67,97,238,0.15)", color: staff.gender === "女" ? "#9d174d" : "#818cf8" }}>{staff.gender}</span>
              <span className="px-2 py-0.5 rounded-full text-xs" style={{ background: L.primaryBg, color: L.primary }}>{staff.role}</span>
            </div>
            <div className="grid grid-cols-3 gap-x-8 gap-y-2">
              {[
                ["工号", staff.no], ["查看账号", staff.account],
                ["电话", staff.phone], ["管理地区", staff.area2],
              ].map(([k, v]) => (
                <div key={k} className="flex gap-2 text-xs">
                  <span style={{ color: L.muted }}>{k}：</span>
                  <span style={{ color: L.textSec }}>{v}</span>
                </div>
              ))}
              <div className="flex items-center gap-2 text-xs">
                <span style={{ color: L.muted }}>登录凭据：</span>
                <span className="flex items-center gap-1" style={{ color: "#34d399" }}><ShieldCheck size={12} />已托管</span>
                <button className="px-2 py-1 rounded-md flex items-center gap-1" style={{ color: "#818cf8", background: L.primaryBg, fontSize: 9 }}><KeyRound size={10} />申请重置</button>
              </div>
            </div>
          </div>
          <div className="flex gap-4 flex-shrink-0">
            <div className="text-center px-4 py-2 rounded-xl" style={{ background: L.primaryBg, border: `1px solid ${L.border}` }}>
              <div className="text-xl font-bold" style={{ color: L.primary }}>{staff.wechatCount}</div>
              <div className="text-xs mt-0.5" style={{ color: L.muted }}>配置微信数</div>
            </div>
            <div className="text-center px-4 py-2 rounded-xl" style={{ background: "rgba(16,185,129,0.15)", border: `1px solid ${L.border}` }}>
              <div className="text-xl font-bold" style={{ color: "#34d399" }}>{staff.groupCount}</div>
              <div className="text-xs mt-0.5" style={{ color: L.muted }}>管理群数</div>
            </div>
          </div>
        </div>

        {/* 微信 Tab */}
        <div className="flex gap-1 mt-4 pt-4 flex-wrap" style={{ borderTop: `1px solid ${L.border}` }}>
          {wechatTabs.map(t => (
            <button key={t} className="px-3 py-1.5 rounded-lg text-xs transition-all" style={{ background: activeTab === t ? "linear-gradient(135deg, #4361ee, #3451d1)" : L.bg, color: activeTab === t ? "white" : L.muted, border: `1px solid ${activeTab === t ? "transparent" : L.border}` }} onClick={() => setActiveTab(t)}>
              {t}
            </button>
          ))}
          <button className="px-3 py-1.5 rounded-lg text-xs ml-auto" style={{ background: "linear-gradient(135deg, #4361ee, #3451d1)", color: "white" }}>配置微信</button>
        </div>
      </div>

      {/* 微信管理信息表 */}
      <div className="text-sm font-medium flex-shrink-0" style={{ color: L.primary }}>
        微信管理信息 — {activeTab}
      </div>
      <div className="flex-1 rounded-xl overflow-hidden flex flex-col" style={{ background: L.surface, border: `1px solid ${L.border}`, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
        <div className="flex items-center px-4 py-2.5 flex-shrink-0 text-xs" style={{ background: "#1a2640", borderBottom: `1px solid ${L.border}`, color: L.muted, minWidth: "fit-content" }}>
          {[["群编号",70],["群名",160],["地区",80],["口罩类型",80],["口罩数量",70],["配置状态",80],["群主微信",90],["群类型",90],["推送次数",75],["扫码次数",75],["入群人数",75],["是否报名",75],["招募时间",100]].map(([l,w]) => (
            <div key={l as string} className="flex-shrink-0" style={{ width: w as number }}>{l}</div>
          ))}
        </div>
        <div className="flex-1 overflow-auto">
          {groupDetail.map((g, idx) => {
            const st = statusCfg[g.status];
            const tc = typeCfg[g.type] || { color: L.muted };
            return (
              <div key={g.groupNo} className="flex items-center px-4 py-2.5 text-xs" style={{ background: "transparent", borderBottom: `1px solid ${L.borderLight}`, minWidth: "fit-content" }}>
                <div className="flex-shrink-0" style={{ width: 70, color: L.muted }}>{g.groupNo}</div>
                <div className="flex-shrink-0 font-medium" style={{ width: 160, color: L.text }}>{g.name}</div>
                <div className="flex-shrink-0" style={{ width: 80, color: L.muted }}>{g.city}</div>
                <div className="flex-shrink-0" style={{ width: 80, color: L.muted }}>{g.maskType}</div>
                <div className="flex-shrink-0" style={{ width: 70, color: L.muted }}>{g.maskCount}</div>
                <div className="flex-shrink-0" style={{ width: 80 }}>
                  <span className="px-1.5 py-0.5 rounded-full" style={{ background: st.bg, color: st.color }}>{g.status}</span>
                </div>
                <div className="flex-shrink-0" style={{ width: 90, color: L.primary }}>{g.wechat}</div>
                <div className="flex-shrink-0" style={{ width: 90, color: tc.color }}>{g.type}</div>
                <div className="flex-shrink-0 font-medium" style={{ width: 75, color: "#34d399" }}>{g.pushCount}</div>
                <div className="flex-shrink-0" style={{ width: 75, color: "#818cf8" }}>{g.scanCount}</div>
                <div className="flex-shrink-0" style={{ width: 75, color: L.primary }}>{g.memberCount}</div>
                <div className="flex-shrink-0" style={{ width: 75 }}>
                  <span className="px-1.5 py-0.5 rounded-full" style={{ background: g.allowSignup ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)", color: g.allowSignup ? "#34d399" : "#f87171" }}>{g.allowSignup ? "允许" : "不允许"}</span>
                </div>
                <div className="flex-shrink-0" style={{ width: 100, color: L.muted }}>{g.recruitTime}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── 主列表页 ─────────────────────────────────────────────────
export default function CustomerService() {
  const { currentProject } = useProject();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [detailStaff, setDetailStaff] = useState<typeof csStaff[0] | null>(null);

  if (detailStaff) return <StaffDetail staff={detailStaff} onBack={() => setDetailStaff(null)} />;

  const filtered = csStaff.filter(s => s.name.includes(search) || s.no.includes(search) || s.area.includes(search) || s.account.includes(search));
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const cols: [string, number][] = [["工号",64],["性别",52],["姓名",90],["手机",130],["登录账号",110],["登录凭据",120],["管理地区",140],["服务官",72],["配置微信号(个)",110],["管理群数(个)",110],["操作",80]];

  return (
    <div className="p-6 h-full flex flex-col gap-4" style={{ background: L.bg }}>
      {showModal && <NewStaffModal onClose={() => setShowModal(false)} />}

      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <div className="flex items-center gap-2"><h2 className="font-semibold" style={{ color: L.text }}>客服与服务资源</h2><span className="px-2 py-0.5 rounded-md" style={{ color: currentProject.accent, background: `${currentProject.accent}15`, fontSize: 9 }}>{currentProject.shortName}</span></div>
          <p className="text-xs mt-0.5" style={{ color: L.muted }}>管理项目客服、服务地区、微信号和群组，登录凭据统一托管</p>
        </div>
        <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm text-white font-medium" style={{ background: "linear-gradient(135deg, #4361ee, #3451d1)" }} onClick={() => setShowModal(true)}>
          <Plus size={15} /> 新建客服
        </button>
      </div>

      {/* 搜索 */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: L.surface, border: `1px solid ${L.border}`, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
          <Search size={13} style={{ color: L.muted }} />
          <input className="bg-transparent outline-none text-xs flex-1" style={{ color: L.textSec }} placeholder="请输入工号或姓名..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          {search && <button onClick={() => setSearch("")}><X size={12} style={{ color: L.muted }} /></button>}
        </div>
        <div className="text-xs px-3 py-2 rounded-xl" style={{ background: L.surface, border: `1px solid ${L.border}`, color: L.muted, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>共 {filtered.length} 名客服</div>
      </div>

      {/* 表格 */}
      <div className="flex-1 rounded-xl overflow-hidden flex flex-col" style={{ background: L.surface, border: `1px solid ${L.border}`, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
        <div className="flex items-center px-4 py-2.5 flex-shrink-0 text-xs" style={{ background: "#1a2640", borderBottom: `1px solid ${L.border}`, color: L.muted, minWidth: "fit-content" }}>
          {cols.map(([l, w]) => <div key={l} className="flex-shrink-0" style={{ width: w }}>{l}</div>)}
        </div>
        <div className="flex-1 overflow-auto">
          {paged.map((s, idx) => (
            <div key={s.no} className="flex items-center px-4 py-3 text-xs transition-all" style={{ background: "transparent", borderBottom: `1px solid ${L.borderLight}`, minWidth: "fit-content" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = L.surface2; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              <div className="flex-shrink-0" style={{ width: 64, color: L.muted }}>{s.no}</div>
              <div className="flex-shrink-0" style={{ width: 52 }}>
                <span className="px-1.5 py-0.5 rounded-full" style={{ background: s.gender === "女" ? "#fce7f3" : "rgba(67,97,238,0.15)", color: s.gender === "女" ? "#9d174d" : "#818cf8" }}>{s.gender}</span>
              </div>
              <div className="flex-shrink-0 font-medium" style={{ width: 90, color: L.text }}>{s.name}</div>
              <div className="flex-shrink-0" style={{ width: 130, color: L.muted }}>{s.phone}</div>
              <div className="flex-shrink-0" style={{ width: 110, color: L.primary }}>{s.account}</div>
              <div className="flex-shrink-0" style={{ width: 120 }}>
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md" style={{ color: "#34d399", background: "rgba(52,211,153,0.11)", fontSize: 9 }}><ShieldCheck size={10} />安全托管</span>
              </div>
              <div className="flex-shrink-0" style={{ width: 140, color: L.muted }}>{s.area2}</div>
              <div className="flex-shrink-0" style={{ width: 72 }}>
                <span className="px-2 py-0.5 rounded-full text-xs" style={{ background: L.primaryBg, color: L.primary }}>{s.role}</span>
              </div>
              <div className="flex-shrink-0 font-medium" style={{ width: 110, color: s.wechatCount > 0 ? "#34d399" : L.muted }}>{s.wechatCount > 0 ? s.wechatCount : "暂无"}</div>
              <div className="flex-shrink-0 font-medium" style={{ width: 110, color: s.groupCount > 0 ? "#34d399" : L.muted }}>{s.groupCount > 0 ? s.groupCount : "暂无"}</div>
              <div className="flex-shrink-0" style={{ width: 80 }}>
                <button className="px-3 py-1.5 rounded-lg text-xs text-white" style={{ background: "linear-gradient(135deg, #4361ee, #3451d1)" }} onClick={() => setDetailStaff(s)}>管理</button>
              </div>
            </div>
          ))}
        </div>

        {/* 分页 */}
        <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" style={{ borderTop: `1px solid ${L.border}` }}>
          <div className="text-xs" style={{ color: L.muted }}>第 {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} 条，共 {filtered.length} 条</div>
          <div className="flex items-center gap-1">
            <button className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: page === 1 ? L.bg : L.primaryBg, color: page === 1 ? L.mutedLight : L.primary }} onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}><ChevronLeft size={13} /></button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button key={p} className="w-7 h-7 rounded-lg text-xs" style={{ background: page === p ? "linear-gradient(135deg, #4361ee, #3451d1)" : L.bg, color: page === p ? "white" : L.muted, border: `1px solid ${page === p ? "transparent" : L.border}` }} onClick={() => setPage(p)}>{p}</button>
            ))}
            <button className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: page === totalPages ? L.bg : L.primaryBg, color: page === totalPages ? L.mutedLight : L.primary }} onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}><ChevronRight size={13} /></button>
          </div>
          <div className="text-xs" style={{ color: L.muted }}>每页 {PAGE_SIZE} 条</div>
        </div>
      </div>
    </div>
  );
}
