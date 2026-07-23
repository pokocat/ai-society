-- =====================================================================
-- 主理人社群运营中台 · V5 M3a 增量
-- 依据：docs/技术方案-M3微信生态社群.md §4（先本体/MAPPING 后迁移，已同步）
-- 内容：①权益域（会员套餐/一方订单/付费门控规则位）
--       ②代理归属（community_group.owner_member_id + affinity_first）
--       ③企微化（wecom_chat_id/join_way_id/wecom_group_cap）
--       ④运营内容域（欢迎语/群发排期/讲课排期 + task_type「群发确认」）
-- 注意：会员费为中台唯一一方交易域（边界变更声明见方案 §3），
--       区别于 order_reference 只读镜像。
-- =====================================================================

-- ---------------------------------------------------------------------
-- ① 权益域
-- ---------------------------------------------------------------------

-- 会员套餐（买断周期：月/季/年卡；自动续费订阅 M4 达标后再上）
CREATE TABLE membership_plan (
    id              BIGSERIAL PRIMARY KEY,
    plan_code       TEXT NOT NULL UNIQUE,            -- MPLAN-xxx，小程序端展示与下单引用
    name            TEXT NOT NULL,
    grant_identity  TEXT NOT NULL                    -- 授予身份（dict:member_identity 付费档）
                    CHECK (grant_identity IN ('PRO会员','尊享官','黑金','VIP')),
    duration_days   INT  NOT NULL CHECK (duration_days > 0),
    price_cents     INT  NOT NULL CHECK (price_cents >= 0),        -- 安卓/鸿蒙/Windows 定价
    ios_price_cents INT  CHECK (ios_price_cents >= 0),             -- iOS 可单独定价对冲苹果税；NULL=同价
    project_scope   TEXT REFERENCES project(id),     -- NULL=全生态
    status          TEXT NOT NULL DEFAULT '上架' CHECK (status IN ('上架','下架')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 会员费订单（一方交易事实源；状态机 TRANSITIONS 在 MembershipOrderService 管控，禁直改）
CREATE TABLE membership_order (
    id                BIGSERIAL PRIMARY KEY,
    order_no          TEXT NOT NULL UNIQUE,          -- 商户单号 = 虚拟支付 out_trade_no
    member_id         BIGINT NOT NULL REFERENCES member(id),
    plan_id           BIGINT NOT NULL REFERENCES membership_plan(id),
    project_id        TEXT REFERENCES project(id),   -- 权益落地项目（NULL=全生态套餐按下单上下文落地）
    channel           TEXT NOT NULL CHECK (channel IN ('ios','android','other')),
    amount_cents      INT  NOT NULL CHECK (amount_cents >= 0),
    fee_rate_snapshot NUMERIC(5,4),                  -- 下单时费率快照（政策会变，留痕）
    status            TEXT NOT NULL DEFAULT '待支付'
                      CHECK (status IN ('待支付','已支付','退款中','已退款','已关闭')),
    paid_at           TIMESTAMPTZ,
    callback_id       TEXT,                          -- 支付回调幂等键（重复回调返回首次结果）
    close_reason      TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_membership_order_member ON membership_order(member_id, status);
-- 回调幂等：同一 callback_id 只允许出现一次
CREATE UNIQUE INDEX uq_membership_order_callback ON membership_order(callback_id) WHERE callback_id IS NOT NULL;

-- ---------------------------------------------------------------------
-- ② 代理归属 + ③ 企微化：community_group / resource_rules 增列
-- ---------------------------------------------------------------------

ALTER TABLE community_group
    ADD COLUMN owner_member_id BIGINT REFERENCES member(id),  -- 「代理名下的群」（归属安置）
    ADD COLUMN wecom_chat_id   TEXT,                          -- 企微客户群 chat_id
    ADD COLUMN join_way_id     TEXT;                          -- 「加入群聊」活码配置 id
CREATE INDEX idx_group_owner ON community_group(owner_member_id) WHERE owner_member_id IS NOT NULL;
CREATE UNIQUE INDEX uq_group_wecom_chat ON community_group(wecom_chat_id) WHERE wecom_chat_id IS NOT NULL;

ALTER TABLE resource_rules
    ADD COLUMN paid_gate_enabled BOOLEAN NOT NULL DEFAULT TRUE,   -- 付费门控总开关
    ADD COLUMN affinity_first    BOOLEAN NOT NULL DEFAULT TRUE,   -- 邀请归属优先（关=退化为软加分）
    ADD COLUMN wecom_group_cap   INT     NOT NULL DEFAULT 200;    -- 企微客户群硬顶（平台限制，不可上调超 200）
-- target_capacity ≤ wecom_group_cap 属跨表校验，在 GroupService/RulesController 服务层强制

-- ---------------------------------------------------------------------
-- ④ 运营内容域
-- ---------------------------------------------------------------------

-- 入群欢迎语模板（企微唯一全自动出站通道；素材库≤100 条约束在服务层）
CREATE TABLE welcome_template (
    id                BIGSERIAL PRIMARY KEY,
    name              TEXT NOT NULL,
    scope_group_type  TEXT,                          -- NULL=全部群类型（dict:group_type 标签）
    project_id        TEXT REFERENCES project(id),   -- NULL=全生态
    content           JSONB NOT NULL,                -- {text, attachments:[{type,...}]}，经 common/Json 序列化
    wecom_material_id TEXT,                          -- 企微素材库映射（网关同步后回填）
    status            TEXT NOT NULL DEFAULT '启用' CHECK (status IN ('启用','停用')),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 群发排期（半自动：派发建 task_item「群发确认」→ 群主客户端确认 → 回填留痕）
CREATE TABLE broadcast_plan (
    id            BIGSERIAL PRIMARY KEY,
    title         TEXT NOT NULL,
    content       JSONB NOT NULL,                    -- 群发内容（≤4000 字 + ≤9 附件，服务层校验）
    target_scope  JSONB,                             -- 圈选条件 {projectId, groupType, ownerMemberNo}
    send_window_start TIMESTAMPTZ,
    send_window_end   TIMESTAMPTZ,
    status        TEXT NOT NULL DEFAULT '草稿'
                  CHECK (status IN ('草稿','待派发','派发中','已完成','已取消')),
    dispatched_at TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 讲课排期（企微群直播：排课→开播→回放 3 年）
CREATE TABLE course_session (
    id            BIGSERIAL PRIMARY KEY,
    title         TEXT NOT NULL,
    speaker       TEXT,
    scheduled_at  TIMESTAMPTZ NOT NULL,
    live_id       TEXT,                              -- 企微直播 id（createLive 回填）
    replay_url    TEXT,                              -- 直播结束后回填
    group_scope   JSONB,                             -- 分发范围 {projectId, groupType}
    status        TEXT NOT NULL DEFAULT '已排期'
                  CHECK (status IN ('已排期','直播中','已结束','已取消')),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- task_item：新增「群发确认」任务类型 + 群发排期关联列
ALTER TABLE task_item DROP CONSTRAINT task_item_task_type_check;
ALTER TABLE task_item ADD CONSTRAINT task_item_task_type_check
    CHECK (task_type IN ('加好友','邀请入群','回访','工单','交接','群二维码更新','同步异常','配置整改','群发确认'));
ALTER TABLE task_item ADD COLUMN broadcast_plan_id BIGINT REFERENCES broadcast_plan(id);
CREATE INDEX idx_task_broadcast ON task_item(broadcast_plan_id) WHERE broadcast_plan_id IS NOT NULL;

-- ---------------------------------------------------------------------
-- 字典种子（枚举进字典，CLAUDE.md 第 10 条）
-- ---------------------------------------------------------------------

INSERT INTO dict_entry (dict_code, item_code, item_label, sort_order, remark) VALUES
 -- 套餐/订单状态
 ('membership_plan_status','on_sale','上架',1,NULL),
 ('membership_plan_status','off_sale','下架',2,NULL),
 ('membership_order_status','pending_pay','待支付',1,NULL),
 ('membership_order_status','paid','已支付',2,NULL),
 ('membership_order_status','refunding','退款中',3,NULL),
 ('membership_order_status','refunded','已退款',4,NULL),
 ('membership_order_status','closed','已关闭',5,NULL),
 -- 内容域状态
 ('welcome_template_status','enabled','启用',1,NULL),
 ('welcome_template_status','disabled','停用',2,NULL),
 ('broadcast_status','draft','草稿',1,NULL),
 ('broadcast_status','pending_dispatch','待派发',2,NULL),
 ('broadcast_status','dispatching','派发中',3,NULL),
 ('broadcast_status','done','已完成',4,NULL),
 ('broadcast_status','cancelled','已取消',5,NULL),
 ('course_status','scheduled','已排期',1,NULL),
 ('course_status','live','直播中',2,NULL),
 ('course_status','finished','已结束',3,NULL),
 ('course_status','cancelled','已取消',4,NULL),
 -- 任务类型（补建 task_type 字典，与 task_item CHECK 对齐；新增群发确认）
 ('task_type','add_friend','加好友',1,NULL),
 ('task_type','invite_join','邀请入群',2,NULL),
 ('task_type','follow_up','回访',3,NULL),
 ('task_type','ticket','工单',4,NULL),
 ('task_type','handover','交接',5,NULL),
 ('task_type','qrcode_rotate','群二维码更新',6,NULL),
 ('task_type','sync_error','同步异常',7,NULL),
 ('task_type','config_fix','配置整改',8,NULL),
 ('task_type','broadcast_confirm','群发确认',9,'M3：企微客户群群发需群主客户端确认（每群每天≤1条）'),
 -- 付费档身份（EntitlementService 门控判定读此字典）
 ('paid_identity','pro','PRO会员',1,NULL),
 ('paid_identity','premium','尊享官',2,NULL),
 ('paid_identity','black_gold','黑金',3,NULL),
 ('paid_identity','vip','VIP',4,NULL),
 -- 付费门控豁免群类型（转化前置漏斗；运营可调）
 ('paid_gate_exempt_group_types','visitor','游客群',1,'默认豁免：游客转化前置'),
 ('paid_gate_exempt_group_types','experiencer','体验官群',2,'默认豁免：体验转化前置'),
 -- 身份→目标群类型映射（替换 RecommendEngine.matchGroupType 硬编码 switch；
 --  item_code=member_identity 编码，item_label=目标群类型标签）
 ('identity_group_type','pro','PRO会员群',1,NULL),
 ('identity_group_type','experiencer','体验官群',2,NULL),
 ('identity_group_type','student','体验官群',3,NULL),
 ('identity_group_type','visitor','游客群',4,NULL),
 ('identity_group_type','premium','尊享群',5,NULL),
 ('identity_group_type','black_gold','尊享群',6,NULL),
 ('identity_group_type','vip','尊享群',7,NULL),
 ('identity_group_type','agent','分站管理群',8,NULL),
 ('identity_group_type','city_partner','分站管理群',9,NULL),
 ('identity_group_type','operator','分站管理群',10,NULL);

-- ---------------------------------------------------------------------
-- 权限位（CLAUDE.md 第 20 条：新模块先补 role_permission 种子）
--  membership=权益域（套餐/订单/门控），content=运营内容域（欢迎语/群发/排课）
-- ---------------------------------------------------------------------

INSERT INTO role_permission (role_code, module, can_view, can_create, can_edit, can_delete, can_export, can_approve)
SELECT 'founder', m, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE FROM unnest(ARRAY['membership','content']) AS m;
INSERT INTO role_permission (role_code, module, can_view, can_create, can_edit, can_approve) VALUES
 ('finance_ops','membership',TRUE,FALSE,FALSE,FALSE),
 ('community_ops','content',TRUE,TRUE,TRUE,FALSE);

-- ---------------------------------------------------------------------
-- 套餐种子（演示定价；iOS 上浮对冲 12% 苹果税——最终定价属运营决策，可在线调整）
-- ---------------------------------------------------------------------

INSERT INTO membership_plan (plan_code, name, grant_identity, duration_days, price_cents, ios_price_cents, project_scope, status) VALUES
 ('MPLAN-PRO-M',  'PRO会员·月卡',  'PRO会员', 30,  19900,  22900, NULL, '上架'),
 ('MPLAN-PRO-Q',  'PRO会员·季卡',  'PRO会员', 90,  53900,  61900, NULL, '上架'),
 ('MPLAN-PRO-Y',  'PRO会员·年卡',  'PRO会员', 365, 199900, 228900, NULL, '上架'),
 ('MPLAN-PREM-Y', '尊享官·年卡',   '尊享官',  365, 599900, 688900, NULL, '上架');
