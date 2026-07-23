import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Network, Search, Users } from "lucide-react";
import { ApiError, groupsApi, membersApi, referralApi } from "../../api";
import type { MemberRow } from "../../api/members";
import type { InfluenceCell, ReferralChain } from "../../api/referral";
import { useProject } from "../contexts/ProjectContext";

const L = {
  bg: "#0d1629", surface: "#131f35", surface2: "#1a2640",
  border: "rgba(255,255,255,0.07)", primary: "#4361ee",
  text: "#e2e8f0", textSec: "#94a3b8", muted: "#64748b",
  success: "#22c55e", warning: "#f2b600",
};

const AGENT_IDENTITIES = ["代理", "运营商", "城市合伙人"];

interface OwnedGroup {
  id: string;
  name: string;
  member_count: number;
  target_capacity: number;
  status: string;
  owner_member_id: number | null;
  [key: string]: unknown;
}

interface DownlineRow {
  level: number;
  member_no: string;
  name: string;
  city: string | null;
  direct_downline: number;
  source: string | null;
  bound_at: string | null;
}

/**
 * 代理商总览 + 邀请关系树全景（M3a §7）：ALL 视角。
 * 数据全部接线真实 API（members / referral chain / influence-matrix / groups），
 * 替换原 InfluenceRanking mock。
 */
