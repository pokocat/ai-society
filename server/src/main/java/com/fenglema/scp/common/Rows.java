package com.fenglema.scp.common;

import org.springframework.jdbc.core.ColumnMapRowMapper;

/** JdbcClient 行映射约定：Map 行走 Rows.MAP（.list()/.single()/.optional()）。 */
public final class Rows {

    public static final ColumnMapRowMapper MAP = new ColumnMapRowMapper();

    private Rows() {
    }
}
