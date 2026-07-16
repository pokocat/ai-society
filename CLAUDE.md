# CLAUDE.md — 蜂乐玛社群运营中台 · Agent 工作守则

本仓库由 AI agent 持续开发维护。以下护栏是**硬性要求**，任何后续改动（无论 AI 还是人）都必须遵守。
业务权威基线：设计仓库 `pokocat/ai-bossclub-design` 的《业务逻辑与项目说明》V1.0（下称 SPEC）；
技术方案：`docs/技术方案-工程评审稿.md`；概念权威：`ontology/bossclub.ttl` + `ontology/MAPPING.md`。

## 仓库结构与常用命令

```
ontology/     # OWL 本体（设计期概念权威）+ 概念→表→API 映射
server/       # Spring Boot 3.3 / Java 21 / PostgreSQL 16 / Flyway / JdbcClient 后端
apps/         # 前端子应用（admin-pc 迁入中；member-app / jinfu-app 延后）
packages/shared/openapi.yaml   # API 契约（springdoc 导出，前端据此生成 client）
scripts/      # db-init.sh（起库，幂等）/ smoke.sh（端到端冒烟，14 步 22 断言）
docs/         # 技术方案评审稿；docs/prototype/ 为早期原型归档
```

```bash
bash scripts/db-init.sh          # PostgreSQL：scp_dev / scp_test（user=scp）
cd server && mvn test            # 全量测试，必须全绿
mvn spring-boot:run              # 启动（Flyway 自动迁移+种子）
bash scripts/smoke.sh            # 冒烟，必须 0 失败
```

演示账号（密码均 `demo123`）：`boss`（创始人/PC）、`liyuntian`（会员端）、`zhaoyichuan`（金服端）。

---

## 一、SQL 安全护栏（最高优先级）

1. **所有 SQL 值必须走 JdbcClient 命名参数绑定**（`:param` + `.param()`，底层 PreparedStatement）。
   **绝对禁止**把任何变量拼接进 SQL 字符串：`db.sql("... " + var)`、`String.format` 进 SQL、
   在 SQL 文本里内插用户输入，一律不允许——包括"看起来安全"的内部值（ID、枚举、状态名）。
2. **动态片段白名单化**：确需动态列名/排序方向时，必须在 Java 侧用 `switch`/`Map` 把输入映射到
   硬编码字面量后再进 SQL，禁止透传。
3. **LIKE 的正确写法**：`col ILIKE '%' || :kw || '%'`（拼接发生在数据库端、值已绑定）。禁止在 Java 拼 `%`
   后再拼 SQL。
4. **JSON/JSONB 参数必须用 Jackson `ObjectMapper` 序列化**后以 `CAST(:x AS jsonb)` 绑定。
   **禁止字符串拼 JSON**（`"{\"k\":\"" + v + "\"}"` 这类）——这不是 SQL 注入，但用户可控字段含引号会
   破坏 JSON，甚至向审批单详情注入伪造展示字段欺骗审批人（同族漏洞，同样零容忍）。
5. **守卫测试**：新增/修改持久层代码时，保持（若尚未存在则补建）一个构建期守卫测试：扫描
   `server/src/main/java` 源码，匹配 `sql(` 调用中出现 `" +`/`+ "` 拼接模式即测试失败。让违规过不了 CI，
   不依赖 review 自觉。
6. **纵深防御**：运行时连库账号应仅有 DML 权限（无 DDL/TRUNCATE），对 `audit_log` 仅 INSERT。
   涉及连库配置改动时朝这个方向收敛，不要反向放权。

## 二、持久层与数据模型护栏

7. **DDL 是唯一事实源**：模型改动顺序 = 先改 `ontology/bossclub.ttl`（概念/公理）→ 同步
   `ontology/MAPPING.md` → **新增** Flyway 迁移（`V<n>__*.sql`）。**永远不修改已合入的迁移文件**。
8. **不引入 JPA/Hibernate 实体层**（既定选型）：本系统要害——行锁预占、物化路径、部分唯一索引、
   聚合校验——都要求 SQL 行为完全显式可审计。坚持 JdbcClient + `Rows.MAP` 约定。
9. **统计可追溯**（SPEC §13.1）：聚合列（群人数、个微好友数、服务群数）只能由业务动作在事务内维护，
   **禁止人工快照直改**；改聚合口径必须同步更新 `/sync/reconcile` 对账查询。
10. **枚举进字典**：新增业务枚举值写 `dict_entry` 种子 + CHECK 约束，禁止只散落在 Java 字面量里。

## 三、事务·并发·状态机护栏

11. **容量/额度校验的唯一合法形态**：`SELECT ... FOR UPDATE` 锁行后，校验
    `当前聚合值 + 生效预占 + 本次 ≤ 上限`，通过才 INSERT `capacity_reservation`（带 TTL）。
    禁止无锁校验、禁止先扣后验。**锁序固定：先群、后账号**，避免死锁。
12. **状态迁移必须走各服务的 `TRANSITIONS` 合法迁移表**（项目/账号/群/入群/任务五套状态机，
    定义对齐 SPEC §8）。**禁止直接 `UPDATE ... SET status=...` 绕过校验**（`GroupService.refreshStatus`
    的自动刷新是唯一例外，且只在流转型状态间迁移）。
13. **`@Transactional(REQUIRES_NEW)` 自调用不生效**（代理陷阱）：同 bean 内需要独立提交的写入
    （如同步作业留痕）必须用 `TransactionTemplate`（见 `SyncService.independentTx`）。
