-- =====================================================================
-- V2 种子数据：全部取自设计稿 mock（ai-bossclub-design @13a3a3c），
-- 保证 PC 前端接上 API 后所见即设计稿。演示密码统一 demo123。
-- =====================================================================

-- 0. 全局规则（单行）
INSERT INTO resource_rules (id) VALUES (1);

-- 1. 字典
INSERT INTO dict_entry (dict_code, item_code, item_label, sort_order) VALUES
 ('member_identity','visitor','游客',1),('member_identity','experiencer','体验官',2),
 ('member_identity','pro','PRO会员',3),('member_identity','premium','尊享官',4),
 ('member_identity','operator','运营商',5),('member_identity','agent','代理',6),
 ('member_identity','city_partner','城市合伙人',7),('member_identity','student','学员',8),
 ('member_identity','black_gold','黑金',9),('member_identity','vip','VIP',10),
 ('group_type','pro','PRO会员群',1),('group_type','experiencer','体验官群',2),
 ('group_type','visitor','游客群',3),('group_type','premium','尊享群',4),
 ('group_type','family','家族群',5),('group_type','branch','分站管理群',6),
 ('channel_source','official','公众号',1),('channel_source','xhs','小红书',2),
 ('channel_source','douyin','抖音',3),('channel_source','moments','朋友圈',4),
 ('channel_source','referral','转介绍',5),('channel_source','website','官网',6),
 ('channel_source','weibo','微博',7),('channel_source','agent','代理推荐',8),
 ('risk_type','group_no_cs','群未配置客服',1),('risk_type','group_capacity','群容量预警',2),
 ('risk_type','wechat_load','个微负载',3),('risk_type','account_abnormal','账号异常',4),
 ('risk_type','member_conflict','会员冲突',5),('risk_type','friend_invite_fail','好友/邀请失败',6),
 ('risk_type','sync_fail','同步失败',7),('risk_type','task_timeout','任务超时',8);

-- 2. 角色与权限（founder 全量；其余先给核心位，M2 补全矩阵）
INSERT INTO role (code, name, description) VALUES
 ('founder','创始人/系统管理员','定义全局规则、审批高风险操作、查看全局经营'),
 ('project_owner','项目负责人','建立项目、申请资源、确认项目服务方案'),
 ('region_admin','区域管理员','管理区域账号、群、员工和会员分配'),
 ('community_ops','社群运营','管理群、会员分配、内容触达和运营任务'),
 ('wecom_cs','企微客服','以企业身份进入群并承接服务'),
 ('personal_cs','个微客服','使用个人微信添加群成员并持续服务'),
 ('after_sales','售后客服','处理回访、工单、投诉和售后问题'),
 ('finance_ops','财务运营','查看订单、退款、佣金和审批数据'),
 ('auditor','审计/管理人员','只读审计和合规数据'),
 ('member','小程序会员','会员端登录角色'),
 ('operator','小程序运营商','金服端登录角色');

INSERT INTO role_permission (role_code, module, can_view, can_create, can_edit, can_delete, can_export, can_approve)
SELECT 'founder', m, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE FROM unnest(ARRAY[
 'workspace','overview','integrations','resourceconfig','accounts','wechat','staff','permissions',
 'community','assignment','cs','channel','users','orders','commission','tickets','approval',
 'cities','reports','ecosystem','risk']) AS m;
INSERT INTO role_permission (role_code, module, can_view, can_edit, can_approve) VALUES
 ('finance_ops','orders',TRUE,TRUE,FALSE),
 ('finance_ops','approval',TRUE,FALSE,TRUE),
 ('community_ops','community',TRUE,TRUE,FALSE),
 ('community_ops','assignment',TRUE,TRUE,FALSE),
 ('community_ops','users',TRUE,TRUE,FALSE),
 ('after_sales','tickets',TRUE,TRUE,FALSE),
 ('auditor','permissions',TRUE,FALSE,FALSE);

