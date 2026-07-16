package com.fenglema.scp;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * 构建期护栏（CLAUDE.md 第 5 条）：扫描 server/src/main/java,禁止把变量拼进 SQL 字符串。
 * 匹配 `db.sql(...)` 调用中、到首个 `.param(`/`.query(`/`.update(` 之前的 SQL 片段里出现
 * `" +` / `+ "` 拼接模式即失败——让 SQL 注入类违规过不了 CI,不依赖 review 自觉。
 * 纯文件扫描,不需要 Spring 上下文/数据库。
 */
class SqlConcatGuardTest {

    private static final List<String> TERMINATORS =
            List.of(".param(", ".query(", ".update(", ".single(", ".list(", ".optional(");

    @Test
    void noStringConcatenationInsideSqlCalls() throws IOException {
        Path root = Paths.get("src/main/java");
        assertTrue(Files.isDirectory(root), "找不到源码目录 " + root.toAbsolutePath());

        List<String> violations = new ArrayList<>();
        try (Stream<Path> files = Files.walk(root)) {
            files.filter(p -> p.toString().endsWith(".java")).forEach(p -> {
                try {
                    scanFile(p, violations);
                } catch (IOException e) {
                    violations.add(p + "：读取失败 " + e.getMessage());
                }
            });
        }
        assertTrue(violations.isEmpty(),
                "检测到 SQL 值拼接（违反 CLAUDE.md §1/§5，改用 :param 命名绑定；JSONB 用 common/Json）：\n"
                        + String.join("\n", violations));
    }

    private void scanFile(Path path, List<String> violations) throws IOException {
        String content = Files.readString(path);
        int idx = 0;
        while ((idx = content.indexOf(".sql(", idx)) != -1) {
            int start = idx + ".sql(".length();
            int end = content.length();
            for (String term : TERMINATORS) {
                int t = content.indexOf(term, start);
                if (t != -1 && t < end) {
                    end = t;
                }
            }
            String region = content.substring(start, end);
            if (region.contains("\" +") || region.contains("+ \"")) {
                String snippet = region.strip();
                if (snippet.length() > 120) {
                    snippet = snippet.substring(0, 120) + "…";
                }
                violations.add(path + "：\n    " + snippet);
            }
            idx = start;
        }
    }
}
