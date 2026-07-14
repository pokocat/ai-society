import { useState } from "react";
import { Search, Plus, X, ChevronLeft, ChevronRight, QrCode, Users, LayoutGrid, List, ArrowLeft, AlertTriangle, Filter, Columns3, PanelRight, CheckCircle2 } from "lucide-react";
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
const mockGroups = [
  { no: "00001", name: "蜂乐玛体验官1群", city: "北京/吉林", wechat: "FLM001", groupNo: "000001", type: "体验官群", ownerStatus: "正常", pushCount: 100, scanCount: 100, memberCount: 100, max: 200 },
  { no: "00002", name: "蜂乐玛体验官2群", city: "北京/吉林", wechat: "FLM001", groupNo: "000002", type: "体验官群", ownerStatus: "正常", pushCount: 786, scanCount: 864, memberCount: 786, max: 1000 },
  { no: "00003", name: "蜂乐玛体验官3群", city: "北京/吉林", wechat: "FLM001", groupNo: "000003", type: "体验官群", ownerStatus: "正常", pushCount: 491, scanCount: 765, memberCount: 491, max: 500 },
  { no: "00004", name: "蜂乐玛尊享群1", city: "上海", wechat: "FLM002", groupNo: "000004", type: "尊享群", ownerStatus: "正常", pushCount: 774, scanCount: 220, memberCount: 200, max: 200 },
  { no: "00005", name: "蜂乐玛游客群1", city: "广州", wechat: "FLM003", groupNo: "000005", type: "游客群", ownerStatus: "正常", pushCount: 204, scanCount: 164, memberCount: 204, max: 500 },
  { no: "00006", name: "蜂乐玛家族群1", city: "深圳", wechat: "FLM004", groupNo: "000006", type: "家族群", ownerStatus: "正常", pushCount: 589, scanCount: 538, memberCount: 500, max: 500 },
  { no: "00007", name: "蜂乐玛体验官4群", city: "成都", wechat: "FLM005", groupNo: "000007", type: "体验官群", ownerStatus: "正常", pushCount: 780, scanCount: 967, memberCount: 380, max: 500 },
  { no: "00008", name: "蜂乐玛游客群2", city: "杭州", wechat: "FLM006", groupNo: "000008", type: "游客群", ownerStatus: "正常", pushCount: 401, scanCount: 805, memberCount: 401, max: 500 },
  { no: "00009", name: "蜂乐玛游客群3", city: "武汉", wechat: "FLM007", groupNo: "000009", type: "游客群", ownerStatus: "正常", pushCount: 308, scanCount: 453, memberCount: 308, max: 500 },
  { no: "00010", name: "蜂乐玛分站管理群", city: "南京", wechat: "FLM008", groupNo: "000010", type: "分站管理群", ownerStatus: "待交接", pushCount: 308, scanCount: 453, memberCount: 88, max: 200 },
  { no: "00011", name: "蜂乐玛PRO会员群1", city: "北京", wechat: "FLM001", groupNo: "000011", type: "PRO会员群", ownerStatus: "正常", pushCount: 0, scanCount: 0, memberCount: 312, max: 500 },
  { no: "00012", name: "蜂乐玛PRO会员群2", city: "上海", wechat: "FLM002", groupNo: "000012", type: "PRO会员群", ownerStatus: "正常", pushCount: 0, scanCount: 0, memberCount: 278, max: 500 },
];

// ─── 群成员数据（每个群共享同一份模拟数据，实际应按群ID区分）───
const mockMembers = [
  { no: "00001", avatar: "盛", wechatName: "盛光年", name: "程涛", wechatId: "THEv424", city: "北京-北...", level: "体验官", scanHistory: 3, phone: "13732112621", referrer: "皮卡丘", family: "暂无", influence: 2721, revenue: 9815, inGroup: true },
  { no: "00002", avatar: "皮", wechatName: "皮卡丘", name: "钱军", wechatId: "imp11", city: "北京-北...", level: "体验官", scanHistory: 4, phone: "13732112621", referrer: "皮卡丘", family: "暂无", influence: 177, revenue: 6305, inGroup: true },
  { no: "00003", avatar: "D", wechatName: "Deborah Rodriguez", name: "文泽", wechatId: "FLM001", city: "北京-北...", level: "体验官", scanHistory: 6, phone: "13732112621", referrer: "皮卡丘", family: "暂无", influence: 972, revenue: 9320, inGroup: true },
  { no: "00004", avatar: "梓", wechatName: "梓几", name: "许明", wechatId: "afs612", city: "北京-北...", level: "体验官", scanHistory: 1, phone: "13732112621", referrer: "皮卡丘", family: "暂无", influence: 173, revenue: 9658, inGroup: true },
  { no: "00005", avatar: "海", wechatName: "海槽", name: "彭丽", wechatId: "125gfs", city: "北京-北...", level: "体验官", scanHistory: 2, phone: "13732112621", referrer: "皮卡丘", family: "暂无", influence: 908, revenue: 5166, inGroup: true },
  { no: "00006", avatar: "D", wechatName: "Deborah Martinez", name: "罗平", wechatId: "DG1245", city: "北京-北...", level: "体验官", scanHistory: 5, phone: "13732112621", referrer: "皮卡丘", family: "暂无", influence: 496, revenue: 1807, inGroup: true },
  { no: "00007", avatar: "小", wechatName: "小鸡猪", name: "魏静", wechatId: "?qiuzi512", city: "北京-北...", level: "体验官", scanHistory: 2, phone: "13732112621", referrer: "皮卡丘", family: "暂无", influence: 508, revenue: 3956, inGroup: false },
  { no: "00008", avatar: "J", wechatName: "Jessica Anderson", name: "夏雨", wechatId: "dashu25", city: "北京-北...", level: "体验官", scanHistory: 3, phone: "13732112621", referrer: "皮卡丘", family: "暂无", influence: 685, revenue: 6459, inGroup: true },
  { no: "00009", avatar: "漠", wechatName: "漠萝君", name: "唐芳", wechatId: "blgd321", city: "北京-北...", level: "体验官", scanHistory: 7, phone: "13732112621", referrer: "皮卡丘", family: "暂无", influence: 831, revenue: 2817, inGroup: true },
];