-- 3. 员工（设计稿人物）
INSERT INTO employee (emp_no, name, gender, phone, department, job_role, service_region) VALUES
 ('YG-0001','吴思远','男','138-0012-3456','客服部','企微客服','华北区'),
 ('YG-0002','林小燕','女','139-0021-1122','运营部','社群运营','华东区'),
 ('YG-0003','刘刚','男','137-0033-4455','客服部','企微客服','华南区'),
 ('YG-0007','周小七','女','138-7777-0007','运营部','社群运营','华东区'),
 ('YG-0005','王小五','男','138-5555-0005','客服部','售后客服','全国'),
 ('YG-0018','郑远','男','136-0018-0018','渠道部','城市负责人','待配置');

-- 4. 操作用户（密码 demo123）
INSERT INTO app_user (username, display_name, password_hash, role_code, data_scope, member_no) VALUES
 ('boss','王总·创始人','85560555be84d55d77668c05aefa3c9c815853df897c68ec4aef596349c0d3b2','founder','ALL',NULL),
 ('liyuntian','李云天','85560555be84d55d77668c05aefa3c9c815853df897c68ec4aef596349c0d3b2','member','SELF','U-100024'),
 ('zhaoyichuan','赵一川','85560555be84d55d77668c05aefa3c9c815853df897c68ec4aef596349c0d3b2','operator','SELF','U-100086');

-- 5. 项目（设计稿 4 项目；状态映射：connected→运行中 / configuring→配置中）
INSERT INTO project (id, code, name, short_name, category, status, accent, service_region) VALUES
 ('flm-membership','FLM-MEMBER','蜂乐玛会员项目','会员项目','会员电商','运行中','#b6ff00','全国'),
 ('experience-camp','FLM-CAMP','百日体验营','体验营','课程活动','运行中','#050805','全国'),
 ('city-partner','FLM-CITY','城市合伙人项目','城市合伙人','渠道合伙','运行中','#d7ff00','华北区'),
 ('brand-live','FLM-LIVE','品牌直播项目','品牌直播','内容获客','配置中','#8c967d','全国');

INSERT INTO project_integration (project_id, api_type, data_scope, endpoint, auth_status, last_sync_at) VALUES
 ('flm-membership','OpenAPI','双向读写','api.fenglema.cn/member/v2','已鉴权', now()),
 ('experience-camp','REST API','仅读取项目数据','camp.fenglema.cn/open/v1','已鉴权', now() - interval '2 minutes'),
 ('city-partner','OpenAPI','双向读写','partner.fenglema.cn/api/v1','已鉴权', now() - interval '18 minutes'),
 ('brand-live','Webhook','仅回写任务结果',NULL,'等待鉴权',NULL);

-- 6. 账号库（设计稿 ResourceContext 10 账号）
INSERT INTO account (id, account_type, name, identifier, status, custodian_employee_id, user_employee_id, phone, real_name_verified, region, city, friend_count, friend_calibrated_at, serving_group_count, corp_name, dept, sync_status, last_login_at) VALUES
 ('WX-P-001','个人微信','蜂乐·吴思远','fengle_bj_01','使用中',1,1,'138-0012-3456',TRUE,'华北区','北京',1320,now(),12,NULL,NULL,NULL, now() - interval '1 day'),
 ('WX-P-002','个人微信','蜂乐·小燕','fengle_sh_02','使用中',2,2,'139-0021-1122',TRUE,'华东区','上海',980,now(),8,NULL,NULL,NULL, now() - interval '2 days'),
 ('WX-P-003','个人微信','蜂乐·广州服务','fengle_gz_01','风险',3,3,'137-0033-4455',TRUE,'华南区','广州',1780,now(),15,NULL,NULL,NULL, now() - interval '30 days'),
 ('WX-P-004','个人微信','蜂乐·成都','fengle_cd_01','可用',5,5,'138-5555-0005',TRUE,'西南区','成都',420,now(),3,NULL,NULL,NULL, now() - interval '3 days'),
 ('WX-P-005','个人微信','备用号01','fengle_bk_05','库存',NULL,NULL,NULL,FALSE,'待配置',NULL,0,NULL,0,NULL,NULL,NULL,NULL),
 ('WX-E-001','企业微信','蜂乐玛企微-吴思远','ww_fenglema_bj','使用中',1,1,NULL,TRUE,'华北区','北京',0,NULL,0,'蜂乐玛','北京服务中心','已同步', now() - interval '1 day'),
 ('WX-E-002','企业微信','蜂乐玛企微-小燕','ww_fenglema_sh','使用中',2,2,NULL,TRUE,'华东区','上海',0,NULL,0,'蜂乐玛','上海服务中心','已同步', now() - interval '1 day'),
 ('WX-E-003','企业微信','蜂乐玛企微-刘刚','ww_fenglema_gz','风险',3,3,NULL,TRUE,'华南区','广州',0,NULL,0,'蜂乐玛','广州服务中心','同步失败', now() - interval '30 days'),
 ('TEL-001','手机号','设备号-北京01','138-0012-3456','使用中',1,1,'138-0012-3456',TRUE,'华北区','北京',0,NULL,0,NULL,NULL,NULL,NULL),
 ('MEDIA-001','媒体账号','小红书官方号','fenglema_xhs','使用中',2,2,NULL,TRUE,'全国',NULL,0,NULL,0,NULL,NULL,NULL, now() - interval '1 day');