14. **入群回写必须同事务**：置「已入群」时，群人数、个微负载、好友关系、档案时间线、预占消耗、
    群状态刷新必须在同一事务内完成（见 `AssignmentService.confirmJoin`）。

## 四、业务边界铁律（源自 SPEC，违反=方向性错误）

15. **中台不建交易域**（SPEC §2.2）：订单/佣金/收益只有 `order_reference`/`earnings_snapshot`
    **只读镜像**（经 sync 层进入）；提现只做**审批协同**，打款归外部系统。任何"在中台算佣金/记账"
    的需求先在方案层面对齐边界，不要直接写代码。
16. **入群是一等对象**（SPEC §4.7）：任何入群/退群必须经 `member_group_assignment` 八态漏斗。
    **禁止只改群人数**。只有 webhook 入群事件或人工确认两条路径可置「已入群」（SPEC §6.7）。
17. **不做个微客户端自动化**（SPEC §2.3）：加好友/邀请一律是「任务派发→人工执行→回填结果」。
    禁止引入 Wechaty 等个微协议自动化（企微官方 API 适配属阶段四，走 `gateway` 抽象接入）。
18. **人工覆盖必填原因**（SPEC §7.4）：改选非推荐方案必须记 `override_reason`；超容量/跨项目共用/
    交接/方案发布/批量导出等高风险动作必须走**审批单→回调执行器**模式（先审批后执行，禁止先执行后补单）。
19. **资源方案版本**：`draft→validated→published`，发布后不可变，变更开新版本（SPEC §6.3）。

## 五、权限·审计·幂等护栏

20. **每个业务 Controller 端点必须带 `@Perm(module, action)`**——服务端强制是唯一算数的鉴权
    （SPEC §11.1），前端隐藏按钮不算。新模块先在 `role_permission` 种子里补权限位。
21. **audit_log 是 append-only**（数据库触发器拒绝 UPDATE/DELETE）：禁止移除该触发器；高风险操作
    （状态变更/规则修改/审批决策/合并）必须经 `AuditService` 留痕（前后值+原因+关联审批）。
22. **写接口幂等**：任务回填、提现、同步进线类接口必须支持 `Idempotency-Key`（经 `IdempotencyGuard`），
    重复键直接返回首次结果，不重复执行。

## 六、规则外置

23. **禁止硬编码业务阈值**：100 人/群、20 群/个微、1800/2000 好友、90% 预警、邀请成长值 288、
    推荐引擎权重——全部读 `resource_rules` 表。新增阈值先加列（迁移）再用，让运营可在线调整。

## 七、测试与交付门禁

24. 新机制必须带测试；测试**自建数据 + 唯一后缀**（继承 `TestSupport`），可重复执行，不依赖种子数据
    绝对数值，不与并行用例互踩（相对断言，教训见 `RecommendEngineTest`）。
25. 并发敏感逻辑（预占/扣减/状态竞争）必须有多线程防超卖式测试（参照
    `CapacityReservationConcurrencyTest`：N 线程抢 M 容量，断言成功数恰为 M）。
26. **提交门禁**：`mvn test` 全绿 + `scripts/smoke.sh` 0 失败才能 commit；API 变更后重导出
    `packages/shared/openapi.yaml`。提交推送到分支 `claude/elegant-sagan-em95bu`。
27. 语言约定：代码注释/文档/错误文案用中文（面向中文团队与前端展示）；commit message 用英文。

## 八、已知欠账（下一个接手的 agent 优先处理）

- [x] **JSON 拼接改 ObjectMapper**（第 4 条）：已全部改用 `common/Json.obj/write`（6 处：
      提现/超容量/交接/资源发布/风险处置 的 approval.detail、SyncService.recordError payload、
      ResourceVersionController issues）。新写 JSONB 一律走 `Json`，禁止再拼字符串。
- [x] **横向越权（IDOR）兜底**：`UserContext.assertMemberAccess` 已挡 SELF 范围用户越权访问他人
      memberNo（会员档案/时间线/收益/提现/会员任务）。**但**数据范围第②层（PROJECT/REGION）仍靠各
      service 手工过滤，`@DataScope` 注解式注入尚未做——新增按项目/区域隔离的端点需自行加过滤。
- [x] **SQL 拼接守卫测试**（第 5 条）：`SqlConcatGuardTest` 扫描 `src/main/java`，`.sql(...)` 内出现
      `" +`/`+ "` 拼接即 CI 失败。当前全绿。新增持久层代码若拼 SQL 值会被它拦下。
- [x] **运行时连库账号降权**（第 6 条）：应用以 `scp_app`（仅 DML）连接，`scp` 仅迁移用（Flyway 单独连接）。
      `scp_app` 非属主，无法 `DROP/DISABLE` audit_log 触发器、无 DDL、对 audit_log 仅 INSERT/SELECT——
      审计不可篡改由权限隔离兜底。角色见 `scripts/db-init.sh`，授权见 `V3__grant_scp_app.sql`。
- [ ] **上线前收口**：webhook 无签名校验（`WebhookController` 注释自承 Mock 阶段）、`mock/**` 无鉴权
      （`push-earnings` 可无认证设余额，务必绝不随生产暴露）、JWT 密钥为仓库固定值、CORS `*`。
- [ ] **前端诚实度收口（M2）**：见下批次任务——未接线 chrome 的假成功 toast、无后端来源字段的
      占位（证件/写死基准日/推送次数=0 应显示"—"）、AccountAssets 深色遗留文字对比度。
- [ ] admin-pc 剩余模块接线（工单/权限矩阵/城市分站/报表等，见 docs/技术方案-工程评审稿.md §8.1）。
