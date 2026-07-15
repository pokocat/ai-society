package com.fenglema.scp.common;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * JSON 序列化工具（护栏 §4）：所有写入 JSONB 列的结构必须经此序列化，
 * 禁止字符串拼 JSON——用户可控字段含引号/花括号会破坏结构，甚至向审批单 detail
 * 注入伪造展示字段欺骗审批人。用法：Json.obj("k1", v1, "k2", v2, ...) 构造后交 CAST(:x AS jsonb) 绑定。
 */
public final class Json {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private Json() {
    }

    public static String write(Object value) {
        try {
            return MAPPER.writeValueAsString(value);
        } catch (JsonProcessingException e) {
            throw new BusinessException(5001, "内部数据序列化失败");
        }
    }

    /** 保序构造 JSON 对象字符串：键值交替（键为 String，值任意，null 值保留）。 */
    public static String obj(Object... kv) {
        if (kv.length % 2 != 0) {
            throw new IllegalArgumentException("Json.obj 需要偶数个参数（键值交替）");
        }
        Map<String, Object> map = new LinkedHashMap<>();
        for (int i = 0; i < kv.length; i += 2) {
            map.put(String.valueOf(kv[i]), kv[i + 1]);
        }
        return write(map);
    }
}
