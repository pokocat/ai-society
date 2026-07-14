-- =====================================================================
-- 蜂乐玛社群运营中台 · V1 全量 schema
-- 映射源头：ontology/bossclub.ttl（概念→表对照见 ontology/MAPPING.md）
-- 业务基线：《蜂乐玛社群运营中台-业务逻辑与项目说明》V1.0（SPEC）
-- 约定：状态机用 TEXT + CHECK（状态由代码管理）；业务字典用 dict 表 + FK；
--       金额 NUMERIC(14,2)；时间 TIMESTAMPTZ；主数据只此一份，关系走关系表。
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. 字典与全局规则
-- ---------------------------------------------------------------------
CREATE TABLE dict_entry (
    id          BIGSERIAL PRIMARY KEY,
    dict_code   TEXT NOT NULL,              -- 字典类别：member_identity / group_type / channel_source / task_type / account_type ...
    item_code   TEXT NOT NULL,              -- 项编码（英文）
    item_label  TEXT NOT NULL,              -- 项名称（中文）
    sort_order  INT  NOT NULL DEFAULT 0,
    enabled     BOOLEAN NOT NULL DEFAULT TRUE,
    remark      TEXT,
    UNIQUE (dict_code, item_code)
);

-- 全局资源规则（SPEC §7.1 默认值 + 推荐引擎权重；单行表）
CREATE TABLE resource_rules (
    id                        SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    target_group_size         INT  NOT NULL DEFAULT 100,
    max_groups_per_wechat     INT  NOT NULL DEFAULT 20,
    warn_friends              INT  NOT NULL DEFAULT 1800,
    hard_friends              INT  NOT NULL DEFAULT 2000,
    capacity_warn_ratio       NUMERIC(4,2) NOT NULL DEFAULT 0.90,
    require_enterprise_cs     BOOLEAN NOT NULL DEFAULT TRUE,
    require_personal_cs       BOOLEAN NOT NULL DEFAULT TRUE,
    block_overload            BOOLEAN NOT NULL DEFAULT TRUE,
    growth_points_per_invite  INT  NOT NULL DEFAULT 288,     -- 邀请成长值默认 +288，可配
    -- 推荐引擎权重（§5.2）
    w_capacity                NUMERIC(6,3) NOT NULL DEFAULT 40,
    w_wechat_load             NUMERIC(6,3) NOT NULL DEFAULT 25,
    w_continuity              NUMERIC(6,3) NOT NULL DEFAULT 20,
    w_strategy                NUMERIC(6,3) NOT NULL DEFAULT 15,
    fill_rate_depress         NUMERIC(4,2) NOT NULL DEFAULT 0.98, -- 填充率降权阈值
    updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- 1. 平台域：操作用户 / 角色 / 权限（SPEC §3、§11.1）
-- ---------------------------------------------------------------------
CREATE TABLE app_user (
    id            BIGSERIAL PRIMARY KEY,
    username      TEXT NOT NULL UNIQUE,
    display_name  TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role_code     TEXT NOT NULL,             -- FK role.code
    data_scope    TEXT NOT NULL DEFAULT 'PROJECT'
                  CHECK (data_scope IN ('SELF','PROJECT','REGION','ALL')),
    region        TEXT,
    member_no     TEXT,                      -- 关联统一会员（小程序端登录用，可空）
    enabled       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE role (
    code        TEXT PRIMARY KEY,            -- founder / project_owner / region_admin / community_ops / wecom_cs / personal_cs / after_sales / finance_ops / auditor
    name        TEXT NOT NULL,
    description TEXT
);

CREATE TABLE role_permission (
    id        BIGSERIAL PRIMARY KEY,
    role_code TEXT NOT NULL REFERENCES role(code),
    module    TEXT NOT NULL,                 -- 模块键：workspace/accounts/wechat/community/assignment/.../risk
    can_view   BOOLEAN NOT NULL DEFAULT FALSE,
    can_create BOOLEAN NOT NULL DEFAULT FALSE,
    can_edit   BOOLEAN NOT NULL DEFAULT FALSE,
    can_delete BOOLEAN NOT NULL DEFAULT FALSE,
    can_export BOOLEAN NOT NULL DEFAULT FALSE,
    can_approve BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE (role_code, module)
);

-- ---------------------------------------------------------------------
-- 2. 项目域（SPEC §4.1 / §6.2 / §6.3）
-- ---------------------------------------------------------------------
CREATE TABLE project (
    id            TEXT PRIMARY KEY,          -- slug：flm-membership
    code          TEXT NOT NULL UNIQUE,      -- FLM-MEMBER
    name          TEXT NOT NULL,
    short_name    TEXT NOT NULL,
    category      TEXT NOT NULL,             -- 会员电商/课程活动/渠道合伙/内容获客
    owner_user_id BIGINT REFERENCES app_user(id),
    status        TEXT NOT NULL DEFAULT '筹备中'
                  CHECK (status IN ('筹备中','配置中','待发布','运行中','暂停','已结束','已归档')),
    accent        TEXT,                      -- UI 主题色
    service_region TEXT,
    expected_member_scale INT,
    active_resource_version_id BIGINT,       -- 当前生效资源方案版本（FK 后补）
    started_at    TIMESTAMPTZ,
    stopped_at    TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE project_integration (
    id           BIGSERIAL PRIMARY KEY,
    project_id   TEXT NOT NULL REFERENCES project(id),
    api_type     TEXT NOT NULL CHECK (api_type IN ('OpenAPI','REST API','Webhook','DB只读')),
    data_scope   TEXT NOT NULL CHECK (data_scope IN ('双向读写','仅读取项目数据','仅回写任务结果')),
    endpoint     TEXT,
    auth_status  TEXT NOT NULL DEFAULT '等待鉴权' CHECK (auth_status IN ('等待鉴权','已鉴权','鉴权失败')),
    last_sync_at TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 资源方案版本：草稿→校验→发布，发布后不可变（SPEC §6.3）
CREATE TABLE project_resource_version (
    id           BIGSERIAL PRIMARY KEY,
    project_id   TEXT NOT NULL REFERENCES project(id),
    version_no   INT  NOT NULL,
    status       TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','validated','published','archived')),
    snapshot     JSONB,                      -- 发布时冻结的账号/群/编组/规则快照
    issues       JSONB,                      -- 最近一次校验问题清单
    approval_id  BIGINT,                     -- 高风险发布关联审批（FK 后补）
    created_by   BIGINT REFERENCES app_user(id),
    published_at TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (project_id, version_no)
);

-- ---------------------------------------------------------------------
-- 3. 资源域（SPEC §4.2 / §4.3 / §8.2）
-- ---------------------------------------------------------------------
CREATE TABLE employee (
    id          BIGSERIAL PRIMARY KEY,
    emp_no      TEXT NOT NULL UNIQUE,        -- YG-0018
    name        TEXT NOT NULL,
    gender      TEXT,
    phone       TEXT,
    department  TEXT,                        -- 运营部/客服部/技术部/渠道部/课程部
    job_role    TEXT,                        -- 社群运营/企微客服/个微客服/售后客服/城市负责人...
    service_region TEXT,
    employment_status TEXT NOT NULL DEFAULT '在职' CHECK (employment_status IN ('在职','离职','停用')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE device (
    id         BIGSERIAL PRIMARY KEY,
    device_no  TEXT NOT NULL UNIQUE,
    model      TEXT,
    custodian_employee_id BIGINT REFERENCES employee(id),
    remark     TEXT
);

CREATE TABLE account (
    id            TEXT PRIMARY KEY,          -- WX-P-001 / WX-E-001 / TEL-001 / MEDIA-001
    account_type  TEXT NOT NULL CHECK (account_type IN ('手机号','个人微信','企业微信','媒体账号','凭证')),
    name          TEXT NOT NULL,             -- 蜂乐·吴思远
    identifier    TEXT NOT NULL,             -- 微信号/corpId/手机号/媒体号
    status        TEXT NOT NULL DEFAULT '库存'
                  CHECK (status IN ('库存','待激活','可用','使用中','风险','冻结','待交接','已停用','已归档')),
    custodian_employee_id BIGINT REFERENCES employee(id),   -- 保管人
    user_employee_id      BIGINT REFERENCES employee(id),   -- 实际使用人
    device_id     BIGINT REFERENCES device(id),
    phone         TEXT,
    real_name_verified BOOLEAN NOT NULL DEFAULT FALSE,
    region        TEXT,                      -- 华北区/华东区/华南区/西南区/全国
    city          TEXT,
    -- 个微负载聚合列（由关系明细聚合维护，禁止人工快照直改；好友数带校准时间 SPEC §7.2）
    friend_count       INT NOT NULL DEFAULT 0,
    friend_calibrated_at TIMESTAMPTZ,
    serving_group_count INT NOT NULL DEFAULT 0,
    -- 企微字段
    corp_name     TEXT,
    dept          TEXT,
    sync_status   TEXT CHECK (sync_status IN ('已同步','同步失败')),
    last_login_at TIMESTAMPTZ,
    risk_note     TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (account_type, identifier)        -- 准入：账号标识唯一（SPEC §6.1）
);

-- 账号↔项目授权（多对多，SPEC §5）
CREATE TABLE account_assignment (
    id          BIGSERIAL PRIMARY KEY,
    account_id  TEXT NOT NULL REFERENCES account(id),
    project_id  TEXT NOT NULL REFERENCES project(id),
    granted_by  BIGINT REFERENCES app_user(id),
    valid_from  TIMESTAMPTZ NOT NULL DEFAULT now(),
    valid_until TIMESTAMPTZ,
    revoked     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (account_id, project_id)
);

-- 账号交接单（高风险，走审批 SPEC §11.2）
CREATE TABLE account_handover (
    id            BIGSERIAL PRIMARY KEY,
    account_id    TEXT NOT NULL REFERENCES account(id),
    from_employee_id BIGINT REFERENCES employee(id),
    to_employee_id   BIGINT REFERENCES employee(id),
    reason        TEXT,
    status        TEXT NOT NULL DEFAULT '待审批' CHECK (status IN ('待审批','进行中','已完成','已取消')),
    approval_id   BIGINT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at  TIMESTAMPTZ
);

-- ---------------------------------------------------------------------
-- 4. 群域（SPEC §4.4 / §8.3）
-- ---------------------------------------------------------------------
CREATE TABLE community_group (
    id              TEXT PRIMARY KEY,        -- G-0001
    name            TEXT NOT NULL,
    group_type      TEXT NOT NULL,           -- PRO会员群/体验官群/游客群/尊享群/家族群/分站管理群
    city            TEXT,
    region          TEXT,
    builder_account_id TEXT REFERENCES account(id),   -- 建群企业微信
    project_id      TEXT REFERENCES project(id),      -- 单归属；NULL=共享池（跨项目共用需审批）
    target_capacity INT NOT NULL DEFAULT 100,
    member_count    INT NOT NULL DEFAULT 0,           -- 聚合列：由 assignment 已入群明细维护
    qrcode_version  INT NOT NULL DEFAULT 0,
    status          TEXT NOT NULL DEFAULT '待配置'
                    CHECK (status IN ('待建群','待配置','可承接','服务中','容量预警','已满','冻结','待交接','已归档')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 一群双客服编组（SPEC §5：企微客服=员工，个微客服=个微账号+使用人）
CREATE TABLE group_staffing (
    id          BIGSERIAL PRIMARY KEY,
    group_id    TEXT NOT NULL REFERENCES community_group(id),
    role        TEXT NOT NULL CHECK (role IN ('企微客服','个微客服')),
    employee_id BIGINT REFERENCES employee(id),
    account_id  TEXT REFERENCES account(id),
    is_primary  BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (group_id, role, is_primary)      -- 每群每角色一个主责
);

CREATE TABLE group_qrcode (
    id         BIGSERIAL PRIMARY KEY,
    group_id   TEXT NOT NULL REFERENCES community_group(id),
    version    INT NOT NULL,
    image_url  TEXT,
    valid_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (group_id, version)
);

CREATE TABLE group_lifecycle_event (
    id         BIGSERIAL PRIMARY KEY,
    group_id   TEXT NOT NULL REFERENCES community_group(id),
    event_type TEXT NOT NULL,                -- 建群/进入服务/容量预警/满员/冻结/交接/归档/二维码轮换
    detail     JSONB,
    operator   TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- 5. 会员域（SPEC §4.5 / §4.6 / §10）
-- ---------------------------------------------------------------------
CREATE TABLE member (
    id         BIGSERIAL PRIMARY KEY,
    member_no  TEXT NOT NULL UNIQUE,         -- U-100086
    name       TEXT,
    phone      TEXT,
    city       TEXT,
    source_channel TEXT,                     -- 公众号/小红书/抖音/朋友圈/转介绍/官网/微博/代理推荐
    merged_into BIGINT REFERENCES member(id),-- 并档后指向主档（NULL=主档）
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE member_identifier (
    id          BIGSERIAL PRIMARY KEY,
    member_id   BIGINT NOT NULL REFERENCES member(id),
    id_type     TEXT NOT NULL CHECK (id_type IN ('手机号','个微号','unionid','企微external_userid','订单用户ID','报名ID')),
    id_value    TEXT NOT NULL,
    source_system TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (id_type, id_value)
);

CREATE TABLE member_merge_log (
    id          BIGSERIAL PRIMARY KEY,
    winner_id   BIGINT NOT NULL REFERENCES member(id),
    loser_id    BIGINT NOT NULL REFERENCES member(id),
    matched_on  TEXT,                        -- 命中的 identifier
    reversible_snapshot JSONB,               -- 回滚快照
    operator    TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 并档冲突人工核对队列
CREATE TABLE member_merge_conflict (
    id          BIGSERIAL PRIMARY KEY,
    member_a    BIGINT NOT NULL REFERENCES member(id),
    member_b    BIGINT NOT NULL REFERENCES member(id),
    conflict_on TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT '待核对' CHECK (status IN ('待核对','已合并','已忽略')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE member_project_identity (
    id          BIGSERIAL PRIMARY KEY,
    member_id   BIGINT NOT NULL REFERENCES member(id),
    project_id  TEXT NOT NULL REFERENCES project(id),
    identity    TEXT NOT NULL,               -- 游客/体验官/PRO会员/尊享官/代理/城市合伙人/学员（dict:member_identity）
    stage       TEXT,                        -- 项目阶段（如 第36天）
    status      TEXT NOT NULL DEFAULT '有效' CHECK (status IN ('有效','已过期','已冻结','待分配')),
    source      TEXT,
    valid_from  TIMESTAMPTZ NOT NULL DEFAULT now(),
    valid_until TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (member_id, project_id)
);

CREATE TABLE member_identity_history (
    id          BIGSERIAL PRIMARY KEY,
    member_id   BIGINT NOT NULL REFERENCES member(id),
    project_id  TEXT NOT NULL,
    old_identity TEXT,
    new_identity TEXT,
    reason      TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 关系链：物化路径，本体三公理（≤3级/单推荐人/无环）由 PK + 服务端校验保证
CREATE TABLE referral_relation (
    member_id  BIGINT PRIMARY KEY REFERENCES member(id),   -- 单推荐人公理：一人一行
    referrer_id BIGINT NOT NULL REFERENCES member(id),
    lv1_parent BIGINT NOT NULL REFERENCES member(id),      -- = referrer_id
    lv2_parent BIGINT REFERENCES member(id),
    lv3_parent BIGINT REFERENCES member(id),
    source     TEXT,                          -- 推广码/活动链接/邀请码/直播间关注
    invite_code TEXT,
    bound_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (member_id <> referrer_id),
    CHECK (member_id <> lv1_parent AND (lv2_parent IS NULL OR member_id <> lv2_parent)
           AND (lv3_parent IS NULL OR member_id <> lv3_parent))
);
CREATE INDEX idx_referral_lv1 ON referral_relation(lv1_parent);
CREATE INDEX idx_referral_lv2 ON referral_relation(lv2_parent);
CREATE INDEX idx_referral_lv3 ON referral_relation(lv3_parent);

CREATE TABLE member_timeline (
    id          BIGSERIAL PRIMARY KEY,
    member_id   BIGINT NOT NULL REFERENCES member(id),
    project_id  TEXT REFERENCES project(id),
    event_type  TEXT NOT NULL,               -- 回访/沟通/订单/身份变更/入群/加好友/风险/合并
    title       TEXT NOT NULL,
    detail      JSONB,
    operator    TEXT,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_timeline_member ON member_timeline(member_id, occurred_at DESC);

-- ---------------------------------------------------------------------
-- 6. 关系与分配域（SPEC §4.7 / §7.2 / §8.4）
-- ---------------------------------------------------------------------
CREATE TABLE member_wechat_relation (
    id          BIGSERIAL PRIMARY KEY,
    member_id   BIGINT NOT NULL REFERENCES member(id),
    account_id  TEXT NOT NULL REFERENCES account(id),
    relation    TEXT NOT NULL DEFAULT '好友' CHECK (relation IN ('好友','已删除','待验证')),
    confirm_way TEXT NOT NULL CHECK (confirm_way IN ('接口同步','人工回填')),
    confirmed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (member_id, account_id)
);
CREATE INDEX idx_mwr_account ON member_wechat_relation(account_id) WHERE relation = '好友';

CREATE TABLE member_group_assignment (
    id            BIGSERIAL PRIMARY KEY,
    member_id     BIGINT NOT NULL REFERENCES member(id),
    project_id    TEXT NOT NULL REFERENCES project(id),
    group_id      TEXT NOT NULL REFERENCES community_group(id),
    personal_wechat_id TEXT REFERENCES account(id),   -- 承接个微
    status        TEXT NOT NULL DEFAULT '待匹配'
                  CHECK (status IN ('待匹配','已推荐','待确认','待加好友','已加好友','待邀请','已邀请','已入群',
                                    '匹配失败','好友申请失败','邀请失败','拒绝入群','重复入群','人工取消','群已满','已退群')),
    recommend_score NUMERIC(6,2),
    hit_rules     JSONB,                     -- 命中规则清单
    risk_hints    JSONB,
    assign_way    TEXT NOT NULL DEFAULT 'AI推荐' CHECK (assign_way IN ('AI推荐','人工调整')),
    override_reason TEXT,                    -- 人工覆盖必填（SPEC §7.4）
    operator      TEXT,
    approval_id   BIGINT,                    -- 超容量等高风险覆盖关联审批
    fail_reason   TEXT,
    friend_task_id BIGINT,
    invite_task_id BIGINT,
    recommended_at TIMESTAMPTZ,
    confirmed_at  TIMESTAMPTZ,
    friended_at   TIMESTAMPTZ,
    invited_at    TIMESTAMPTZ,
    joined_at     TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- 同会员同项目仅一条在途分配（SPEC §7.2 防重复）
CREATE UNIQUE INDEX uq_assignment_inflight ON member_group_assignment(member_id, project_id)
    WHERE status IN ('待匹配','已推荐','待确认','待加好友','已加好友','待邀请','已邀请');
-- 同会员同群不允许重复"已入群"
CREATE UNIQUE INDEX uq_assignment_joined ON member_group_assignment(member_id, group_id)
    WHERE status = '已入群';
CREATE INDEX idx_assignment_group ON member_group_assignment(group_id, status);

-- 容量预占（SPEC §7.2「负载预占」）
CREATE TABLE capacity_reservation (
    id           BIGSERIAL PRIMARY KEY,
    target_type  TEXT NOT NULL CHECK (target_type IN ('群容量','个微好友额度')),
    target_id    TEXT NOT NULL,              -- group.id 或 account.id
    amount       INT NOT NULL DEFAULT 1,
    assignment_id BIGINT REFERENCES member_group_assignment(id),
    status       TEXT NOT NULL DEFAULT '生效' CHECK (status IN ('生效','已释放','已消耗')),
    expires_at   TIMESTAMPTZ NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_reservation_active ON capacity_reservation(target_type, target_id) WHERE status = '生效';

-- ---------------------------------------------------------------------
-- 7. 任务域（SPEC §4.8 / §8.5）
-- ---------------------------------------------------------------------
CREATE TABLE task_batch (
    id          BIGSERIAL PRIMARY KEY,
    source      TEXT NOT NULL,               -- 会员分配/账号交接/配置整改/二维码轮换/同步异常
    project_id  TEXT REFERENCES project(id),
    remark      TEXT,
    created_by  TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE task_item (
    id          BIGSERIAL PRIMARY KEY,
    batch_id    BIGINT REFERENCES task_batch(id),
    task_type   TEXT NOT NULL CHECK (task_type IN ('加好友','邀请入群','回访','工单','交接','群二维码更新','同步异常','配置整改')),
    title       TEXT NOT NULL,
    project_id  TEXT REFERENCES project(id),
    member_id   BIGINT REFERENCES member(id),
    group_id    TEXT REFERENCES community_group(id),
    account_id  TEXT REFERENCES account(id),          -- 执行账号（如个微）
    assignee_employee_id BIGINT REFERENCES employee(id),
    assignment_id BIGINT REFERENCES member_group_assignment(id),
    priority    TEXT NOT NULL DEFAULT '中' CHECK (priority IN ('高','中','低')),
    status      TEXT NOT NULL DEFAULT '待领取'
                CHECK (status IN ('待创建','待领取','已分配','处理中','待复核','已完成','失败','超时','已取消','需人工处理')),
    due_at      TIMESTAMPTZ,
    fail_reason TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ
);
CREATE INDEX idx_task_status ON task_item(status, task_type);

CREATE TABLE task_attempt (
    id          BIGSERIAL PRIMARY KEY,
    task_id     BIGINT NOT NULL REFERENCES task_item(id),
    result      TEXT NOT NULL CHECK (result IN ('成功','失败')),
    fail_reason TEXT,
    operator    TEXT,
    idempotency_key TEXT UNIQUE,             -- 回填幂等
    attempted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE task_evidence (
    id         BIGSERIAL PRIMARY KEY,
    task_id    BIGINT NOT NULL REFERENCES task_item(id),
    kind       TEXT NOT NULL DEFAULT '备注' CHECK (kind IN ('截图','备注','回填字段')),
    content    TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- 8. 运营域
-- ---------------------------------------------------------------------
CREATE TABLE follow_up (
    id          BIGSERIAL PRIMARY KEY,
    member_id   BIGINT NOT NULL REFERENCES member(id),
    project_id  TEXT REFERENCES project(id),
    category    TEXT NOT NULL,               -- 阶段回访/售后问题/订单回访/经营回访/资料完善/续费提醒
    priority    TEXT NOT NULL DEFAULT '一般' CHECK (priority IN ('非常重要','重要','一般')),
    queue       TEXT NOT NULL DEFAULT '待处理' CHECK (queue IN ('待处理','我发布的','我回访的')),
    content     TEXT,
    assignee    TEXT,
    remind_at   TIMESTAMPTZ,
    write_back  BOOLEAN NOT NULL DEFAULT TRUE,
    done        BOOLEAN NOT NULL DEFAULT FALSE,
    result_note TEXT,
    created_by  TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ
);

CREATE TABLE ticket (
    id          BIGSERIAL PRIMARY KEY,
    ticket_no   TEXT NOT NULL UNIQUE,        -- TK2026070501
    ticket_type TEXT NOT NULL,               -- 入群异常/退款跟进/账号问题/服务回访/功能咨询/内容投诉/技术故障
    member_id   BIGINT REFERENCES member(id),
    project_id  TEXT REFERENCES project(id),
    assignee_employee_id BIGINT REFERENCES employee(id),
    city        TEXT,
    status      TEXT NOT NULL DEFAULT '待处理' CHECK (status IN ('待处理','进行中','已解决')),
    priority    TEXT NOT NULL DEFAULT '中' CHECK (priority IN ('高','中','低')),
    sla_total_hours INT NOT NULL DEFAULT 12,
    description TEXT,
    tags        JSONB,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at TIMESTAMPTZ
);

-- 交易只读镜像（SPEC §2.2：订单佣金财务归外部系统）
CREATE TABLE order_reference (
    id             BIGSERIAL PRIMARY KEY,
    external_order_no TEXT NOT NULL,
    source_system  TEXT NOT NULL,            -- 会员项目订单系统 等
    member_id      BIGINT REFERENCES member(id),
    project_id     TEXT REFERENCES project(id),
    product_name   TEXT,
    amount         NUMERIC(14,2),
    status         TEXT,                     -- 外部状态原样镜像：已完成/待确认/退款申请/审核中/退款完成
    external_time  TIMESTAMPTZ,
    synced_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    sync_version   BIGINT NOT NULL DEFAULT 1,
    UNIQUE (source_system, external_order_no)
);

-- 收益只读镜像（供小程序/PC 展示；数据来自外部系统同步）
CREATE TABLE earnings_snapshot (
    id            BIGSERIAL PRIMARY KEY,
    member_id     BIGINT NOT NULL REFERENCES member(id),
    project_id    TEXT REFERENCES project(id),         -- NULL=跨项目合并
    total_est     NUMERIC(14,2) NOT NULL DEFAULT 0,    -- 累计预估
    withdrawable  NUMERIC(14,2) NOT NULL DEFAULT 0,    -- 可提现
    pending       NUMERIC(14,2) NOT NULL DEFAULT 0,    -- 待结算
    frozen        NUMERIC(14,2) NOT NULL DEFAULT 0,
    source_system TEXT NOT NULL DEFAULT 'mock-project-system',
    synced_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE NULLS NOT DISTINCT (member_id, project_id)   -- project_id=NULL 表示跨项目合并行，也须唯一
);

-- 提现申请：中台只做审批协同，打款在外部系统（SPEC §2.2/§11.2）
CREATE TABLE withdrawal_request (
    id           BIGSERIAL PRIMARY KEY,
    member_id    BIGINT NOT NULL REFERENCES member(id),
    amount       NUMERIC(14,2) NOT NULL CHECK (amount >= 100),
    method       TEXT NOT NULL CHECK (method IN ('微信','支付宝','银行卡')),
    account_info TEXT,
    status       TEXT NOT NULL DEFAULT '待审核' CHECK (status IN ('待审核','已批准','已打款','已拒绝')),
    approval_id  BIGINT,
    external_payout_ref TEXT,                -- 外部系统打款回执
    idempotency_key TEXT UNIQUE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    decided_at   TIMESTAMPTZ
);

CREATE TABLE member_task (
    id          BIGSERIAL PRIMARY KEY,
    member_id   BIGINT NOT NULL REFERENCES member(id),
    title       TEXT NOT NULL,
    task_type   TEXT NOT NULL,               -- 服务回访/入群异常/日常运营/每日签到/内容任务
    priority    TEXT NOT NULL DEFAULT '低' CHECK (priority IN ('高','中','低')),
    points      INT NOT NULL DEFAULT 0,
    deadline    TEXT,
    done        BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE points_ledger (
    id         BIGSERIAL PRIMARY KEY,
    member_id  BIGINT NOT NULL REFERENCES member(id),
    delta      INT NOT NULL,
    reason     TEXT NOT NULL,
    ref_type   TEXT,
    ref_id     TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE growth_ledger (
    id         BIGSERIAL PRIMARY KEY,
    member_id  BIGINT NOT NULL REFERENCES member(id),
    delta      INT NOT NULL,
    reason     TEXT NOT NULL,                -- 邀请成功/任务完成/...
    ref_type   TEXT,
    ref_id     TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE invite_code (
    id          BIGSERIAL PRIMARY KEY,
    code        TEXT NOT NULL UNIQUE,        -- 短码（≤32 字符，映射 wxacode scene）
    owner_member_id BIGINT NOT NULL REFERENCES member(id),
    project_scope TEXT,                      -- NULL=跨项目
    valid_until TIMESTAMPTZ NOT NULL,
    rotated_from BIGINT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_invite_owner ON invite_code(owner_member_id);

CREATE TABLE attribution_log (
    id          BIGSERIAL PRIMARY KEY,
    invite_code TEXT,
    source      TEXT NOT NULL,               -- 推广码/活动链接/邀请码/直播间关注
    new_member_id BIGINT REFERENCES member(id),
    referrer_member_id BIGINT REFERENCES member(id),
    project_id  TEXT REFERENCES project(id),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- 9. 治理域（SPEC §11 / §12 / §13.2）
-- ---------------------------------------------------------------------
CREATE TABLE approval (
    id           BIGSERIAL PRIMARY KEY,
    approval_type TEXT NOT NULL,             -- 提现审批/超容量分配/跨项目共用/账号交接/资源方案发布/批量导出/退款协同/权限变更/新账号申请
    title        TEXT NOT NULL,
    submitter    TEXT NOT NULL,
    project_id   TEXT REFERENCES project(id),
    urgent       BOOLEAN NOT NULL DEFAULT FALSE,
    status       TEXT NOT NULL DEFAULT '待审批' CHECK (status IN ('待审批','审批中','已同意','已拒绝')),
    detail       JSONB NOT NULL DEFAULT '{}'::jsonb,
    callback_type TEXT,                      -- 回调执行器类型：WITHDRAWAL/OVERRIDE_ASSIGN/RESOURCE_PUBLISH/HANDOVER
    callback_ref  TEXT,                      -- 关联业务主键
    decided_by   TEXT,
    decision_comment TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    decided_at   TIMESTAMPTZ
);

CREATE TABLE approval_history (
    id          BIGSERIAL PRIMARY KEY,
    approval_id BIGINT NOT NULL REFERENCES approval(id),
    actor       TEXT NOT NULL,
    action      TEXT NOT NULL,               -- 提交申请/自动分配审批人/开始审批/同意/拒绝
    comment     TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE risk_event (
    id          BIGSERIAL PRIMARY KEY,
    risk_type   TEXT NOT NULL,               -- SPEC §12 八类：群缺客服/群容量/个微负载/账号异常/会员冲突/好友邀请失败/同步失败/任务超时
    level       TEXT NOT NULL DEFAULT '中' CHECK (level IN ('高','中','低')),
    title       TEXT NOT NULL,
    ref_type    TEXT,                        -- group/account/member/task/sync
    ref_id      TEXT,
    project_id  TEXT REFERENCES project(id),
    owner       TEXT,
    due_at      TIMESTAMPTZ,
    status      TEXT NOT NULL DEFAULT '待处理' CHECK (status IN ('待处理','处理中','已解决','已忽略')),
    converted_task_id BIGINT REFERENCES task_item(id),
    converted_approval_id BIGINT REFERENCES approval(id),
    resolution  TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at TIMESTAMPTZ
);

CREATE TABLE audit_log (
    id          BIGSERIAL PRIMARY KEY,
    object_type TEXT NOT NULL,
    object_id   TEXT NOT NULL,
    action      TEXT NOT NULL,
    before_value JSONB,
    after_value  JSONB,
    operator    TEXT NOT NULL,
    project_id  TEXT,
    reason      TEXT,
    approval_id BIGINT,
    source_ip   TEXT,
    result      TEXT NOT NULL DEFAULT '成功',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- append-only：审计日志不可修改删除（SPEC §11.3）
CREATE OR REPLACE FUNCTION forbid_audit_mutation() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'audit_log is append-only: % not allowed', TG_OP;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_audit_no_update BEFORE UPDATE OR DELETE ON audit_log
    FOR EACH ROW EXECUTE FUNCTION forbid_audit_mutation();

CREATE TABLE sync_job (
    id           BIGSERIAL PRIMARY KEY,
    job_type     TEXT NOT NULL CHECK (job_type IN ('API','Webhook','定时同步','人工导入')),
    source_system TEXT NOT NULL,
    resource     TEXT NOT NULL,              -- 统一会员档案/订单/收益/群成员事件...
    mapping_version TEXT NOT NULL DEFAULT 'v1',
    cursor_value TEXT,
    status       TEXT NOT NULL DEFAULT '运行中' CHECK (status IN ('运行中','已完成','失败','部分失败')),
    total_count  INT NOT NULL DEFAULT 0,
    success_count INT NOT NULL DEFAULT 0,
    error_count  INT NOT NULL DEFAULT 0,
    started_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    finished_at  TIMESTAMPTZ
);

CREATE TABLE sync_error (
    id          BIGSERIAL PRIMARY KEY,
    job_id      BIGINT NOT NULL REFERENCES sync_job(id),
    payload     JSONB,
    error_msg   TEXT,
    idempotency_key TEXT,
    retry_count INT NOT NULL DEFAULT 0,
    status      TEXT NOT NULL DEFAULT '待重试' CHECK (status IN ('待重试','已重试成功','人工处理','已放弃')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 幂等键登记（写接口通用）
CREATE TABLE idempotency_record (
    key         TEXT PRIMARY KEY,
    endpoint    TEXT NOT NULL,
    response_snapshot JSONB,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- FK 后补（互相依赖的列）
ALTER TABLE project ADD CONSTRAINT fk_project_active_version
    FOREIGN KEY (active_resource_version_id) REFERENCES project_resource_version(id);
ALTER TABLE project_resource_version ADD CONSTRAINT fk_prv_approval
    FOREIGN KEY (approval_id) REFERENCES approval(id);
ALTER TABLE account_handover ADD CONSTRAINT fk_handover_approval
    FOREIGN KEY (approval_id) REFERENCES approval(id);
ALTER TABLE member_group_assignment ADD CONSTRAINT fk_assignment_approval
    FOREIGN KEY (approval_id) REFERENCES approval(id);
ALTER TABLE member_group_assignment ADD CONSTRAINT fk_assignment_friend_task
    FOREIGN KEY (friend_task_id) REFERENCES task_item(id);
ALTER TABLE member_group_assignment ADD CONSTRAINT fk_assignment_invite_task
    FOREIGN KEY (invite_task_id) REFERENCES task_item(id);
ALTER TABLE withdrawal_request ADD CONSTRAINT fk_withdrawal_approval
    FOREIGN KEY (approval_id) REFERENCES approval(id);
