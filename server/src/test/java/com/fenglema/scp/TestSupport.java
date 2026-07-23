package com.fenglema.scp;

import com.fenglema.scp.sync.SyncService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.context.ActiveProfiles;

import java.util.concurrent.atomic.AtomicLong;

/** 测试基类：全部用例自建数据（唯一后缀隔离），可重复执行，不依赖种子数据的绝对数值。 */
@SpringBootTest
@ActiveProfiles("test")
public abstract class TestSupport {

    private static final AtomicLong SEQ = new AtomicLong(System.currentTimeMillis() % 100_000_000);

    @Autowired
    protected JdbcClient db;

    @Autowired
    protected SyncService syncService;

    protected static String uid() {
        return String.valueOf(SEQ.incrementAndGet());
    }

    /**
     * 经同步层进线一个待分配会员（走真实入口），返回 memberNo。
     * M3 起：付费档身份（paid_identity 字典）自动补 30 天有效期——测试语义为「外部已付费会员」，
     * 与 M3 前用例的前提一致；门控拦截行为由 MembershipM3aTest 用无权益会员显式验证。
     */
    protected String ingestMember(String name, String city, String projectId, String identity, String referrerNo) {
        var result = syncService.ingestPendingMember("test", "人工导入",
                new SyncService.IncomingMember(name, "1" + uid(), city, "转介绍",
                        projectId, identity, referrerNo, null, null, null, null));
        String memberNo = (String) result.get("memberNo");
        db.sql("""
                UPDATE member_project_identity SET valid_until = now() + interval '30 days'
                WHERE member_id = (SELECT id FROM member WHERE member_no = :no)
                  AND project_id = :pid
                  AND identity IN (SELECT item_label FROM dict_entry WHERE dict_code = 'paid_identity' AND enabled)
                """)
                .param("no", memberNo).param("pid", projectId).update();
        return memberNo;
    }

    /** 建一个配齐「建群企微 + 双客服」的可承接测试群，返回 groupId。 */
    protected String createServiceableGroup(String city, String groupType, int capacity, int memberCount) {
        String suffix = uid();
        String groupId = "TG-" + suffix;
        String wechatId = "TW-" + suffix;
        db.sql("""
                INSERT INTO account (id, account_type, name, identifier, status, region, city, friend_count, serving_group_count)
                VALUES (:id, '个人微信', :name, :identifier, '使用中', '华北区', :city, 0, 0)
                """)
                .param("id", wechatId).param("name", "测试个微" + suffix)
                .param("identifier", "test_wx_" + suffix).param("city", city)
                .update();
        db.sql("""
                INSERT INTO community_group (id, name, group_type, city, region, builder_account_id, project_id,
                                             target_capacity, member_count, status)
                VALUES (:id, :name, :type, :city, '华北区', 'WX-E-001', 'flm-membership', :capacity, :count, '可承接')
                """)
                .param("id", groupId).param("name", "测试群" + suffix).param("type", groupType)
                .param("city", city).param("capacity", capacity).param("count", memberCount)
                .update();
        db.sql("INSERT INTO group_staffing (group_id, role, employee_id, account_id, is_primary) VALUES (:g, '企微客服', 1, 'WX-E-001', TRUE)")
                .param("g", groupId).update();
        db.sql("INSERT INTO group_staffing (group_id, role, employee_id, account_id, is_primary) VALUES (:g, '个微客服', 1, :w, TRUE)")
                .param("g", groupId).param("w", wechatId).update();
        return groupId;
    }

    protected long memberIdOf(String memberNo) {
        return db.sql("SELECT id FROM member WHERE member_no = :no").param("no", memberNo)
                .query(Long.class).single();
    }
}
