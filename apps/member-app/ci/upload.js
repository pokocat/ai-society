/**
 * miniprogram-ci 上传脚本（发布工程，上架审阅项）。
 * 前置：小程序后台「开发-开发设置-小程序代码上传」生成上传密钥，
 *       保存到仓库外（如 ~/.mp-keys/private.wxe473d97a68e6683e.key），并配置 IP 白名单或关闭。
 * 用法：MP_PRIVATE_KEY_PATH=~/.mp-keys/private.xxx.key node ci/upload.js 1.0.0 "首版提审"
 */
const path = require("path");
const ci = require("miniprogram-ci");

const [, , version = "0.0.1", desc = "dev upload"] = process.argv;
const keyPath = process.env.MP_PRIVATE_KEY_PATH;
if (!keyPath) {
  console.error("缺少 MP_PRIVATE_KEY_PATH（上传密钥文件路径，勿放入仓库）");
  process.exit(1);
}

(async () => {
  const project = new ci.Project({
    appid: "wxe473d97a68e6683e",
    type: "miniProgram",
    projectPath: path.resolve(__dirname, "../miniprogram"),
    privateKeyPath: keyPath,
    ignores: ["node_modules/**/*"],
  });
  const result = await ci.upload({
    project,
    version,
    desc,
    setting: { es6: true, es7: true, minify: true },
    onProgressUpdate: () => {},
  });
  console.log("上传成功", JSON.stringify(result.subPackageInfo || result));
})().catch(e => {
  console.error("上传失败：", e.message);
  process.exit(1);
});
