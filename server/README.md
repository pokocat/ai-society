# 主理人社群运营中台 · 后端（server）

Spring Boot 3.3 / Java 21 / PostgreSQL 16 / Flyway / JdbcClient（显式 SQL，DDL 为唯一事实源）。
领域模型与状态机对齐设计仓库 `ai-bossclub-design` 的业务文档 SPEC V1.0；概念权威见 `../ontology/bossclub.ttl` 与 `../ontology/MAPPING.md`。

## 快速开始

```bash
bash ../scripts/db-init.sh        # 起本地 PostgreSQL，建 scp_dev / scp_test（幂等）
mvn test                          # 全量测试（20 个用例，含并发防超卖）
mvn spring-boot:run               # 启动（Flyway 自动迁移 + 种子数据）
bash ../scripts/smoke.sh          # 端到端冒烟：进线→推荐→确认→任务回填→入群→提现审批
```

- Swagger UI: http://127.0.0.1:8080/swagger-ui.html （契约同步导出在 `../packages/shared/openapi.yaml`）
- 演示账号（密码均 `demo123`）：`boss` 王总·创始人（PC 全权限）/ `liyuntian` 李云天（会员端）/ `zhaoyichuan` 赵一川（金服端）

## 分域包结构

| 包 | 职责 | 核心机制 |
|---|---|---|
| `common` | JWT/权限拦截/审计/幂等/异常 | 三层权限第①层（角色功能位 @Perm）服务端强制 |
| `platform` | 项目/规则/资源方案版本 | 项目六态状态机；方案 草稿→校验(issues)→发布(挂审批) |
| `resource` | 账号/员工/群三资源库 | 账号七态；群八态自动刷新；编组负载预测；二维码 7 天轮换 |
| `identity` | 统一会员/并档/关系链/时间线 | 并档优先级+冲突队列；物化路径三公理（单推荐人/无环递归校验/≤3级） |
| `assignment` | 推荐引擎/入群分配/预占 | 五级推荐（权重落库）；行锁+预占防超卖；入群八态状态机 |
| `task` | 任务四表（批次/任务/执行/证据） | 回填幂等；加好友成功自动派邀请任务 |
| `gateway` | 社群网关抽象 + webhook | Mock 通道默认；企微适配器阶段四接入，业务代码不改 |
| `governance` | 审批/风险/审计 | 审批单→回调执行器（提现/超容量/交接/发布）；audit_log 数据库级 append-only |
| `ops` | 回访/工单/交易镜像/提现/邀请码/会员任务 | 回访完成写档案时间线；提现≥100 整数≤余额→审批协同 |
| `sync` | 同步作业/失败队列/对账 | 作业与错误独立事务留痕；聚合 vs 明细对账 |
| `mocksystem` | 模拟外部会员/订单系统 | `/api/v1/mock/**` 注入进线/订单/收益事件（演示与联调） |

## 关键设计决定

1. **交易边界**（SPEC §2.2）：订单/佣金/财务归外部系统；中台只有 `order_reference`/`earnings_snapshot` 只读镜像，提现走审批协同。
2. **入群是一等对象**（SPEC §4.7）：任何入群必须经 `member_group_assignment` 八态漏斗，只有 webhook 入群事件或人工确认可置「已入群」；群人数=计数器+对账（外部存量成员经同步进入）。
3. **负载口径**（SPEC §7.2）：个微服务群数从编组明细聚合；确认分配 = `SELECT FOR UPDATE` + `当前聚合 + 活跃预占 + 本次 ≤ 上限`，预占带 TTL 定时释放。
4. **规则全部落库**（SPEC §7.1）：100 人/群、20 群/个微、1800/2000 好友、90% 预警、邀请成长值 288、推荐权重——`resource_rules` 单行表在线可调。
5. **ORM 采用 JdbcClient 而非 JPA**：本系统的核心机制（行锁预占、物化路径、聚合校验、部分唯一索引）都是原生 SQL 强项，显式 SQL 让行为完全可审计；DDL 即模型（评审稿开放问题 #2 的落地选择，异议可提）。
