package com.fenglema.scp.common;

import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.databind.JsonSerializer;
import com.fasterxml.jackson.databind.SerializerProvider;
import com.fasterxml.jackson.databind.module.SimpleModule;
import org.postgresql.util.PGobject;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.io.IOException;

/**
 * JSONB 列经 JdbcClient 取出为 PGobject——默认会被 Jackson 序列化成
 * {"type":"jsonb","value":"..."} 包装对象。此处注册序列化器：json/jsonb 原样内联为 JSON，
 * 前端拿到的 detail/hit_rules/issues 等字段即真实结构，无需二次解析。
 */
@Configuration
public class JacksonConfig {

    @Bean
    public SimpleModule pgObjectModule() {
        SimpleModule module = new SimpleModule("pgobject-json");
        module.addSerializer(PGobject.class, new JsonSerializer<>() {
            @Override
            public void serialize(PGobject value, JsonGenerator gen, SerializerProvider provider) throws IOException {
                if (value.getValue() == null) {
                    gen.writeNull();
                } else if ("json".equals(value.getType()) || "jsonb".equals(value.getType())) {
                    gen.writeRawValue(value.getValue());
                } else {
                    gen.writeString(value.getValue());
                }
            }
        });
        return module;
    }
}