const typeCfg: Record<string, { bg: string; color: string }> = {
  "体验官群":  { bg: "rgba(16,185,129,0.15)",  color: "#34d399" },
  "PRO会员群": { bg: "rgba(67,97,238,0.12)",  color: "#4361ee" },
  "游客群":    { bg: "rgba(100,116,139,0.15)",  color: "#94a3b8" },
  "尊享群":    { bg: "rgba(245,158,11,0.15)",  color: "#fbbf24" },
  "家族群":    { bg: "#fce7f3",  color: "#9d174d" },
  "分站管理群":{ bg: "rgba(67,97,238,0.15)",  color: "#818cf8" },
};

const PAGE_SIZE = 8;

const regionByCity: Record<string, string> = {
  北京: "华北区",
  吉林: "华北区",
  上海: "华东区",
  杭州: "华东区",
  南京: "华东区",
  广州: "华南区",
  深圳: "华南区",
  成都: "西南区",
  武汉: "华中区",
};

const getRegion = (city: string) => {
  const matched = Object.keys(regionByCity).find(item => city.includes(item));
  return matched ? regionByCity[matched] : "全国";
};

const getWechatRole = (type: string) => type.includes("游客") || type.includes("分站") ? "招商号" : "客服号";
const getCapacityUnit = (type: string) => type.includes("游客") ? "人次" : "人数";

