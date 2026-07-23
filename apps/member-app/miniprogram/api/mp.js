/**
 * /mp/* API 封装：统一信封 {code,message,data}。
 *
 * 重试策略（资金安全）：**只重试幂等的 GET**。
 * POST 一律不自动重试——下单/支付/完成任务在服务端没有全覆盖的幂等守卫，
 * 弱网重试会造成重复下单、重复发积分。需要幂等的写操作由调用方显式传 Idempotency-Key
 * （如提现），由服务端 IdempotencyGuard 保证「重复键返回首次结果」。
 */
const { BASE, ensureLogin, getToken, logout, explainNetworkError } = require("../utils/auth");
const log = require("./../utils/log");

function raw(path, opts) {
  const method = (opts && opts.method) || "GET";
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${BASE}${path}`,
      method,
      data: opts && opts.data,
      timeout: 12000,
      header: Object.assign(
        { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        (opts && opts.headers) || {}
      ),
      success: res => {
        if (res.statusCode >= 500) {
          reject(new Error(`服务异常(${res.statusCode})`));
          return;
        }
        resolve(res.data);
      },
      fail: err => reject(new Error(explainNetworkError(err && err.errMsg))),
    });
  });
}

/** GET 幂等，网络抖动重试一次；写操作绝不自动重试。 */
async function send(path, opts) {
  const method = (opts && opts.method) || "GET";
  try {
    return await raw(path, opts);
  } catch (e) {
    if (method !== "GET") throw e;
    log.warn("GET retry", path, e.message);
    return raw(path, opts);
  }
}

async function request(path, opts, retried) {
  await ensureLogin();
  const resp = await send(path, opts || {});
  // 登录态失效：清态重登一次（只重试一次，避免死循环）
  if (resp && resp.code === 4030 && !retried) {
    log.warn("token expired, re-login", path);
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

/** 生成一次性幂等键（写操作按需使用） */
function idemKey(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

module.exports = {
  idemKey,
  getMe: () => request("/mp/me"),
  getInvite: () => request("/mp/invite"),
  getPlans: () => request("/mp/plans"),
  /** 下单：带幂等键，重复提交只受理一次 */
  createOrder: (planCode, key) =>
    request("/mp/orders", {
      method: "POST",
      data: { planCode, channel: "android" },
      headers: { "Idempotency-Key": key || idemKey("mporder") },
    }),
  payOrder: orderNo => request(`/mp/orders/${orderNo}/pay`, { method: "POST" }),
  getMyGroup: () => request("/mp/my-group"),
  getCourses: () => request("/mp/courses"),
  getFaq: () => request("/mp/faq"),
  getProfile: () => request("/mp/profile"),
  getEarnings: () => request("/mp/earnings"),
  /** 提现申请：idemKey 由页面在打开表单时生成一次，同一次填单重复提交只受理一次 */
  applyWithdrawal: (amount, method, accountInfo, key) =>
    request("/mp/withdrawals", {
      method: "POST",
      data: { amount, method, accountInfo },
      headers: { "Idempotency-Key": key },
    }),
  getTasks: () => request("/mp/tasks"),
  completeTask: id => request(`/mp/tasks/${id}/complete`, { method: "POST" }),
  /** 昵称（头像昵称填写能力回传） */
  updateNickname: nickname => request("/mp/profile/nickname", { method: "POST", data: { nickname } }),
  /** 手机号（open-type=getPhoneNumber 的 code 换号） */
  bindPhone: code => request("/mp/phone", { method: "POST", data: { code } }),
  /** 专属小程序码（scene=邀请码）；mock=true 时无图 */
  getInviteQrcode: () => request("/mp/invite/qrcode"),
};
