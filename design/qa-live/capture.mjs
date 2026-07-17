/**
 * admin-pc Phase A 实时联调截图脚本
 * - 自起 vite dev（走 /api 代理到后端 8080），无头 chromium 依次截图 6 张
 * - 运行：node qa-live/capture.mjs   （需后端 http://127.0.0.1:8080 已就绪）
 *
 * 注意：04（同意赵一川提现）、06（确认刘晓峰分配）会真实改动后端演示数据，
 *      重复运行前需重新灌种子（Flyway clean/migrate 或重启后端 spring-boot:run）。
 */
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_DIR = path.resolve(__dirname, "..");
const OUT_DIR = __dirname;
const PORT = 5200;
const BASE = `http://127.0.0.1:${PORT}`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForServer(url, timeoutMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch { /* not up yet */ }
    await sleep(500);
  }
  throw new Error(`dev server 未在 ${timeoutMs}ms 内就绪：${url}`);
}

async function isServerUp(url) {
  try { return (await fetch(url)).ok; } catch { return false; }
}

async function main() {
  // 1) 复用已在跑的 dev server；否则自起 vite dev
  const alreadyUp = await isServerUp(BASE + "/");
  let vite = null;
  if (!alreadyUp) {
    vite = spawn("npx", ["vite", "--port", String(PORT), "--strictPort"], {
      cwd: APP_DIR,
      env: process.env,
      stdio: "inherit",
    });
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
    // 首帧脚本前清掉登录态，保证进登录门（避免 reload 打断在途请求）
    await context.addInitScript(() => {
      localStorage.removeItem("scp-token");
      localStorage.removeItem("scp-user");
    });
    const page = await context.newPage();
    page.on("console", (msg) => {
      if (msg.type() === "error") console.log("[browser:error]", msg.text());
    });

    const shot = async (name) => {
      await page.screenshot({ path: path.join(OUT_DIR, name), fullPage: false });
      console.log("[capture] saved", name);
    };
    const navigate = (moduleId) =>
      page.evaluate((id) => window.dispatchEvent(new CustomEvent("flm:navigate", { detail: id })), moduleId);

    await page.goto(BASE + "/");

    // ── 01 登录页 ─────────────────────────────
    await page.getByText("私域社群运营中台").first().waitFor({ timeout: 15000 });
    await page.getByText("演示账号（密码 demo123）").waitFor({ timeout: 5000 });
    await shot("01-login.png");

    // ── 02 boss 登录 → 工作台 + 项目切换器（4 项目）──
    await page.getByRole("button", { name: "登录", exact: true }).click();
    // 等项目上下文加载完（顶栏出现真实 shortName），再等工作台模块渲染完
    await page.getByText("会员项目").first().waitFor({ timeout: 20000 });
    await page.getByText("正在加载模块").waitFor({ state: "hidden", timeout: 10000 }).catch(() => {});
    await sleep(800);
    const projBtn = () => page.getByRole("button", { name: /当前项目/ }).first(); // 顶栏项目切换器
    await projBtn().click(); // 打开项目切换器
    await page.getByText("4 个项目").waitFor({ timeout: 5000 });
    await sleep(400);
    await shot("02-workspace.png");
    await projBtn().click(); // 关闭切换器
    await sleep(200);

    // ── 03 审批中心列表 ────────────────────────
    await navigate("approval");
    await page.getByText("赵一川 提现 ¥500 至支付宝").waitFor({ timeout: 15000 });
    await sleep(400);
    await shot("03-approval-list.png");

    // ── 04 同意赵一川提现 → 状态变化 ───────────
    // 点标题所在行选中 → 详情面板出现审批表单 → 点详情「同意」
    await page.getByText("赵一川 提现 ¥500 至支付宝").click();
    await page.getByText("审批意见").waitFor({ timeout: 8000 });
    await page.locator("button.flex-1").filter({ hasText: "同意" }).first().click();
    await page.getByText("审批已通过").waitFor({ timeout: 10000 });
    await sleep(500);
    await shot("04-approval-decided.png");

    // ── 05 刘晓峰 AI 推荐 ─────────────────────
    await navigate("assignment");
    await page.getByText("刘晓峰").first().waitFor({ timeout: 15000 });
    await page.getByText("刘晓峰").first().click();
    await page.getByRole("button", { name: "AI 推荐" }).click();
    await page.getByText("最佳推荐").waitFor({ timeout: 15000 });
    await sleep(400);
    await shot("05-assignment-recommend.png");

    // ── 06 确认分配 → toast + 列表刷新 ─────────
    await page.getByRole("button", { name: "确认分配" }).first().click();
    await page.getByText("分配成功").waitFor({ timeout: 12000 });
    await sleep(300);
    await shot("06-assignment-confirmed.png");

    await browser.close();
    console.log("[capture] done. screenshots in", OUT_DIR);
  } finally {
    cleanup();
  }
}

main().catch((err) => {
  console.error("[capture] FAILED:", err);
  process.exitCode = 1;
});
