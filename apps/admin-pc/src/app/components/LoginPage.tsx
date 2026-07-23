import { useState } from "react";
import { Zap, LogIn, AlertCircle, Loader2 } from "lucide-react";
import { authApi, ApiError } from "../../api";
import type { AuthUser } from "../../api/auth";

/** 纯白黄绿黑主题常量，对齐 PCLayout 的 D */
const D = {
  bg: "#ffffff",
  surface: "#ffffff",
  surface2: "#f7ffd9",
  border: "rgba(5,8,5,0.14)",
  primary: "#b6ff00",
  primary2: "#e5ff00",
  ink: "#050805",
  text: "#050805",
  textSec: "#2f3a29",
  muted: "#68705a",
  danger: "#ff4d4f",
  sidebar: "#050805",
  sideText: "#f7ffe6",
  sideMuted: "#8c967d",
};

interface DemoAccount {
  username: string;
  role: string;
  desc: string;
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  { username: "boss", role: "创始人 / PC 总控", desc: "全部权限" },
  { username: "liyuntian", role: "会员端", desc: "会员小程序" },
  { username: "zhaoyichuan", role: "金服端", desc: "金服小程序" },
];

const DEMO_PASSWORD = "demo123";

export default function LoginPage({ onLoggedIn }: { onLoggedIn: (user: AuthUser) => void }) {
  const [username, setUsername] = useState("boss");
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(u: string, p: string) {
    if (!u || !p) {
      setError("请输入账号与密码");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { user } = await authApi.login(u, p);
      onLoggedIn(user);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "登录失败，请稍后重试";
      setError(msg);
      setLoading(false);
    }
  }

  function fillAndLogin(acc: DemoAccount) {
    setUsername(acc.username);
    setPassword(DEMO_PASSWORD);
    submit(acc.username, DEMO_PASSWORD);
  }

  return (
    <div className="w-full h-screen flex items-center justify-center" style={{ background: D.bg, fontFamily: "'Inter', sans-serif" }}>
      <div className="w-[380px] rounded-2xl p-7 shadow-2xl" style={{ background: D.surface, border: `1px solid ${D.border}` }}>
        {/* Logo + 标题 */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: D.primary }}>
            <Zap size={18} style={{ color: D.ink }} />
          </div>
          <div>
            <div className="font-bold leading-tight flex items-center gap-2" style={{ fontSize: 16, color: D.ink }}>
              主理人
              <span className="px-1.5 py-0.5 rounded font-bold" style={{ background: D.primary2, color: D.ink, fontSize: 9 }}>PRO</span>
            </div>
            <div style={{ color: D.muted, fontSize: 11 }}>私域社群运营中台</div>
          </div>
        </div>

        <form
          onSubmit={e => { e.preventDefault(); submit(username, password); }}
          className="flex flex-col gap-3"
        >
          <div>
            <label className="block mb-1.5" style={{ color: D.textSec, fontSize: 11 }}>账号</label>
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoComplete="username"
              className="w-full px-3 py-2.5 rounded-lg outline-none"
              style={{ background: D.surface2, border: `1px solid ${D.border}`, color: D.text, fontSize: 13 }}
              placeholder="请输入账号"
            />
          </div>
          <div>
            <label className="block mb-1.5" style={{ color: D.textSec, fontSize: 11 }}>密码</label>
            <input
              value={password}
              onChange={e => setPassword(e.target.value)}
              type="password"
              autoComplete="current-password"
              className="w-full px-3 py-2.5 rounded-lg outline-none"
              style={{ background: D.surface2, border: `1px solid ${D.border}`, color: D.text, fontSize: 13 }}
              placeholder="请输入密码"
            />
          </div>

          {error && (
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg" style={{ background: "rgba(255,77,79,0.1)", border: "1px solid rgba(255,77,79,0.3)" }}>
              <AlertCircle size={13} style={{ color: D.danger, flexShrink: 0 }} />
              <span style={{ color: D.danger, fontSize: 11 }}>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-1 py-2.5 rounded-lg flex items-center justify-center gap-2 font-semibold disabled:opacity-60"
            style={{ background: D.primary, color: D.ink, fontSize: 13 }}
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <LogIn size={15} />}
            {loading ? "登录中…" : "登录"}
          </button>
        </form>

        {/* 演示账号快捷填充 */}
        <div className="mt-6">
          <div className="flex items-center gap-2 mb-2.5">
            <span className="h-px flex-1" style={{ background: D.border }} />
            <span style={{ color: D.muted, fontSize: 10 }}>演示账号（密码 {DEMO_PASSWORD}）</span>
            <span className="h-px flex-1" style={{ background: D.border }} />
          </div>
          <div className="flex flex-col gap-2">
            {DEMO_ACCOUNTS.map(acc => (
              <button
                key={acc.username}
                type="button"
                disabled={loading}
                onClick={() => fillAndLogin(acc)}
                className="w-full px-3 py-2 rounded-lg flex items-center gap-2.5 text-left transition-colors disabled:opacity-60"
                style={{ background: D.surface2, border: `1px solid ${D.border}` }}
              >
                <span className="w-7 h-7 rounded-full flex items-center justify-center font-bold flex-shrink-0" style={{ background: D.primary, color: D.ink, fontSize: 11 }}>
                  {acc.username[0].toUpperCase()}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block font-medium" style={{ color: D.text, fontSize: 12 }}>{acc.username}</span>
                  <span className="block" style={{ color: D.muted, fontSize: 10 }}>{acc.role} · {acc.desc}</span>
                </span>
                <span className="px-2 py-0.5 rounded" style={{ background: D.ink, color: D.primary, fontSize: 9 }}>一键登录</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