-- 账号↔项目授权（设计稿 projectIds；WX-P-002/WX-E-002 跨两项目）
INSERT INTO account_assignment (account_id, project_id, granted_by) VALUES
 ('WX-P-001','flm-membership',1),
 ('WX-P-002','flm-membership',1),('WX-P-002','experience-camp',1),
 ('WX-P-003','city-partner',1),
 ('WX-P-004','experience-camp',1),
 ('WX-E-001','flm-membership',1),
 ('WX-E-002','flm-membership',1),('WX-E-002','experience-camp',1),
 ('WX-E-003','city-partner',1),
 ('TEL-001','flm-membership',1),
 ('MEDIA-001','brand-live',1);

-- 7. 群库（设计稿 G-0001~0008；G-0006/G-0008 共享池）
INSERT INTO community_group (id, name, group_type, city, region, builder_account_id, project_id, target_capacity, member_count, qrcode_version, status) VALUES
 ('G-0001','北京PRO会员群01','PRO会员群','北京','华北区','WX-E-001','flm-membership',100,86,1,'服务中'),
 ('G-0002','北京PRO会员群02','PRO会员群','北京','华北区','WX-E-001','flm-membership',100,98,1,'容量预警'),
 ('G-0003','北京体验官群01','体验官群','北京','华北区','WX-E-001','experience-camp',100,45,1,'服务中'),
 ('G-0004','上海PRO会员群01','PRO会员群','上海','华东区','WX-E-002','flm-membership',100,72,1,'服务中'),
 ('G-0005','上海体验官群01','体验官群','上海','华东区','WX-E-002','experience-camp',100,38,1,'服务中'),
 ('G-0006','广州游客群01','游客群','广州','华南区','WX-E-003',NULL,100,15,0,'待配置'),
 ('G-0007','城市合伙人分站群','分站管理群','北京','华北区','WX-E-001','city-partner',100,26,1,'服务中'),
 ('G-0008','成都体验官群01（备用）','体验官群','成都','西南区',NULL,NULL,100,0,0,'待建群');

-- 双客服编组（企微客服=员工；个微客服=个微账号；G-0002 缺个微客服 → 风险）
INSERT INTO group_staffing (group_id, role, employee_id, account_id, is_primary) VALUES
 ('G-0001','企微客服',1,'WX-E-001',TRUE),('G-0001','个微客服',1,'WX-P-001',TRUE),
 ('G-0002','企微客服',1,'WX-E-001',TRUE),
 ('G-0003','企微客服',1,'WX-E-001',TRUE),('G-0003','个微客服',2,'WX-P-002',TRUE),
 ('G-0004','企微客服',2,'WX-E-002',TRUE),('G-0004','个微客服',2,'WX-P-002',TRUE),
 ('G-0005','企微客服',2,'WX-E-002',TRUE),('G-0005','个微客服',2,'WX-P-002',TRUE),
 ('G-0007','企微客服',1,'WX-E-001',TRUE),('G-0007','个微客服',1,'WX-P-001',TRUE);

INSERT INTO group_qrcode (group_id, version, image_url, valid_until) VALUES
 ('G-0001',1,'/reference-assets/wechat-qr.png', now() + interval '17 days'),
 ('G-0002',1,'/reference-assets/wechat-qr.png', now() + interval '17 days'),
 ('G-0003',1,'/reference-assets/wechat-qr.png', now() + interval '17 days'),
 ('G-0004',1,'/reference-assets/wechat-qr.png', now() + interval '17 days'),
 ('G-0005',1,'/reference-assets/wechat-qr.png', now() + interval '17 days'),
 ('G-0007',1,'/reference-assets/wechat-qr.png', now() + interval '17 days');

