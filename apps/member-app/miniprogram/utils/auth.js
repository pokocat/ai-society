/**
 * 登录与裂变归因。
 * - inviteCode 来源：分享 path 查询参数 / 小程序码 scene（≤32 可见字符，直接放邀请码）
 * - 登录：wx.login → POST /mp/login（后端 code2Session，WX_MOCK 决定真假）
 *
 * 关键约束：wx.login 的 code 一次性且短时效，**绝不允许并发登录**。
 * 页面常并发拉多个接口，故 ensureLogin 用「单例 in-flight Promise」把并发登录收敛成一次。
 */
const log = require("./log");

/**
 * API 基址按运行环境切换：
 * - develop（开发者工具/真机预览调试）：走 DEV_BASE
 * - trial/release（体验版/正式版）：HTTPS 正式域名（须 ICP 备案 + 后台 request 合法域名白名单）
 *
 * 真机预览注意：手机上的 127.0.0.1 指向手机自己，连不到你电脑的后端。
 * 真机调试请把 DEV_BASE 改成电脑的局域网 IP（如 http://192.168.1.8:8080/api/v1），
 * 并保证手机与电脑同一 Wi-Fi、开发者工具勾选「不校验合法域名」。
 */
const DEV_BASE = "http://127.0.0.1:8080/api/v1";
const PROD_BASE = "https://api.zhuliren.example.com/api/v1"; // TODO 上线替换为备案域名

function readEnv() {
  try {
    return wx.getAccountInfoSync().miniProgram.envVersion || "release";
  } catch (e) {
    return "release";
  }
}
const ENV = readEnv();
const BASE = ENV === "develop" ? DEV_BASE : PROD_BASE;

const TOKEN_KEY = "scp-mp-token";
const MEMBER_KEY = "scp-mp-member";
const INVITE_KEY = "scp-mp-invite-code";

/** 从启动/页面参数捕获邀请码（分享 path: ?inviteCode=FLM-XXXX；小程序码 scene 直接是邀请码） */
function captureInviteCode(options) {
  const q = (options && options.query) || options || {};
  const fromQuery = q.inviteCode || undefined;
  let fromScene;
  try {
    fromScene = typeof q.scene === "string" ? decodeURIComponent(q.scene) : undefined;
  } catch (e) {
    fromScene = undefined; // scene 非法编码不应中断启动
  }
  const code = fromQuery || (fromScene && fromScene.indexOf("FLM-") === 0 ? fromScene : undefined);
  if (code) {
    wx.setStorageSync(INVITE_KEY, code);
    log.info("invite code captured", code);
  }
}

function getToken() {
  return wx.getStorageSync(TOKEN_KEY) || null;
}
function getMemberNo() {
  return wx.getStorageSync(MEMBER_KEY) || null;
}

function wxLogin() {
  return new Promise((resolve, reject) => {
    wx.login({
      success: res => (res && res.code ? resolve(res.code) : reject(new Error("wx.login 未返回 code"))),
      fail: err => reject(new Error((err && err.errMsg) || "wx.login 失败")),
    });
  });
}

/** 把底层网络失败翻译成能自诊断的中文提示（"没登录"类问题的排查入口） */
function explainNetworkError(errMsg) {
  const m = String(errMsg || "");
  if (m.indexOf("not in domain list") >= 0 || m.indexOf("域名") >= 0) {
    return ENV === "develop"
      ? "请求被域名校验拦截：开发者工具右上角「详情 → 本地设置」勾选「不校验合法域名…」"
      : "服务器域名未在小程序后台配置，请联系管理员";
  }
  if (m.indexOf("timeout") >= 0) return "网络超时，请检查网络后重试";
  if (m.indexOf("fail") >= 0 || m.indexOf("ERR_CONNECTION") >= 0 || m.indexOf("ECONNREFUSED") >= 0) {
    return ENV === "develop"
      ? `连不上后端（${BASE}）：确认服务已启动；真机预览需把 DEV_BASE 改成电脑局域网 IP`
      : "服务暂时不可用，请稍后重试";
  }
  return m || "网络错误";
}

function postLogin(data) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${BASE}/mp/login`,
      method: "POST",
      data,
      timeout: 10000,
      header: { "Content-Type": "application/json" },
      success: res => resolve(res.data),
      fail: err => reject(new Error(explainNetworkError(err && err.errMsg))),
    });
  });
}

/** 单例：并发调用只发一次登录请求（wx.login 的 code 不可复用） */
let inflight = null;

async function doLogin() {
  const code = await wxLogin();
  const inviteCode = wx.getStorageSync(INVITE_KEY) || undefined;
  const resp = await postLogin({ code, inviteCode });
  if (!resp || resp.code !== 0) {
    throw new Error((resp && resp.message) || "登录失败");
  }
  wx.setStorageSync(TOKEN_KEY, resp.data.token);
  wx.setStorageSync(MEMBER_KEY, resp.data.memberNo);
  log.info("login ok", resp.data.memberNo);
  return { memberNo: resp.data.memberNo };
}

/** 静默登录（幂等 + 并发收敛）：已有 token 直接返回；否则换 code 走后端建档/并档。 */
function ensureLogin() {
  const token = getToken();
  const memberNo = getMemberNo();
  if (token && memberNo) return Promise.resolve({ memberNo });
  if (inflight) return inflight; // 复用进行中的登录，避免并发消耗 code
  inflight = doLogin().finally(() => {
    inflight = null;
  });
  return inflight;
}

function logout() {
  wx.removeStorageSync(TOKEN_KEY);
  wx.removeStorageSync(MEMBER_KEY);
  inflight = null;
}

module.exports = {
  BASE,
  ENV,
  captureInviteCode,
  getToken,
  getMemberNo,
  ensureLogin,
  logout,
  explainNetworkError,
};
