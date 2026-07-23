-- =====================================================================
-- 主理人社群运营中台 · V4 品牌更名
-- 去掉旧品牌「蜂乐玛」显示文案，统一为「主理人」。
-- 说明：V1/V2 为已合入迁移（CLAUDE.md 护栏第 7 条：永远不修改已合入迁移），
--       故品牌显示文案的数据修正在此新增迁移内以 UPDATE 完成。
--       仅改中文品牌显示字段，不动 code/identifier 等技术标识（如 flm-membership、
--       ww_fenglema_bj），避免破坏外键与既有引用。
-- =====================================================================

-- 项目名（V2 第 5 段：flm-membership）
UPDATE project
   SET name = '主理人会员项目'
 WHERE id = 'flm-membership' AND name = '蜂乐玛会员项目';

-- 企业微信账号显示名（V2 第 6 段：WX-E-001/002/003）
UPDATE account
   SET name = replace(name, '蜂乐玛', '主理人')
 WHERE name LIKE '蜂乐玛%';

-- 账号所属企业名（corp_name）
UPDATE account
   SET corp_name = '主理人'
 WHERE corp_name = '蜂乐玛';
