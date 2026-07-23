-- =====================================================================
-- 主理人社群运营中台 · V7 M3b 会员小程序（主理人公社）
-- ①member 角色 mp 模块权限位（护栏 20：服务端强制是唯一算数的鉴权）
-- ②会员标识新增「小程序openid」类型（M3 过渡期身份锚点；unionid 待 M4 开放平台绑定）
-- ③小程序 FAQ 字典（答疑页数据源，运营可维护；AI 答疑 M3c 接入后作为兜底语料）
-- =====================================================================

-- ① member 角色只开 mp 模块（SELF 数据范围 + assertMemberAccess 兜底横向越权）
INSERT INTO role_permission (role_code, module, can_view, can_create, can_edit) VALUES
 ('member', 'mp', TRUE, TRUE, TRUE);

-- ② 小程序 openid 标识（并档优先级最低：openid 仅同一小程序内稳定，跨端合一靠 unionid/手机号）
ALTER TABLE member_identifier DROP CONSTRAINT member_identifier_id_type_check;
ALTER TABLE member_identifier ADD CONSTRAINT member_identifier_id_type_check
    CHECK (id_type IN ('手机号','个微号','unionid','企微external_userid','订单用户ID','报名ID','小程序openid'));

-- ③ FAQ 字典（item_label=问题，remark=答案）
INSERT INTO dict_entry (dict_code, item_code, item_label, sort_order, remark) VALUES
 ('mp_faq','join_group','扫码后多久能进群？',1,'完成会员购买后，运营会为你匹配最合适的群，通常 24 小时内会有专属客服邀请你入群。'),
 ('mp_faq','invite_reward','邀请好友有什么奖励？',2,'好友经你的专属邀请码注册成功后，你将获得成长值奖励（默认 +288，以页面展示为准）；奖励为虚拟权益，不涉及现金返利。'),
 ('mp_faq','membership_expire','会员到期了怎么办？',3,'到期前我们会提醒你续费；续费后有效期在原到期日上顺延叠加，不会浪费。'),
 ('mp_faq','course_replay','错过直播课怎么办？',4,'所有群直播课程都有回放（保存 3 年），在「课程」页可随时观看。');
