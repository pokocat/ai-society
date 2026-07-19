/**
 * /mp/* API 封装：统一信封 {code,message,data}；4030 清登录态重登一次；
 * 网络层失败自动重试一次（弱网），错误经实时日志上报（上线排查通道）。
 */
const { BASE, ensureLogin, getToken, logout } = require("../utils/auth");
const log = require("../utils/log");

function raw(path, opts) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${BASE}${path}`,
      method: (opts && opts.method) || "GET",
      data: opts && opts.data,
      header: Object.assign(
        { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        (opts && opts.headers) || {}
      ),
      success: res => resolve(res.data),
      fail: err => reject(new Error(err.errMsg || "网络错误")),
    });
  });
}

/** 网络层失败（非业务错误）重试一次；幂等性由服务端 Idempotency-Key 兜底 */
async function rawWithRetry(path, opts) {
  try {
    return await raw(path, opts);
  } catch (e) {
    log.warn("request retry", path, e.message);
    return raw(path, opts);
  }
}

async function request(path, opts, retried) {
  await ensureLogin();
  const resp = await rawWithRetry(path, opts || {});
  if (resp && resp.code === 4030 && !retried) {
    logout();
    return request(path, opts, true);
  }
  if (!resp || resp.code !== 0) {
    const msg = (resp && resp.message) || "请求失败";
    log.error("api error", path, msg);
    throw new Error(msg);
  }
  return resp.data;
}

module.exports = {
  getMe: () => request("/mp/me"),
  getInvite: () => request("/mp/invite"),
  getPlans: () => request("/mp/plans"),
  createOrder: planCode => request("/mp/orders", { method: "POST", data: { planCode, channel: "android" } }),
  payOrder: orderNo => request(`/mp/orders/${orderNo}/pay`, { method: "POST" }),
  getMyGroup: () => request("/mp/my-group"),
  getCourses: () => request("/mp/courses"),
  getFaq: () => request("/mp/faq"),
  getProfile: () => request("/mp/profile"),
  getEarnings: () => request("/mp/earnings"),
  /** 提现申请：idemKey 由页面在打开表单时生成一次，同一次填单重复提交只受理一次 */
  applyWithdrawal: (amount, method, accountInfo, idemKey) =>
    request("/mp/withdrawals", {
      method: "POST",
      data: { amount, method, accountInfo },
      headers: { "Idempotency-Key": idemKey },
    }),
  getTasks: () => request("/mp/tasks"),
  completeTask: id => request(`/mp/tasks/${id}/complete`, { method: "POST" }),
  /** 昵称（头像昵称填写能力回传） */
  updateNickname: nickname => request("/mp/profile/nickname", { method: "POST", data: { nickname } }),
  /** 手机号（open-type=getPhoneNumber 的 code 换号；演示环境后端明确报错） */
  bindPhone: code => request("/mp/phone", { method: "POST", data: { code } }),
  /** 专属小程序码（scene=邀请码）；mock=true 时无图 */
  getInviteQrcode: () => request("/mp/invite/qrcode"),
};