-- 8. 统一会员（设计稿人物）与身份
INSERT INTO member (member_no, name, phone, city, source_channel) VALUES
 ('U-100001','吴思远','138-0012-3456','北京','官网'),        -- id=1 服务老师同时也是会员/推荐人
 ('U-100024','李云天','138-0123-4567','北京','公众号'),      -- id=2
 ('U-100086','赵一川','138-8888-0086','北京','代理推荐'),    -- id=3
 ('U-100101','林小满','137-1111-0101','杭州','转介绍'),      -- id=4  赵一川直属
 ('U-100102','邱水婷','137-1111-0102','上海','转介绍'),      -- id=5  林小满直属（赵一川间接）
 ('U-100103','陈思雨','137-1111-0103','上海','转介绍'),      -- id=6  邱水婷直属（赵一川三级）
 ('U-100104','陈美玲','137-1111-0104','北京','公众号'),      -- id=7
 ('U-100105','刘晓峰','138-9876-5432','北京','公众号'),      -- id=8  待分配演示
 ('U-100106','王建国','137-1111-0106','深圳','抖音'),        -- id=9  退款风险
 ('U-100107','盛光年','137-3211-2621','北京','朋友圈'),      -- id=10
 ('U-100108','赵志远','137-1111-0108','成都','转介绍'),      -- id=11
 ('U-100109','Shirley·王欣','137-1111-0109','上海','官网');  -- id=12

INSERT INTO member_identifier (member_id, id_type, id_value, source_system) VALUES
 (1,'手机号','138-0012-3456','中台'),(1,'个微号','wusiyuan_flm','中台'),
 (2,'手机号','138-0123-4567','会员项目'),(2,'个微号','liyuntian88','会员项目'),(2,'unionid','uid_liyuntian_001','微信开放平台'),
 (3,'手机号','138-8888-0086','城市合伙人项目'),(3,'个微号','zhaoyichuan_v','城市合伙人项目'),(3,'unionid','uid_zhaoyichuan_001','微信开放平台'),
 (4,'个微号','xiaoman_flm','会员项目'),(5,'个微号','qiushuiting_v','体验营'),(6,'个微号','chensiyu_v','体验营'),
 (7,'手机号','137-1111-0104','会员项目'),(8,'手机号','138-9876-5432','会员项目'),
 (9,'手机号','137-1111-0106','会员项目'),(10,'手机号','137-3211-2621','会员项目'),
 (11,'手机号','137-1111-0108','体验营'),(12,'手机号','137-1111-0109','会员项目');

INSERT INTO member_project_identity (member_id, project_id, identity, stage, status, source) VALUES
 (1,'flm-membership','尊享官',NULL,'有效','官网'),
 (2,'flm-membership','PRO会员',NULL,'有效','公众号'),
 (3,'flm-membership','运营商',NULL,'有效','代理推荐'),
 (3,'city-partner','城市合伙人',NULL,'有效','代理推荐'),
 (3,'experience-camp','学员','第36天','有效','转介绍'),
 (4,'flm-membership','体验官',NULL,'有效','推广码'),
 (5,'experience-camp','体验官','第3天','有效','活动链接'),
 (6,'experience-camp','游客',NULL,'有效','直播间关注'),
 (7,'flm-membership','PRO会员',NULL,'有效','公众号'),
 (8,'flm-membership','PRO会员',NULL,'待分配','公众号'),
 (9,'flm-membership','PRO会员',NULL,'有效','抖音'),
 (10,'flm-membership','体验官',NULL,'有效','朋友圈'),
 (11,'experience-camp','体验官',NULL,'有效','转介绍'),
 (12,'flm-membership','黑金',NULL,'有效','官网');

-- 关系链（物化路径）：吴思远→李云天；赵一川→林小满→邱水婷→陈思雨；吴思远→赵志远
INSERT INTO referral_relation (member_id, referrer_id, lv1_parent, lv2_parent, lv3_parent, source, invite_code) VALUES
 (2,1,1,NULL,NULL,'推广码','FLM-WSY-01'),
 (4,3,3,NULL,NULL,'推广码','FLM-ZYC-01'),
 (5,4,4,3,NULL,'活动链接',NULL),
 (6,5,5,4,3,'直播间关注',NULL),
 (11,1,1,NULL,NULL,'推广码','FLM-WSY-01');