export default function AgentOverview() {
  const { currentProject } = useProject();
  const [agents, setAgents] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<MemberRow | null>(null);
  const [chain, setChain] = useState<ReferralChain | null>(null);
  const [matrix, setMatrix] = useState<InfluenceCell[]>([]);
  const [ownedGroups, setOwnedGroups] = useState<OwnedGroup[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        // 三类代理身份并行取，合并去重
        const lists = await Promise.all(
          AGENT_IDENTITIES.map(identity =>
            membersApi.listMembers({ projectId: currentProject.id, identity })),
        );
        if (cancelled) return;
        const seen = new Set<string>();
        const merged: MemberRow[] = [];
        for (const row of lists.flat()) {
          if (!seen.has(row.member_no)) {
            seen.add(row.member_no);
            merged.push(row);
          }
        }
        setAgents(merged);
        setSelected(prev => prev ?? merged[0] ?? null);
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "加载代理列表失败");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [currentProject.id]);

  const loadDetail = useCallback(async (agent: MemberRow) => {
    setDetailLoading(true);
    try {
      const [c, m, groups] = await Promise.all([
        referralApi.getChain(agent.member_no),
        referralApi.getInfluenceMatrix(agent.member_no),
        groupsApi.listGroups({ projectId: currentProject.id })
          .then(rows => rows as unknown as OwnedGroup[]),
      ]);
      setChain(c);
      setMatrix(m);
      setOwnedGroups(groups.filter(g => g.owner_member_id != null && Number(g.owner_member_id) === agent.id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "加载代理详情失败");
      setChain(null);
      setMatrix([]);
      setOwnedGroups([]);
    } finally {
      setDetailLoading(false);
    }
  }, [currentProject.id]);

  useEffect(() => {
    if (selected) void loadDetail(selected);
  }, [selected, loadDetail]);

  const filtered = useMemo(() =>
    agents.filter(a => !search
      || a.name.includes(search) || a.member_no.includes(search) || (a.city ?? "").includes(search)),
    [agents, search]);

  const downline = (chain?.downline ?? []) as unknown as DownlineRow[];
  const byLevel = useMemo(() => {
    const m = new Map<number, DownlineRow[]>();
    for (const d of downline) {
      const arr = m.get(d.level) ?? [];
      arr.push(d);
      m.set(d.level, arr);
    }
    return m;
  }, [downline]);

  const identityColumns = useMemo(
    () => Array.from(new Set(matrix.map(c => c.identity))).sort(),
    [matrix]);
  const matrixCell = (level: number, identity: string) =>
    matrix.find(c => Number(c.level) === level && c.identity === identity)?.cnt ?? 0;

  return (
    <div className="p-6 min-h-full flex gap-4" style={{ background: L.bg }}>
      {/* 左：代理列表 */}
      <div className="w-72 shrink-0 rounded-xl flex flex-col" style={{ background: L.surface, border: `1px solid ${L.border}` }}>
        <div className="p-3" style={{ borderBottom: `1px solid ${L.border}` }}>
          <h2 className="text-sm font-bold flex items-center gap-2 mb-2" style={{ color: L.text }}>
            <Users size={15} style={{ color: L.primary }} /> 代理商（{filtered.length}）
          </h2>
          <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg" style={{ background: L.surface2 }}>
            <Search size={12} style={{ color: L.muted }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索姓名/会员号/城市"
              className="flex-1 bg-transparent text-xs outline-none" style={{ color: L.text }} />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center gap-2 text-xs p-4 justify-center" style={{ color: L.muted }}>
              <Loader2 size={13} className="animate-spin" /> 加载中
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-xs p-4 text-center" style={{ color: L.muted }}>
              当前项目暂无代理/运营商/城市合伙人身份会员
            </div>
          ) : filtered.map(a => {
            const identity = a.project_identities?.find(pi =>
              AGENT_IDENTITIES.includes(pi.identity))?.identity ?? "代理";
            return (
              <button key={a.member_no} onClick={() => setSelected(a)}
                className="w-full text-left px-3 py-2.5 flex items-center justify-between"
                style={{
                  background: selected?.member_no === a.member_no ? "rgba(67,97,238,0.15)" : "transparent",
                  borderBottom: `1px solid ${L.border}`,
                }}>
                <div>
                  <div className="text-xs font-medium" style={{ color: L.text }}>{a.name}</div>
                  <div className="text-[11px]" style={{ color: L.muted }}>{a.member_no} · {a.city ?? "—"}</div>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: L.surface2, color: L.warning }}>
                  {identity}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 右：详情 */}
      <div className="flex-1 min-w-0 space-y-4">
        {error && (
          <div className="px-4 py-2.5 rounded-lg text-xs" style={{ background: "rgba(255,77,79,0.12)", color: "#ff8a8c" }}>
            {error}
          </div>
        )}
        {!selected ? (
          <div className="rounded-xl p-10 text-center text-xs" style={{ background: L.surface, color: L.muted }}>
            选择左侧代理查看邀请关系树与影响力
          </div>
        ) : detailLoading ? (
          <div className="rounded-xl p-10 flex items-center gap-2 justify-center text-xs" style={{ background: L.surface, color: L.muted }}>
            <Loader2 size={14} className="animate-spin" /> 加载 {selected.name} 的关系数据
          </div>
        ) : (
          <>
            {/* 概要卡 */}
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: "覆盖总人数（≤3级）", value: String(chain?.influence ?? 0) },
                { label: "一级直推", value: String(byLevel.get(1)?.length ?? 0) },
                { label: "二级/三级", value: `${byLevel.get(2)?.length ?? 0} / ${byLevel.get(3)?.length ?? 0}` },
                { label: "名下归属群", value: String(ownedGroups.length) },
              ].map(card => (
                <div key={card.label} className="rounded-xl p-4" style={{ background: L.surface, border: `1px solid ${L.border}` }}>
                  <div className="text-[11px] mb-1" style={{ color: L.muted }}>{card.label}</div>
                  <div className="text-xl font-bold" style={{ color: L.text }}>{card.value}</div>
                </div>
              ))}
            </div>

            {/* 影响力矩阵 */}
            <div className="rounded-xl overflow-hidden" style={{ background: L.surface, border: `1px solid ${L.border}` }}>
              <div className="px-4 py-3 text-xs font-bold flex items-center gap-2" style={{ color: L.text, borderBottom: `1px solid ${L.border}` }}>
                <Network size={14} style={{ color: L.primary }} /> 影响力矩阵（层级 × 身份）
              </div>
              {matrix.length === 0 ? (
                <div className="p-6 text-center text-xs" style={{ color: L.muted }}>暂无下线数据</div>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ color: L.muted, borderBottom: `1px solid ${L.border}` }}>
                      <th className="text-left px-4 py-2 font-medium">层级</th>
                      {identityColumns.map(i => <th key={i} className="text-left px-4 py-2 font-medium">{i}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {[1, 2, 3].map(level => (
                      <tr key={level} style={{ color: L.textSec, borderBottom: `1px solid ${L.border}` }}>
                        <td className="px-4 py-2 font-medium" style={{ color: L.text }}>LV{level}</td>
                        {identityColumns.map(i => (
                          <td key={i} className="px-4 py-2">{String(matrixCell(level, i))}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* 邀请树（按层级分组） */}
            <div className="rounded-xl overflow-hidden" style={{ background: L.surface, border: `1px solid ${L.border}` }}>
              <div className="px-4 py-3 text-xs font-bold" style={{ color: L.text, borderBottom: `1px solid ${L.border}` }}>
                邀请关系树（{selected.name} 的下线，≤3 级物化路径）
              </div>
              {downline.length === 0 ? (
                <div className="p-6 text-center text-xs" style={{ color: L.muted }}>暂无下线</div>
              ) : (
                <div className="p-4 space-y-3">
                  {[1, 2, 3].map(level => {
                    const rows = byLevel.get(level) ?? [];
                    if (rows.length === 0) return null;
                    return (
                      <div key={level}>
                        <div className="text-[11px] font-medium mb-1.5" style={{ color: L.warning }}>
                          LV{level}（{rows.length} 人）
                        </div>
                        <div className="flex flex-wrap gap-1.5" style={{ paddingLeft: (level - 1) * 16 }}>
                          {rows.map(d => (
                            <span key={d.member_no} className="px-2 py-1 rounded-lg text-[11px]"
                              style={{ background: L.surface2, color: L.textSec, border: `1px solid ${L.border}` }}
                              title={`${d.member_no} · ${d.city ?? ""} · 直推 ${d.direct_downline} 人 · ${d.source ?? ""}`}>
                              {d.name}
                              {d.direct_downline > 0 && (
                                <span style={{ color: L.primary }}> +{d.direct_downline}</span>
                              )}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 名下归属群 */}
            <div className="rounded-xl overflow-hidden" style={{ background: L.surface, border: `1px solid ${L.border}` }}>
              <div className="px-4 py-3 text-xs font-bold" style={{ color: L.text, borderBottom: `1px solid ${L.border}` }}>
                名下归属群（邀请的新会员优先安置于此，推荐引擎第 0 级）
              </div>
              {ownedGroups.length === 0 ? (
                <div className="p-6 text-center text-xs" style={{ color: L.muted }}>
                  暂无归属群 —— 在「微信群管理」将群的归属代理设为该会员后生效
                </div>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ color: L.muted, borderBottom: `1px solid ${L.border}` }}>
                      {["群", "人数/容量", "状态"].map(h => <th key={h} className="text-left px-4 py-2 font-medium">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {ownedGroups.map(g => (
                      <tr key={g.id} style={{ color: L.textSec, borderBottom: `1px solid ${L.border}` }}>
                        <td className="px-4 py-2" style={{ color: L.text }}>{g.name}<span style={{ color: L.muted }}>（{g.id}）</span></td>
                        <td className="px-4 py-2">{g.member_count}/{g.target_capacity}</td>
                        <td className="px-4 py-2">{g.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
