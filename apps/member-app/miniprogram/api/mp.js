/** /mp/* API 封装：统一信封 {code,message,data}；4030 清登录态重登一次。 */
const { BASE, ensureLogin, getToken, logout } = require("../utils/auth");

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

async function request(path, opts, retried) {
  await ensureLogin();
  const resp = await raw(path, opts || {});
  if (resp && resp.code === 4030 && !retried) {
    logout();
    return request(path, opts, true);
  }
  if (!resp || resp.code !== 0) {
    throw new Error((resp && resp.message) || "请求失败");
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
};
