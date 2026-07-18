/** 底部弹层（对齐设计稿 MobileSheet）：遮罩点击关闭，内容区阻断冒泡与滚动穿透。 */
Component({
  options: { multipleSlots: false },
  properties: {
    title: { type: String, value: "" },
  },
  methods: {
    close() {
      this.triggerEvent("close");
    },
    noop() {},
  },
});