// ─── 新建微信群弹窗 ────────────────────────────────────────────
function NewGroupModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ project: "", type: "", city: "", wechat: "", groupNo: "", name: "", note: "", manager: "", service: "", pushCount: "100", scanCount: "100", assignedCount: "0", capacityLimit: "90" });
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const groupTypes = ["体验官群", "PRO会员群", "游客群", "尊享群", "家族群", "分站管理群"];
  const wechatOptions = mockGroups.map(g => g.wechat).filter((v, i, a) => a.indexOf(v) === i);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}>
      <div className="w-[500px] rounded-2xl overflow-hidden shadow-2xl" style={{ background: L.surface, border: `1px solid ${L.border}` }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: `1px solid ${L.border}` }}>
          <span className="font-semibold" style={{ color: L.text }}>新建微信群</span>
          <button onClick={onClose}><X size={16} style={{ color: L.muted }} /></button>
        </div>

        <div className="p-6 grid grid-cols-2 gap-4" style={{ maxHeight: "68vh", overflowY: "auto" }}>
          {/* 项目分类 */}
          <div>
            <label className="block text-xs mb-1.5" style={{ color: L.muted }}>项目分类</label>
            <select className="w-full px-3 py-2 rounded-lg text-xs outline-none" style={{ background: "#1a2640", border: `1px solid ${L.border}`, color: L.text }} value={form.project} onChange={e => set("project", e.target.value)}>
              <option value="">请选择</option>
              {["蜂乐码", "蜂乐玛PRO", "体验营", "代理"].map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>

          {/* 群类型 */}
          <div>
            <label className="block text-xs mb-1.5" style={{ color: L.muted }}>群类型</label>
            <select className="w-full px-3 py-2 rounded-lg text-xs outline-none" style={{ background: "#1a2640", border: `1px solid ${L.border}`, color: L.text }} value={form.type} onChange={e => set("type", e.target.value)}>
              <option value="">请选择</option>
              {groupTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* 管理地区 */}
          <div>
            <label className="block text-xs mb-1.5" style={{ color: L.muted }}>管理地区</label>
            <select className="w-full px-3 py-2 rounded-lg text-xs outline-none" style={{ background: "#1a2640", border: `1px solid ${L.border}`, color: L.text }} value={form.city} onChange={e => set("city", e.target.value)}>
              <option value="">请选择</option>
              {["北京", "吉林", "上海", "广州", "深圳", "成都", "杭州", "武汉"].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* 所属微信 */}
          <div>
            <label className="block text-xs mb-1.5" style={{ color: L.muted }}>所属微信</label>
            <select className="w-full px-3 py-2 rounded-lg text-xs outline-none" style={{ background: "#1a2640", border: `1px solid ${L.border}`, color: L.text }} value={form.wechat} onChange={e => set("wechat", e.target.value)}>
              <option value="">请选择</option>
              {wechatOptions.map(w => <option key={w} value={w}>{w}</option>)}
            </select>
          </div>

          {/* 群编号 */}
          <div>
            <label className="block text-xs mb-1.5" style={{ color: L.muted }}>群编号</label>
            <input className="w-full px-3 py-2 rounded-lg text-xs outline-none" style={{ background: "#1a2640", border: `1px solid ${L.border}`, color: L.text }} placeholder="如 000013" value={form.groupNo} onChange={e => set("groupNo", e.target.value)} />
          </div>

          {/* 群名 */}
          <div>
            <label className="block text-xs mb-1.5" style={{ color: L.muted }}>群名</label>
            <input className="w-full px-3 py-2 rounded-lg text-xs outline-none" style={{ background: "#1a2640", border: `1px solid ${L.border}`, color: L.text }} placeholder="如 吉林蜂乐玛游客群1" value={form.name} onChange={e => set("name", e.target.value)} />
          </div>

          {/* 群管理 */}
          <div>
            <label className="block text-xs mb-1.5" style={{ color: L.muted }}>群管理</label>
            <input className="w-full px-3 py-2 rounded-lg text-xs outline-none" style={{ background: "#1a2640", border: `1px solid ${L.border}`, color: L.text }} placeholder="负责人姓名" value={form.manager} onChange={e => set("manager", e.target.value)} />
          </div>

          {/* 所属客服 */}
          <div>
            <label className="block text-xs mb-1.5" style={{ color: L.muted }}>所属客服</label>
            <input className="w-full px-3 py-2 rounded-lg text-xs outline-none" style={{ background: "#1a2640", border: `1px solid ${L.border}`, color: L.text }} placeholder="客服姓名" value={form.service} onChange={e => set("service", e.target.value)} />
          </div>

          {/* 推送次数 / 扫码次数 / 分配容量 */}
          {[
            { label: "推送次数", key: "pushCount" },
            { label: "扫码次数", key: "scanCount" },
            { label: `已分配${getCapacityUnit(form.type)}`, key: "assignedCount" },
            { label: `可分配${getCapacityUnit(form.type)}上限`, key: "capacityLimit" },
          ].map(f => (
            <div key={f.key}>
              <label className="block text-xs mb-1.5" style={{ color: L.muted }}>{f.label}</label>
              <input className="w-full px-3 py-2 rounded-lg text-xs outline-none" style={{ background: "#1a2640", border: `1px solid ${L.border}`, color: L.text }} placeholder="100" value={(form as any)[f.key]} onChange={e => set(f.key, e.target.value)} />
            </div>
          ))}

          {/* 群二维码 */}
          <div className="col-span-2">
            <label className="block text-xs mb-1.5" style={{ color: L.muted }}>群二维码</label>
            <div className="flex items-center gap-3 px-4 py-4 rounded-xl border-dashed cursor-pointer" style={{ border: `1px dashed ${L.border}`, background: L.bg }}>
              <QrCode size={18} style={{ color: L.primary }} />
              <div>
                <div className="text-xs" style={{ color: L.primary }}>点击上传群二维码图片</div>
                <div className="text-xs mt-0.5" style={{ color: L.muted }}>支持 PNG / JPG，建议 500×500px</div>
              </div>
            </div>
          </div>

          {/* 群备注 */}
          <div className="col-span-2">
            <label className="block text-xs mb-1.5" style={{ color: L.muted }}>群备注</label>
            <textarea className="w-full px-3 py-2 rounded-lg text-xs outline-none resize-none" rows={2}
              style={{ background: "#1a2640", border: `1px solid ${L.border}`, color: L.text }}
              placeholder="其他说明..." value={form.note} onChange={e => set("note", e.target.value)} />
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

// ─── 入群人名单 ────────────────────────────────────────────────
function MemberList({ group, onBack }: { group: typeof mockGroups[0]; onBack: () => void }) {
  const [search, setSearch] = useState("");
  const [joinFilter, setJoinFilter] = useState<"全部" | "已入群" | "未入群">("全部");
  const [page, setPage] = useState(1);

  const filtered = mockMembers.filter(m =>
    (joinFilter === "全部" || (joinFilter === "已入群" ? m.inGroup : !m.inGroup)) &&
    (m.wechatName.includes(search) || m.name.includes(search) || m.wechatId.includes(search) || m.phone.includes(search))
  );
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const cols = [
    { label: "编号", w: 60 }, { label: "头像", w: 48 }, { label: "微信名", w: 130 },
    { label: "姓名", w: 80 }, { label: "微信号", w: 110 }, { label: "地址", w: 100 },
    { label: "等级", w: 80 }, { label: "历史扫码", w: 76 }, { label: "手机号码", w: 120 }, { label: "推荐人", w: 80 },
    { label: "家族", w: 70 }, { label: "影响力", w: 70 }, { label: "收益", w: 70 }, { label: "是否进群", w: 80 }, { label: "操作", w: 60 },
  ];

  return (
    <div className="p-6 h-full flex flex-col gap-4" style={{ background: L.bg }}>
      {/* 面包屑 */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <button className="flex items-center gap-1.5 text-sm" style={{ color: L.primary }} onClick={onBack}>
          <ArrowLeft size={15} /> 返回群列表
        </button>
        <span style={{ color: L.muted }}>›</span>
        <span className="text-sm font-medium" style={{ color: L.text }}>{group.name}</span>
        <span className="px-2 py-0.5 rounded-full text-xs ml-1" style={{ background: L.primaryBg, color: L.primary }}>入群人名单</span>
      </div>

      {/* 群信息条 */}
      <div className="flex items-center gap-6 px-4 py-3 rounded-xl flex-shrink-0" style={{ background: L.surface, border: `1px solid ${L.border}`, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
        <div className="text-xs" style={{ color: L.muted }}>群编号 <span className="ml-1 font-medium" style={{ color: L.text }}>{group.groupNo}</span></div>
        <div className="text-xs" style={{ color: L.muted }}>所属微信 <span className="ml-1 font-medium" style={{ color: L.text }}>{group.wechat}</span></div>
        <div className="text-xs" style={{ color: L.muted }}>城市 <span className="ml-1 font-medium" style={{ color: L.text }}>{group.city}</span></div>
        <div className="text-xs" style={{ color: L.muted }}>推送次数 <span style={{ color: "#34d399" }} className="ml-1 font-medium">{group.pushCount}</span></div>
        <div className="text-xs" style={{ color: L.muted }}>扫码次数 <span style={{ color: "#818cf8" }} className="ml-1 font-medium">{group.scanCount}</span></div>
        <div className="text-xs" style={{ color: L.muted }}>已分配{getCapacityUnit(group.type)} <span style={{ color: L.primary }} className="ml-1 font-medium">{group.memberCount}/{group.max}</span></div>
        <div className="ml-auto flex items-center gap-1 p-1 rounded-lg" style={{ background: "#1a2640", border: `1px solid ${L.border}` }}>
          {(["全部", "已入群", "未入群"] as const).map(item => (
            <button key={item} onClick={() => { setJoinFilter(item); setPage(1); }} className="px-2 py-1 rounded-md text-xs" style={{ color: joinFilter === item ? "white" : L.muted, background: joinFilter === item ? L.primary : "transparent" }}>{item}</button>
          ))}
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: "#1a2640", border: `1px solid ${L.border}` }}>
          <Search size={12} style={{ color: L.muted }} />
          <input className="bg-transparent outline-none text-xs w-32" style={{ color: L.textSec }} placeholder="搜索成员..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
      </div>

      {/* 成员表格 */}
      <div className="flex-1 rounded-xl overflow-hidden flex flex-col" style={{ background: L.surface, border: `1px solid ${L.border}`, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
        <div className="flex items-center px-4 py-2.5 flex-shrink-0" style={{ background: "#1a2640", borderBottom: `1px solid ${L.border}`, minWidth: "fit-content" }}>
          {cols.map(c => (
            <div key={c.label} className="flex-shrink-0 text-xs font-medium" style={{ width: c.w, color: L.muted }}>{c.label}</div>
          ))}
        </div>

        <div className="flex-1 overflow-auto">
          {paged.map((m, idx) => (
            <div key={m.no} className="flex items-center px-4 py-2.5 transition-all" style={{ background: "transparent", borderBottom: `1px solid ${L.borderLight}`, minWidth: "fit-content" }}>
              <div className="flex-shrink-0 text-xs" style={{ width: 60, color: L.muted }}>{m.no}</div>
              <div className="flex-shrink-0" style={{ width: 48 }}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-semibold text-white" style={{ background: "linear-gradient(135deg, #4361ee, #7c3aed)" }}>{m.avatar}</div>
              </div>
              <div className="flex-shrink-0 text-xs font-medium" style={{ width: 130, color: L.text }}>{m.wechatName}</div>
              <div className="flex-shrink-0 text-xs" style={{ width: 80, color: L.muted }}>{m.name}</div>
              <div className="flex-shrink-0 text-xs" style={{ width: 110, color: L.muted }}>{m.wechatId}</div>
              <div className="flex-shrink-0 text-xs" style={{ width: 100, color: L.muted }}>{m.city}</div>
              <div className="flex-shrink-0" style={{ width: 80 }}>
                <span className="px-1.5 py-0.5 rounded-full text-xs" style={{ background: "rgba(16,185,129,0.15)", color: "#34d399" }}>{m.level}</span>
              </div>
              <div className="flex-shrink-0 text-xs font-medium" style={{ width: 76, color: "#818cf8" }}>{m.scanHistory} 次</div>
              <div className="flex-shrink-0 text-xs" style={{ width: 120, color: L.muted }}>{m.phone}</div>
              <div className="flex-shrink-0 text-xs" style={{ width: 80, color: L.muted }}>{m.referrer}</div>
              <div className="flex-shrink-0 text-xs" style={{ width: 70, color: L.muted }}>{m.family}</div>
              <div className="flex-shrink-0 text-xs font-medium" style={{ width: 70, color: "#fbbf24" }}>{m.influence}</div>
              <div className="flex-shrink-0 text-xs font-medium" style={{ width: 70, color: "#34d399" }}>{m.revenue}</div>
              <div className="flex-shrink-0" style={{ width: 80 }}>
                <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: m.inGroup ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)", color: m.inGroup ? "#34d399" : "#f87171" }}>{m.inGroup ? "是" : "否"}</span>
              </div>
              <div className="flex-shrink-0" style={{ width: 60 }}>
                <button className="px-2 py-1 rounded text-xs" style={{ background: L.primaryBg, color: L.primary }}>修改</button>
              </div>
            </div>
          ))}
        </div>

        {/* 分页 */}
        <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" style={{ borderTop: `1px solid ${L.border}` }}>
          <div className="text-xs" style={{ color: L.muted }}>共 {filtered.length} 条成员</div>
          <div className="flex items-center gap-1">
            <button className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: page === 1 ? L.bg : L.primaryBg, color: page === 1 ? L.mutedLight : L.primary }} onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}><ChevronLeft size={13} /></button>
            {Array.from({ length: Math.max(1, totalPages) }, (_, i) => i + 1).map(p => (
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

// ─── 主组件 ───────────────────────────────────────────────────
export default function CommunityManagement() {
  const { currentProject } = useProject();
  const { accounts: resourceAccounts, groups: resourceGroups } = useResources();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("全部");
  const [regionFilter, setRegionFilter] = useState("全部大区");
  const [wechatFilter, setWechatFilter] = useState("全部微信");
  const [viewMode, setViewMode] = useState<"table" | "card">("table");
  const [displayMode, setDisplayMode] = useState<"operations" | "status" | "detail">("operations");
  const [selectedGroupNo, setSelectedGroupNo] = useState(mockGroups[0].no);
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [memberGroup, setMemberGroup] = useState<typeof mockGroups[0] | null>(null);

  if (memberGroup) return <MemberList group={memberGroup} onBack={() => setMemberGroup(null)} />;

  const activeGroups = resourceGroups.filter(group => group.projectId === currentProject.id).map(group => {
    const builder = resourceAccounts.find(account => account.id === group.builder);
    return {
      no: group.id,
      name: group.name,
      city: group.city,
      wechat: builder?.account ?? group.builder,
      groupNo: group.id,
      type: group.type,
      ownerStatus: group.enterpriseService ? "正常" : "待配置",
      pushCount: 0,
      scanCount: 0,
      memberCount: group.memberCount,
      max: group.targetCapacity,
    };
  });

  const types = ["全部", "体验官群", "PRO会员群", "游客群", "尊享群", "家族群", "分站管理群"];
  const regions = ["全部大区", ...Array.from(new Set(activeGroups.map(group => getRegion(group.city))))];
  const wechats = ["全部微信", ...Array.from(new Set(activeGroups.map(group => group.wechat)))];

  const filtered = activeGroups.filter(g =>
    (typeFilter === "全部" || g.type === typeFilter) &&
    (regionFilter === "全部大区" || getRegion(g.city) === regionFilter) &&
    (wechatFilter === "全部微信" || g.wechat === wechatFilter) &&
    (g.name.includes(search) || g.city.includes(search) || g.wechat.includes(search))
  );
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const selectedGroup = filtered.find(group => group.no === selectedGroupNo) || filtered[0] || mockGroups[0];

  const tableCols = [
    { label: "编号", w: 60 }, { label: "群名", w: 200 }, { label: "地区", w: 100 },
    { label: "所属微信", w: 90 }, { label: "账号用途", w: 76 }, { label: "群类型", w: 100 }, { label: "群主状态", w: 80 },
    { label: "推送次数", w: 80 }, { label: "扫码次数", w: 80 }, { label: "分配进度", w: 110 }, { label: "操作", w: 140 },
  ];

  return (
    <div className="p-6 h-full flex flex-col gap-4" style={{ background: L.bg }}>
      {showModal && <NewGroupModal onClose={() => setShowModal(false)} />}

      {/* 页头 */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-semibold" style={{ color: L.text }}>微信群管理</h2>
            <span className="px-2 py-0.5 rounded-md" style={{ color: currentProject.accent, background: `${currentProject.accent}15`, fontSize: "9px" }}>{currentProject.shortName}</span>
          </div>
          <p className="text-xs mt-0.5" style={{ color: L.muted }}>管理当前项目的群码、负责人、成员名单与推送记录</p>
        </div>
        <div className="flex gap-2">
          {/* 视图切换 */}
          <div className="flex gap-0.5 p-1 rounded-xl" style={{ background: L.surface, border: `1px solid ${L.border}`, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
            <button className="w-8 h-7 rounded-lg flex items-center justify-center" style={{ background: viewMode === "table" ? "linear-gradient(135deg, #4361ee, #3451d1)" : "transparent" }} onClick={() => setViewMode("table")}>
              <List size={14} style={{ color: viewMode === "table" ? "white" : L.muted }} />
            </button>
            <button className="w-8 h-7 rounded-lg flex items-center justify-center" style={{ background: viewMode === "card" ? "linear-gradient(135deg, #4361ee, #3451d1)" : "transparent" }} onClick={() => setViewMode("card")}>
              <LayoutGrid size={14} style={{ color: viewMode === "card" ? "white" : L.muted }} />
            </button>
          </div>
          <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm text-white font-medium" style={{ background: "linear-gradient(135deg, #4361ee, #3451d1)" }} onClick={() => setShowModal(true)}>
            <Plus size={15} /> 新建微信群
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 flex-shrink-0">
        <div className="flex items-center gap-1 p-1 rounded-lg" style={{ background: L.surface, border: `1px solid ${L.border}` }}>
          {([
            ["operations", "运营列表", List],
            ["status", "状态看板", Columns3],
            ["detail", "主从详情", PanelRight],
          ] as const).map(([mode, label, Icon]) => (
            <button
              key={mode}
              onClick={() => setDisplayMode(mode)}
              className="h-8 px-3 rounded-md flex items-center gap-1.5 text-xs"
              style={{ background: displayMode === mode ? L.primary : "transparent", color: displayMode === mode ? "#fff" : L.textSec }}
            >
              <Icon size={13} />{label}
            </button>
          ))}
        </div>
        <span className="text-xs" style={{ color: L.muted }}>同一批群数据，可按运营、风险或单群详情切换查看</span>
      </div>

      {/* 类型 Tab + 搜索 */}
      <div className="flex items-center gap-3 flex-shrink-0 flex-wrap">
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: L.surface, border: `1px solid ${L.border}`, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
          {types.map(t => (
            <button
              key={t}
              className="px-3 py-1.5 rounded-lg text-xs transition-all"
              style={{ background: typeFilter === t ? "linear-gradient(135deg, #4361ee, #3451d1)" : "transparent", color: typeFilter === t ? "white" : L.muted }}
              onClick={() => { setTypeFilter(t); setPage(1); }}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: L.surface, border: `1px solid ${L.border}`, color: L.muted }}>
          <Filter size={13} />
          <select value={regionFilter} onChange={event => { setRegionFilter(event.target.value); setPage(1); }} className="bg-transparent outline-none text-xs" style={{ color: L.textSec }}>
            {regions.map(region => <option key={region}>{region}</option>)}
          </select>
          <select value={wechatFilter} onChange={event => { setWechatFilter(event.target.value); setPage(1); }} className="bg-transparent outline-none text-xs" style={{ color: L.textSec }}>
            {wechats.map(wechat => <option key={wechat}>{wechat}</option>)}
          </select>
        </div>
        <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: L.surface, border: `1px solid ${L.border}`, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
          <Search size={13} style={{ color: L.muted }} />
          <input className="bg-transparent outline-none text-xs flex-1" style={{ color: L.textSec }} placeholder="搜索群名、城市、微信号..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          {search && <button onClick={() => setSearch("")}><X size={12} style={{ color: L.muted }} /></button>}
        </div>
        <div className="text-xs px-3 py-2 rounded-xl" style={{ background: L.surface, border: `1px solid ${L.border}`, color: L.muted, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>共 {filtered.length} 个群</div>
      </div>

      <div className="grid grid-cols-4 gap-3 flex-shrink-0">
        {[
          ["群容量预警", activeGroups.filter(group => group.memberCount / group.max >= 0.9).length, "超过 90% 需要新建承接群", "#f87171"],
          ["招商号承接", activeGroups.filter(group => getWechatRole(group.type) === "招商号").length, "主要对应全国游客群", "#fbbf24"],
          ["客服号承接", activeGroups.filter(group => getWechatRole(group.type) === "客服号").length, "主要对应体验官/会员群", "#34d399"],
          ["大区覆盖", new Set(activeGroups.map(group => getRegion(group.city))).size, "支持全国/大区筛选", "#818cf8"],
        ].map(([label, value, sub, color]) => (
          <div key={label as string} className="p-3 rounded-xl flex items-center gap-3" style={{ background: L.surface, border: `1px solid ${L.border}` }}>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${color}18` }}><AlertTriangle size={15} style={{ color: color as string }} /></div>
            <div><div className="font-semibold" style={{ color: L.text, fontSize: 16 }}>{value as number}</div><div style={{ color: L.muted, fontSize: 9 }}>{label as string} · {sub as string}</div></div>
          </div>
        ))}
      </div>

      {/* ── 表格视图 ── */}
      {displayMode === "operations" && viewMode === "table" && (
        <div className="flex-1 rounded-xl overflow-hidden flex flex-col" style={{ background: L.surface, border: `1px solid ${L.border}`, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
          <div className="flex items-center px-4 py-2.5 flex-shrink-0" style={{ background: "#1a2640", borderBottom: `1px solid ${L.border}`, minWidth: "fit-content" }}>
            {tableCols.map(c => (
              <div key={c.label} className="flex-shrink-0 text-xs font-medium" style={{ width: c.w, color: L.muted }}>{c.label}</div>
            ))}
          </div>

          <div className="flex-1 overflow-auto">
            {paged.map((g, idx) => {
              const tc = typeCfg[g.type] || { bg: L.primaryBg, color: L.primary };
              const pct = g.memberCount / g.max;
              return (
                <div key={g.no} className="flex items-center px-4 py-2.5 transition-all group" style={{ background: "transparent", borderBottom: `1px solid ${L.borderLight}`, minWidth: "fit-content" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = L.surface2; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                >
                  <div className="flex-shrink-0 text-xs" style={{ width: 60, color: L.muted }}>{g.no}</div>
                  <div className="flex-shrink-0" style={{ width: 200 }}>
                    <div className="text-xs font-medium" style={{ color: L.text }}>{g.name}</div>
                    <div className="mt-1 h-1 rounded-full overflow-hidden" style={{ background: L.borderLight, width: 140 }}>
                      <div className="h-full rounded-full" style={{ width: `${Math.min(100, pct * 100)}%`, background: pct >= 0.9 ? "#991b1b" : L.primary }} />
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: pct >= 0.9 ? "#991b1b" : L.muted }}>{g.memberCount}/{g.max}</div>
                  </div>
                  <div className="flex-shrink-0 text-xs" style={{ width: 100, color: L.muted }}>{g.city}</div>
                  <div className="flex-shrink-0 text-xs" style={{ width: 90, color: L.primary }}>{g.wechat}</div>
                  <div className="flex-shrink-0" style={{ width: 76 }}>
                    <span className="px-1.5 py-0.5 rounded-full text-xs" style={{ background: getWechatRole(g.type) === "招商号" ? "rgba(251,191,36,0.14)" : "rgba(34,211,238,0.12)", color: getWechatRole(g.type) === "招商号" ? "#fbbf24" : "#22d3ee" }}>{getWechatRole(g.type)}</span>
                  </div>
                  <div className="flex-shrink-0" style={{ width: 100 }}>
                    <span className="px-1.5 py-0.5 rounded-full text-xs" style={{ background: tc.bg, color: tc.color }}>{g.type}</span>
                  </div>
                  <div className="flex-shrink-0" style={{ width: 80 }}>
                    <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: g.ownerStatus === "正常" ? "rgba(16,185,129,0.15)" : "rgba(245,158,11,0.15)", color: g.ownerStatus === "正常" ? "#34d399" : "#fbbf24" }}>{g.ownerStatus}</span>
                  </div>
                  <div className="flex-shrink-0 text-xs font-medium" style={{ width: 80, color: "#34d399" }}>{g.pushCount}</div>
                  <div className="flex-shrink-0 text-xs" style={{ width: 80, color: "#818cf8" }}>{g.scanCount}</div>
                  <div className="flex-shrink-0 text-xs font-medium" style={{ width: 110, color: L.primary }}>{g.memberCount}/{g.max} {getCapacityUnit(g.type)}</div>
                  <div className="flex-shrink-0 flex items-center gap-1.5" style={{ width: 140 }}>
                    <button className="px-2 py-1 rounded text-xs" style={{ background: L.primaryBg, color: L.primary }} onClick={() => setMemberGroup(g)}>
                      <Users size={11} className="inline mr-0.5" />查看名单
                    </button>
                    <button className="px-2 py-1 rounded text-xs" style={{ background: L.bg, color: L.muted, border: `1px solid ${L.border}` }}>修改</button>
                  </div>
                </div>
              );
            })}
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
      )}

      {/* ── 卡片视图 ── */}
      {displayMode === "operations" && viewMode === "card" && (
        <div className="flex-1 overflow-auto">
          <div className="grid grid-cols-3 gap-3 pb-4">
            {paged.map(g => {
              const tc = typeCfg[g.type] || { bg: L.primaryBg, color: L.primary };
              const pct = g.memberCount / g.max;
              return (
                <div key={g.no} className="rounded-xl p-4" style={{ background: L.surface, border: `1px solid ${L.border}`, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="text-sm font-medium" style={{ color: L.text }}>{g.name}</div>
                      <div className="text-xs mt-0.5" style={{ color: L.muted }}>{g.city} · {g.wechat}</div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-xs" style={{ background: tc.bg, color: tc.color }}>{g.type}</span>
                  </div>
                  <div className="mb-1 flex justify-between text-xs" style={{ color: L.muted }}>
                    <span>{getCapacityUnit(g.type)}分配进度</span><span style={{ color: pct >= 0.9 ? "#991b1b" : L.primary }}>{g.memberCount}/{g.max}</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden mb-3" style={{ background: L.borderLight }}>
                    <div className="h-full rounded-full" style={{ width: `${Math.min(100, pct * 100)}%`, background: pct >= 0.9 ? "#991b1b" : L.primary }} />
                  </div>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {[["推送", g.pushCount, "#34d399"], ["扫码", g.scanCount, "#818cf8"], [getCapacityUnit(g.type), g.memberCount, L.primary]].map(([l, v, c]) => (
                      <div key={l as string} className="text-center rounded-lg py-1.5" style={{ background: L.bg }}>
                        <div className="text-xs font-semibold" style={{ color: c as string }}>{v}</div>
                        <div className="text-xs" style={{ color: L.muted, fontSize: "10px" }}>{l}</div>
                      </div>
                    ))}
                  </div>
                  <button className="w-full py-1.5 rounded-lg text-xs flex items-center justify-center gap-1" style={{ background: L.primaryBg, color: L.primary }} onClick={() => setMemberGroup(g)}>
                    <Users size={12} /> 查看入群名单
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {displayMode === "status" && (
        <div className="flex-1 min-h-0 grid grid-cols-[1fr_280px] gap-3">
          <div className="overflow-auto grid grid-cols-2 gap-3 pr-1">
            {filtered.map(group => {
              const percent = Math.round(group.memberCount / group.max * 100);
              const warning = percent >= 90 || group.ownerStatus !== "正常";
              return (
                <button key={group.no} onClick={() => setMemberGroup(group)} className="p-4 rounded-lg text-left" style={{ background: L.surface, border: `1px solid ${warning ? "rgba(248,113,113,.5)" : L.border}` }}>
                  <div className="flex items-start justify-between gap-3">
                    <div><div className="text-sm font-medium" style={{ color: L.text }}>{group.name}</div><div className="text-xs mt-1" style={{ color: L.muted }}>{getRegion(group.city)} · {group.wechat} · {getWechatRole(group.type)}</div></div>
                    {warning ? <AlertTriangle size={16} color="#f87171" /> : <CheckCircle2 size={16} color="#34d399" />}
                  </div>
                  <div className="grid grid-cols-3 gap-2 my-4">
                    {[["推送", group.pushCount], ["扫码", group.scanCount], [getCapacityUnit(group.type), group.memberCount]].map(([label, value]) => <div key={label as string} className="rounded-md py-2 text-center" style={{ background: L.bg }}><div className="text-xs font-semibold" style={{ color: L.text }}>{value}</div><div style={{ color: L.muted, fontSize: 10 }}>{label}</div></div>)}
                  </div>
                  <div className="flex justify-between text-xs mb-1" style={{ color: L.muted }}><span>容量占用</span><span style={{ color: warning ? "#f87171" : L.text }}>{percent}%</span></div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: L.bg }}><div className="h-full rounded-full" style={{ width: `${Math.min(100, percent)}%`, background: warning ? "#f87171" : L.primary }} /></div>
                </button>
              );
            })}
          </div>
          <aside className="p-4 rounded-lg overflow-auto" style={{ background: L.surface, border: `1px solid ${L.border}` }}>
            <div className="text-sm font-medium" style={{ color: L.text }}>运营风险</div>
            <div className="text-xs mt-1 mb-4" style={{ color: L.muted }}>优先处理满员与待交接群</div>
            {filtered.filter(group => group.memberCount / group.max >= .9 || group.ownerStatus !== "正常").map(group => <button key={group.no} onClick={() => setMemberGroup(group)} className="w-full p-3 mb-2 rounded-md text-left" style={{ background: L.bg, border: `1px solid ${L.border}` }}><div className="text-xs font-medium" style={{ color: L.text }}>{group.name}</div><div className="text-xs mt-1" style={{ color: "#f87171" }}>{group.ownerStatus !== "正常" ? "群主待交接" : `容量 ${group.memberCount}/${group.max}`}</div></button>)}
          </aside>
        </div>
      )}

      {displayMode === "detail" && (
        <div className="flex-1 min-h-0 grid grid-cols-[320px_1fr] gap-3">
          <div className="overflow-auto rounded-lg" style={{ background: L.surface, border: `1px solid ${L.border}` }}>
            {filtered.map(group => <button key={group.no} onClick={() => setSelectedGroupNo(group.no)} className="w-full p-3 text-left" style={{ background: selectedGroup.no === group.no ? L.primaryBg : "transparent", borderBottom: `1px solid ${L.border}` }}><div className="text-xs font-medium" style={{ color: selectedGroup.no === group.no ? "#818cf8" : L.text }}>{group.name}</div><div className="text-xs mt-1" style={{ color: L.muted }}>{group.city} · {group.wechat} · {group.memberCount}/{group.max}</div></button>)}
          </div>
          <div className="overflow-auto rounded-lg p-5" style={{ background: L.surface, border: `1px solid ${L.border}` }}>
            <div className="flex items-start justify-between"><div><div className="text-xs" style={{ color: L.muted }}>群编号 {selectedGroup.groupNo}</div><h3 className="text-xl font-semibold mt-1" style={{ color: L.text }}>{selectedGroup.name}</h3><div className="text-xs mt-2" style={{ color: L.textSec }}>{selectedGroup.city} · {selectedGroup.wechat} · {selectedGroup.type}</div></div><button onClick={() => setMemberGroup(selectedGroup)} className="px-3 py-2 rounded-md text-xs text-white" style={{ background: L.primary }}><Users size={12} className="inline mr-1" />入群名单</button></div>
            <div className="grid grid-cols-4 gap-3 mt-5">{[["推送", selectedGroup.pushCount], ["扫码", selectedGroup.scanCount], [`已分配${getCapacityUnit(selectedGroup.type)}`, selectedGroup.memberCount], [`${getCapacityUnit(selectedGroup.type)}上限`, selectedGroup.max]].map(([label, value]) => <div key={label as string} className="p-3 rounded-md" style={{ background: L.bg }}><div className="text-xs" style={{ color: L.muted }}>{label}</div><div className="text-xl font-semibold mt-1" style={{ color: L.text }}>{value}</div></div>)}</div>
            <div className="grid grid-cols-2 gap-3 mt-4"><div className="p-4 rounded-md" style={{ background: L.bg }}><div className="text-xs font-medium mb-3" style={{ color: L.text }}>群运营信息</div>{[["服务大区", getRegion(selectedGroup.city)], ["账号用途", getWechatRole(selectedGroup.type)], ["群主状态", selectedGroup.ownerStatus]].map(([label, value]) => <div key={label as string} className="flex justify-between py-2 text-xs" style={{ borderBottom: `1px solid ${L.border}`, color: L.muted }}><span>{label}</span><span style={{ color: L.text }}>{value}</span></div>)}</div><div className="p-4 rounded-md" style={{ background: L.bg }}><div className="text-xs font-medium mb-3" style={{ color: L.text }}>快捷操作</div>{["更新群二维码", "调整群主状态", "同步成员名单"].map(action => <button key={action} className="w-full mb-2 px-3 py-2 rounded-md text-left text-xs" style={{ color: L.textSec, border: `1px solid ${L.border}` }}>{action}</button>)}</div></div>
          </div>
        </div>
      )}
    </div>
  );
}
