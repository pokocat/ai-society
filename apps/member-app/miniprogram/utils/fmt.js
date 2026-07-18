/** 展示格式化工具：WXML 无法调函数，所有派生字段在 setData 前算好。 */

/** 千分位（整数或两位小数原样保留） */
function money(n) {
  const v = Number(n || 0);
  const [int, dec] = String(v).split(".");
  const withSep = int.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return dec ? `${withSep}.${dec}` : withSep;
}

/** ISO 时间 → YYYY-MM-DD */
function d10(s) {
  return s ? String(s).slice(0, 10) : "";
}

/** ISO 时间 → MM-DD HH:mm */
function d11(s) {
  return s ? String(s).slice(5, 16).replace("T", " ") : "";
}

/** ISO 时间 → YYYY-MM-DD HH:mm */
function d16(s) {
  return s ? String(s).slice(0, 16).replace("T", " ") : "";
}

function toast(msg) {
  wx.showToast({ title: msg, icon: "none" });
}

module.exports = { money, d10, d11, d16, toast };
