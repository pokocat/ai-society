-- 裂变风控（上架审阅项）：单个邀请人每日成长值奖励上限，防批量小号刷奖励。
-- 关系链照常绑定（归因不受限），仅奖励封顶；0 = 关闭奖励。运营可在线调整（护栏 23）。
ALTER TABLE resource_rules
    ADD COLUMN invite_award_daily_cap INT NOT NULL DEFAULT 20;

COMMENT ON COLUMN resource_rules.invite_award_daily_cap IS '邀请成长值每日奖励上限（次/人/日），超出仅绑定关系不发奖励';
