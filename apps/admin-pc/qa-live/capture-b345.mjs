/**
 * admin-pc B3/B4/B5 实时联调截图脚本（在 capture.mjs 之外新增，只读，不改后端演示数据）
 * - 复用 capture.mjs 的登录流：自起 vite dev（/api 代理到后端 8080），无头 chromium 依次截图
 * - 运行：node qa-live/capture-b345.mjs   （需后端 http://127.0.0.1:8080 已就绪）
 * 产出：10-community-groups / 11-member-workbench / 12-member-timeline / 13-account-assets / 14-account-status-menu
 */
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_DIR = path.resolve(__dirname, "..");
const OUT_DIR = __dirname;
const PORT = 5205;
const BASE = `http://127.0.0.1:${PORT}`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForServer(url, timeoutMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try { if ((await fetch(url)).ok) return true; } catch { /* not up yet */ }
    await sleep(500);
  }
  throw new Error(`dev server 未在 ${timeoutMs}ms 内就绪：${url}`);
}
async function isServerUp(url) { try { return (await fetch(url)).ok; } catch { return false; } }

async function main() {
  const alreadyUp = await isServerUp(BASE + "/");
  let vite = null;
  if (!alreadyUp) {
    vite = spawn("npx", ["vite", "--port", String(PORT), "--strictPort"], { cwd: APP_DIR, env: process.env, stdio: "inherit" });
  } else {
    console.log("[capture] 复用已运行的 dev server:", BASE);
  }
  const cleanup = () => { if (vite) { try { vite.kill("SIGTERM"); } catch { /* ignore */ } } };
  process.on("exit", cleanup);
  process.on("SIGINT", () => { cleanup(); process.exit(1); });
  process.on("SIGTERM", () => { cleanup(); process.exit(1); });

  try {
    await waitForServer(BASE + "/");
    console.log("[capture] dev server ready:", BASE);

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await context.addInitScript(() => {
      localStorage.removeItem("scp-token");
      localStorage.removeItem("scp-user");
    });
    const page = await context.newPage();
    page.on("console", (msg) => { if (msg.type() === "error") console.log("[browser:error]", msg.text()); });

    const shot = async (name) => {
      await page.screenshot({ path: path.join(OUT_DIR, name), fullPage: false });
      console.log("[capture] saved", name);
    };
    const navigate = (moduleId) =>
      page.evaluate((id) => window.dispatchEvent(new CustomEvent("flm:navigate", { detail: id })), moduleId);

    await page.goto(BASE + "/");

    // ── 登录（boss/demo123，同 capture.mjs）─────────────────────
    await page.getByText("私域社群运营中台").first().waitFor({ timeout: 15000 });
    await page.getByRole("button", { name: "登录", exact: true }).click();
    await page.getByText("会员项目").first().waitFor({ timeout: 20000 });
    await page.getByText("正在加载模块").waitFor({ state: "hidden", timeout: 10000 }).catch(() => {});
    await sleep(800);

    // ── 10 微信群管理（运营列表，真实群数据）─────────────────────
    try {
      await navigate("community");
      await page.getByText("微信群管理").first().waitFor({ timeout: 15000 });
      await page.getByText("北京PRO会员群01").first().waitFor({ timeout: 15000 });
      await sleep(500);
      await shot("10-community-groups.png");
    } catch (e) { console.log("[capture] 10 FAILED:", e.message); }

    // ── 11 会员运营工作台 · 会员档案（真实列表 + 右侧详情）────────
    try {
      await navigate("users");
      await page.getByText("会员运营工作台").first().waitFor({ timeout: 15000 });
      await page.getByRole("button", { name: "会员档案" }).click();  // 切到会员档案页签
      await page.getByText("李云天").first().waitFor({ timeout: 15000 });
      await page.getByText("李云天").first().click();                // 选中会员 → 拉档案+时间线
      await sleep(1500);                                             // 等 profile/timeline 返回
      await shot("11-member-workbench.png");
    } catch (e) { console.log("[capture] 11 FAILED:", e.message); }

    // ── 12 某会员操作日志/时间线页签 ─────────────────────────────
    try {
      await page.getByRole("button", { name: "操作日志", exact: true }).click();
      await sleep(1000);
      await shot("12-member-timeline.png");
    } catch (e) { console.log("[capture] 12 FAILED:", e.message); }

    // ── 13 账号资产（总览 Tab 真实列表）─────────────────────────
    try {
      await navigate("accounts");
      await page.getByText("账号资产中心").first().waitFor({ timeout: 15000 });
      await page.getByText("个人微信").first().waitFor({ timeout: 15000 });   // 类型徽标，确认真实数据已渲染
      await sleep(600);
      await shot("13-account-assets.png");
    } catch (e) { console.log("[capture] 13 FAILED:", e.message); }

    // ── 14 账号详情状态流转下拉（显示合法迁移项）─────────────────
    try {
      await page.getByRole("button", { name: /^手机号/ }).first().click();     // 手机号 Tab
      await page.getByText("138-0012-3456").first().waitFor({ timeout: 10000 });
      await page.getByText("138-0012-3456").first().click();                  // 打开详情面板（TEL-001 使用中）
      await page.getByText("状态流转").first().waitFor({ timeout: 8000 });
      await page.getByText("状态流转").first().click();                       // 展开合法迁移菜单
      // 菜单项是 <button>，避开状态筛选 <select> 里同名的隐藏 <option>
      await page.getByRole("button", { name: "待交接", exact: true }).waitFor({ timeout: 5000 }); // 使用中→[异常/冻结/待交接/已停用]
      await sleep(400);
      await shot("14-account-status-menu.png");
    } catch (e) { console.log("[capture] 14 FAILED:", e.message); }

    await browser.close();
    console.log("[capture] done. screenshots in", OUT_DIR);
  } finally {
    cleanup();
  }
}

main().catch((err) => { console.error("[capture] FAILED:", err); process.exitCode = 1; });
