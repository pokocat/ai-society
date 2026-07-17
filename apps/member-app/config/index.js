/** Taro 构建配置（weapp 主目标；h5 保留能力） */
const config = {
  projectName: "member-app",
  date: "2026-7-17",
  designWidth: 750,
  deviceRatio: { 640: 2.34 / 2, 750: 1, 828: 1.81 / 2 },
  sourceRoot: "src",
  outputRoot: "dist",
  framework: "react",
  compiler: "webpack5",
  plugins: [],
  defineConstants: {},
  copy: { patterns: [], options: {} },
  mini: {
    postcss: {
      pxtransform: { enable: true, config: {} },
      cssModules: { enable: false },
    },
    webpackChain(chain) {
      chain.merge({ performance: { hints: false } });
    },
  },
  h5: {
    publicPath: "/",
    staticDirectory: "static",
    postcss: {
      autoprefixer: { enable: true, config: {} },
      cssModules: { enable: false },
    },
  },
};

module.exports = function (merge) {
  if (process.env.NODE_ENV === "development") {
    return merge({}, config, { env: { NODE_ENV: '"development"' } });
  }
  return merge({}, config, { env: { NODE_ENV: '"production"' } });
};