-- 好友关系（承接前提）
INSERT INTO member_wechat_relation (member_id, account_id, relation, confirm_way) VALUES
 (2,'WX-P-001','好友','接口同步'),
 (4,'WX-P-002','好友','人工回填'),
 (7,'WX-P-001','好友','人工回填'),
 (10,'WX-P-001','好友','接口同步');

-- 已入群关系（与群 member_count 无关的示例明细；档案用）
INSERT INTO member_group_assignment (member_id, project_id, group_id, personal_wechat_id, status, assign_way, joined_at, recommend_score) VALUES
 (2,'flm-membership','G-0001','WX-P-001','已入群','AI推荐', now() - interval '90 days', 92),
 (7,'flm-membership','G-0001','WX-P-001','已入群','人工调整', now() - interval '30 days', 88),
 (10,'flm-membership','G-0002','WX-P-001','已入群','AI推荐', now() - interval '10 days', 70);

INSERT INTO member_timeline (member_id, project_id, event_type, title, operator) VALUES
 (2,'flm-membership','入群','加入 北京PRO会员群01','系统'),
 (2,'flm-membership','订单','购买 PRO会员年卡 ¥2,480','同步'),
 (3,'city-partner','身份变更','升级为 城市合伙人','系统'),
 (4,'flm-membership','加好友','与 蜂乐·小燕 建立好友关系','林小燕');

-- 9. 交易/收益只读镜像（外部系统数据，经同步落库）
INSERT INTO order_reference (external_order_no, source_system, member_id, project_id, product_name, amount, status, external_time) VALUES
 ('ORD2026030101','mock-project-system',2,'flm-membership','PRO会员年卡',2480,'已完成', now() - interval '135 days'),
 ('ORD2025030102','mock-project-system',2,'flm-membership','续费PRO年卡',2480,'已完成', now() - interval '500 days'),
 ('ORD2025011503','mock-project-system',2,'experience-camp','体验营课程',980,'已完成', now() - interval '545 days'),
 ('ORD2026070504','mock-project-system',9,'flm-membership','续费PRO会员年卡',2480,'退款申请', now() - interval '9 days'),
 ('ORD2026070105','mock-project-system',12,'flm-membership','黑金年卡',8600,'已完成', now() - interval '13 days'),
 ('ORD2026070206','mock-project-system',3,'city-partner','城市合伙人费',9800,'已完成', now() - interval '12 days');

INSERT INTO earnings_snapshot (member_id, project_id, total_est, withdrawable, pending, frozen) VALUES
 (3,NULL,36950.00,8425.64,2380.00,320.00),
 (3,'flm-membership',16842.00,4200.00,1200.00,0),
 (3,'experience-camp',11680.00,2800.00,880.00,320.00),
 (3,'city-partner',8428.00,1425.64,300.00,0),
 (2,NULL,12740.00,1240.00,380.00,0);

-- 10. 会员端任务（设计稿 5 条）与账本期初
INSERT INTO member_task (member_id, title, task_type, priority, points, deadline) VALUES
 (2,'回访新用户陈美玲','服务回访','高',50,'今日 14:00'),
 (2,'处理入群异常：刘晓峰','入群异常','高',30,'今日 12:00'),
 (2,'完成本周群活跃报告','日常运营','中',20,'明日'),
 (2,'7 月学习打卡 Day 5','每日签到','低',10,'今日'),
 (2,'分享特训营预告朋友圈','内容任务','低',20,'后日');

INSERT INTO points_ledger (member_id, delta, reason) VALUES (2, 2840, '期初迁移');
INSERT INTO growth_ledger (member_id, delta, reason) VALUES (2, 1200, '期初迁移'),(3, 5600, '期初迁移');

-- 邀请码与归因
INSERT INTO invite_code (code, owner_member_id, project_scope, valid_until) VALUES
 ('FLM-ZYC-01',3,NULL, now() + interval '7 days'),
 ('FLM-WSY-01',1,'flm-membership', now() + interval '7 days');
