import { DollarSign, ExternalLink, ShieldCheck } from "lucide-react";

const L = {
  bg: "#0d1629", surface: "#131f35", surface2: "#1a2640", border: "rgba(255,255,255,0.07)",
  text: "#e2e8f0", textSec: "#94a3b8", muted: "#64748b", primary: "#4361ee", amber: "#fbbf24",
};

/**
 * 佣金 / 分销结算。
 * 业务铁律（SPEC §2.2）：返佣与分销结算永不进中台——项目方订单/佣金/收益只以只读镜像形式
 * （order_reference / earnings_snapshot）经 sync 层进入，实际计算与打款归外部项目系统。
 * 故本页不承载任何佣金计算/发放，改为说明性空态，避免展示会误导运营的虚构佣金数据。
 * 会员的收益镜像与提现审批见「账号资产中心 / 会员运营」。
 */
export default function Commission() {
  return (
    <div className="p-5 h-full flex flex-col gap-3" style={{ background: L.bg }}>
      <div>
        <h1 className="font-semibold" style={{ color: L.text, fontSize: 18 }}>佣金与分销结算</h1>
        <p className="mt-1" style={{ color: L.muted, fontSize: 11 }}>返佣计算与打款由外部项目系统负责，中台不参与</p>
      </div>

      <div className="flex-1 rounded-md flex items-center justify-center" style={{ background: L.surface, border: `1px solid ${L.border}` }}>
        <div className="max-w-[460px] text-center px-6">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto" style={{ background: "rgba(67,97,238,0.14)" }}>
            <DollarSign size={26} style={{ color: L.primary }} />
          </div>
          <div className="mt-4 font-semibold" style={{ color: L.text, fontSize: 15 }}>本模块不在中台结算佣金</div>
          <p className="mt-2 leading-relaxed" style={{ color: L.textSec, fontSize: 11 }}>
            按业务边界，项目方的订单、佣金、收益只以<strong style={{ color: L.text }}>只读镜像</strong>经同步层进入中台；
            返佣的计算与打款由外部项目系统完成，中台<strong style={{ color: L.text }}>不记账、不返佣</strong>。
          </p>

          <div className="mt-5 grid grid-cols-1 gap-2 text-left">
            <div className="px-3 py-2.5 rounded-md flex items-start gap-2.5" style={{ background: L.surface2, border: `1px solid ${L.border}` }}>
              <ShieldCheck size={15} style={{ color: "#34d399", marginTop: 1 }} />
              <div>
                <div style={{ color: L.text, fontSize: 11, fontWeight: 500 }}>会员收益镜像 / 提现审批</div>
                <div className="mt-0.5" style={{ color: L.muted, fontSize: 9 }}>见「账号资产中心」与「会员运营」，走审批协同、打款归外部</div>
              </div>
            </div>
            <div className="px-3 py-2.5 rounded-md flex items-start gap-2.5" style={{ background: L.surface2, border: `1px solid ${L.border}` }}>
              <ExternalLink size={15} style={{ color: L.amber, marginTop: 1 }} />
              <div>
                <div style={{ color: L.text, fontSize: 11, fontWeight: 500 }}>项目方结算数据</div>
                <div className="mt-0.5" style={{ color: L.muted, fontSize: 9 }}>由 sync 同步层写入 order_reference / earnings_snapshot 只读表</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
