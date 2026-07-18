/**
 * 登录与裂变归因工具。
 * - inviteCode 来源：分享 path 查询参数 / 小程序码 scene（≤32 可见字符，直接放邀请码）
 * - 登录：wx.login → POST /mp/login（M3b 后端为 Mock code2Session；M3c 换真实凭证，前端不变）
 */
const BASE = "http://127.0.0.1:8080/api/v1"; // 开发期直连；上线换 HTTPS 域名并配业务域名白名单
const TOKEN_KEY = "scp-mp-token";
const MEMBER_KEY = "scp-mp-member";
const INVITE_KEY = "scp-mp-invite-code";

/** 从启动/页面参数捕获邀请码并落盘（分享 path: ?inviteCode=FLM-XXXX；小程序码 scene 直接是邀请码） */
function captureInviteCode(options) {
  const q = (options && options.query) || options || {};
  const fromQuery = q.inviteCode || undefined;
  const fromScene = typeof q.scene === "string" ? decodeURIComponent(q.scene) : undefined;
  const code = fromQuery || (fromScene && fromScene.indexOf("FLM-") === 0 ? fromScene : undefined);
  if (code) {
    wx.setStorageSync(INVITE_KEY, code);
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
      success: res => resolve(res),
      fail: err => reject(new Error(err.errMsg || "wx.login 失败")),
    });
  });
}

function postLogin(data) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${BASE}/mp/login`,
      method: "POST",
      data,
      header: { "Content-Type": "application/json" },
      success: res => resolve(res.data),
      fail: err => reject(new Error(err.errMsg || "网络错误")),
    });
  });
}

/** 静默登录（幂等）：已有 token 直接返回；否则 wx.login 换 code 走后端建档/并档。 */
async function ensureLogin() {
  const token = getToken();
  const memberNo = getMemberNo();
  if (token && memberNo) {
    return { memberNo };
  }
  const { code } = await wxLogin();
  const inviteCode = wx.getStorageSync(INVITE_KEY) || undefined;
  const resp = await postLogin({ code, inviteCode });
  if (!resp || resp.code !== 0) {
    throw new Error((resp && resp.message) || "登录失败");
  }
  wx.setStorageSync(TOKEN_KEY, resp.data.token);
  wx.setStorageSync(MEMBER_KEY, resp.data.memberNo);
  return { memberNo: resp.data.memberNo };
}

function logout() {
  wx.removeStorageSync(TOKEN_KEY);
  wx.removeStorageSync(MEMBER_KEY);
}

module.exports = { BASE, captureInviteCode, getToken, getMemberNo, ensureLogin, logout };
