# 本体 → PostgreSQL → API 三层映射

> 用法：`bossclub.ttl` 是设计期概念权威（Protégé 可开）。新增/修改业务概念时先改本体，再按本表同步
> DDL（`server/src/main/resources/db/migration/`）与 API（`packages/shared/openapi.yaml`），保持三层一致。
> 存储原则（会话定稿）：运行时数据全在 PostgreSQL，不上三元组库/Neo4j/运行时推理；
> 关系链用物化路径（≤3 级），统计一律可追溯明细（SPEC §13.1）。

| 本体概念（bossclub.ttl） | PostgreSQL 表 | 核心 API（/api/v1） | 备注 |
|---|---|---|---|
| :Project | project | GET/POST /projects, PATCH /projects/{id}/status | 状态机 SPEC §8.1，六态 |
| :ProjectIntegration | project_integration | POST /projects（附带创建）, POST /projects/{id}/sync | 接入方式/数据权限 |
| :ProjectResourceVersion | project_resource_version | POST /projects/{id}/resource-versions + /validate + /publish | 草稿→校验→发布；发布挂审批，快照冻结 |
| :Account（:PersonalWechatAccount/:WecomAccount/:PhoneAccount/:MediaAccount 子类） | account（account_type 判别） | GET/POST /accounts, PATCH /accounts/{id}/status | 状态机 SPEC §8.2；负载聚合列 friend_count/serving_group_count |
| :Device | device | —（随账号管理） | |
| :Employee | employee | GET/POST /employees | 人员与账号解耦 |
| :AccountAssignment（authorizedForProject 具体化） | account_assignment | POST /accounts/{id}/assignments, /assignments/revoke | 多对多共享池 |
| :AccountHandover | account_handover | POST /accounts/{id}/handovers | 自动建「账号交接」审批 |
| :CommunityGroup（ownedByMember/wecomChatId） | community_group（M3 增 owner_member_id/wecom_chat_id/join_way_id） | GET/POST /groups, PATCH /groups/{id} | 状态机 SPEC §8.3，八态；builtByWecom=builder_account_id；归属代理=推荐引擎第 0 级候选集限定 |
| :GroupStaffing（servedByWecomStaff/servedByPersonalWechat 具体化） | group_staffing | POST /groups/{id}/staffing（含负载预测） | 一群双客服 |
| :GroupQrCode | group_qrcode | POST /groups/{id}/qrcode/rotate | 7 天轮换 |
| :GroupLifecycleEvent | group_lifecycle_event | GET /groups/{id}（detail 内） | 事件流水 |
| :Member | member | GET /members, GET /members/{no}/profile | 统一会员 U-xxxxx；merged_into 指针 |
| :MemberIdentifier（hasIdentifier） | member_identifier（+ member_merge_log / member_merge_conflict） | POST /members/{no}/identifiers | 并档优先级 unionid>手机号>企微>个微 |
| :MemberProjectIdentity（hasProjectIdentity） | member_project_identity（+ member_identity_history） | 档案聚合返回 | 一人多项目身份 |
| :ReferralRelation（hasReferrer 函数型） | referral_relation（lv1/lv2/lv3_parent 物化路径） | POST /referral/bind, GET /referral/{no}/chain, /influence-matrix | 三公理：单推荐人（一人一行）/无环（递归上溯校验）/≤3 级（路径截断） |
| :MemberTimelineEntry | member_timeline | GET /members/{no}/timeline | 回访/订单/入群/身份统一追加 |
| :MemberWechatRelation（friendOf 具体化） | member_wechat_relation | 档案聚合返回 | 确认方式：接口同步/人工回填 + 校准时间 |
| :MemberGroupAssignment | member_group_assignment | /assignment/pending, /recommend, /confirm, /cancel, /{id}/confirm-join | 八态状态机 SPEC §8.4；唯一在途部分索引 |
| :CapacityReservation（reserves） | capacity_reservation | （confirm 内部创建；定时释放过期） | 行锁 + 预占防超卖 SPEC §7.2 |
| :TaskBatch/:TaskItem/:TaskAttempt/:TaskEvidence | task_batch / task_item / task_attempt / task_evidence | GET /tasks, POST /tasks/{id}/claim, /attempts（幂等）, /evidence | 状态机 SPEC §8.5；加好友成功自动派邀请任务 |
| :FollowUp | follow_up | GET/POST /followups, POST /followups/{id}/complete | 完成必写时间线（SPEC §16-6） |
| :Ticket | ticket | GET/POST /tickets, /assign /resolve /escalate | SLA 按类型 2/4/12/24h |
| :OrderReference | order_reference | GET /order-references | 只读镜像：外部**项目方**订单系统负责交易（SPEC §2.2；会员费一方订单除外，见 :MembershipOrder） |
| :MembershipPlan（grantsIdentity） | membership_plan | GET/POST /membership/plans, PATCH /membership/plans/{id}/status | M3 权益域：授予身份+时长+双端定价；上架/下架 |
| :MembershipOrder（orderOfPlan） | membership_order | POST /membership/orders, POST /membership/orders/callback, GET /membership/orders | 一方交易事实源；状态机 待支付→已支付→退款中→已退款/已关闭；callback_id 幂等 |
| :WelcomeTemplate | welcome_template | GET/POST /welcome-templates, PATCH .../{id} | 企微素材库映射；唯一全自动出站通道 |
| :BroadcastPlan | broadcast_plan | GET/POST /broadcasts, POST /broadcasts/{id}/dispatch | 派发→task_item(群发确认)→群主确认回填；每群每天≤1 条 |
| :CourseSession | course_session | GET/POST /courses, POST /courses/{id}/start-live, /finish | 企微群直播；回放 url 回填 |
| —（收益镜像，OrderReference 同域） | earnings_snapshot / withdrawal_request | GET /earnings/summary, POST /withdrawals | 提现=审批协同，打款在外部系统 |
| :MemberTask/:PointsLedgerEntry/:GrowthLedgerEntry | member_task / points_ledger / growth_ledger | GET /member-tasks, POST /member-tasks/{id}/complete | 邀请成长值 +288 默认，读 resource_rules |
| :InviteCode | invite_code / attribution_log | GET /invite-codes/mine, POST /invite-codes/rotate；小程序端 GET /mp/invite | 短码≤32 字符，7 天轮换；逻辑在 InviteCodeService（两端共用） |
| —（会员小程序端，M3b：复用上表概念，无新概念） | member_identifier 增「小程序openid」类型 | POST /mp/login（免鉴权，scene 归因）, GET /mp/me /invite /my-group /courses /faq, POST /mp/orders + /{no}/pay | member 角色仅开 mp 模块；memberNo 一律取自 JWT（SELF） |
| :Approval | approval / approval_history | GET /approvals, POST /approvals/{id}/decision | 回调执行器：WITHDRAWAL/OVERRIDE_ASSIGN/HANDOVER/RESOURCE_PUBLISH |
| :RiskEvent | risk_event | GET /risk-events, POST /risk-events/{id}/convert, /resolve | 八类异常，可转任务/审批（SPEC §12） |
| :AuditLog | audit_log（触发器禁 UPDATE/DELETE） | GET /audit-logs（M2 暴露） | append-only（SPEC §11.3） |
| :SyncJob/:SyncError | sync_job / sync_error | GET /sync/jobs, /errors, /reconcile, POST /sync/import/pending-member | 游标/幂等/失败队列/对账（SPEC §13.2） |
| 阈值数据属性（targetGroupSize 等 6 项 + wecomGroupCap/broadcastDailyQuota） | resource_rules（单行 + 推荐权重列；M3 增 paid_gate_enabled/affinity_first/wecom_group_cap/broadcast_daily_quota） | GET/PUT /rules | 全部可配，业务代码只读表 |

## 未映射为独立表的本体元素

- `:BusinessObject/:Resource/:RelationObject/:GovernanceObject`：抽象划分，不落表。
- `:Device`：已建表，M1 未开 API（账号详情内维护）。
- 权限三层（SPEC §11.1）：`role / role_permission / app_user(data_scope)` 支撑，本体未单独建概念（属系统层而非业务域）。