INSERT INTO attribution_log (invite_code, source, new_member_id, referrer_member_id, project_id) VALUES
 ('FLM-ZYC-01','推广码',4,3,'flm-membership'),
 (NULL,'活动链接',5,4,'experience-camp'),
 (NULL,'直播间关注',6,5,'experience-camp');

-- 11. 回访与工单样例（设计稿）
INSERT INTO follow_up (member_id, project_id, category, priority, queue, content, assignee, write_back, created_by) VALUES
 (4,'flm-membership','阶段回访','重要','待处理','记录 林小满 体验期第 3 天回访','运营部·小七',TRUE,'王总·创始人'),
 (9,'flm-membership','售后问题','非常重要','待处理','王建国退款申请超时 2h，优先跟进','客服部·小五',TRUE,'系统');

INSERT INTO ticket (ticket_no, ticket_type, member_id, project_id, assignee_employee_id, city, status, priority, sla_total_hours, description) VALUES
 ('TK2026070501','入群异常',8,'flm-membership',1,'北京','待处理','高',4,'刘晓峰扫码后未能入群，需人工核对'),
 ('TK2026070502','退款跟进',9,'flm-membership',5,'深圳','进行中','高',12,'王建国退款申请，用户已进群已使用服务，高风险'),
 ('TK2026070503','服务回访',7,'flm-membership',1,'北京','已解决','中',24,'陈美玲首月服务回访');

-- 12. 审批样例（含一条提现待审）
INSERT INTO withdrawal_request (member_id, amount, method, account_info, status, idempotency_key) VALUES
 (3, 500, '支付宝', 'zhao***@mail.com', '待审核', 'seed-wd-001');

INSERT INTO approval (approval_type, title, submitter, project_id, urgent, status, detail, callback_type, callback_ref) VALUES
 ('提现审批','赵一川 提现 ¥500 至支付宝','赵一川',NULL,FALSE,'待审批',
  '{"提现金额":"¥500","提现渠道":"支付宝","账户":"zhao***@mail.com","可提余额":"¥8,425.64","本月已提":"¥0","申请人":"赵一川"}','WITHDRAWAL','1'),
 ('退款协同','王建国 退款申请（高风险：已进群已使用服务）','系统',NULL,TRUE,'待审批',
  '{"订单编号":"ORD2026070504","产品":"续费PRO会员年卡","金额":"¥2,480","已使用天数":"30","退款原因":"个人原因","风险等级":"高"}',NULL,NULL),
 ('账号交接','fengle_gz_01 账号交接（刘刚 30 天未登录）','HR系统',NULL,TRUE,'待审批',
  '{"微信号":"fengle_gz_01","原持有人":"刘刚","交接至":"待分配","原因":"长期未登录","所属城市":"广州","好友数":"1780"}',NULL,NULL);
INSERT INTO approval_history (approval_id, actor, action) VALUES
 (1,'系统','提交申请'),(1,'系统','自动分配给审批人'),
 (2,'系统','提交申请'),(3,'HR系统','触发离职流程');
UPDATE withdrawal_request SET approval_id = 1 WHERE id = 1;

-- 13. 风险事件（设计稿预警）
INSERT INTO risk_event (risk_type, level, title, ref_type, ref_id, project_id, owner, status) VALUES
 ('群容量预警','高','北京PRO会员群02 已达 98/100，需准备承接群','group','G-0002','flm-membership','吴思远','待处理'),
 ('群未配置客服','高','北京PRO会员群02 未配置个微客服','group','G-0002','flm-membership','吴思远','待处理'),
 ('账号异常','中','fengle_gz_01 已 30 天未登录','account','WX-P-003','city-partner','刘刚','待处理'),
 ('同步失败','中','企微 ww_fenglema_gz 同步失败','account','WX-E-003','city-partner','刘刚','待处理');

-- 14. 同步作业样例
INSERT INTO sync_job (job_type, source_system, resource, mapping_version, cursor_value, status, total_count, success_count, error_count, finished_at) VALUES
 ('定时同步','mock-project-system','统一会员档案','v1','2026-07-13T00:00:00Z','已完成',128,128,0, now() - interval '1 hour'),
 ('Webhook','mock-project-system','订单','v1',NULL,'已完成',6,6,0, now() - interval '30 minutes');
