package com.fenglema.scp.mp;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fenglema.scp.common.BusinessException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;

/**
 * 微信小程序服务端 API 适配器（登录凭证 / access_token / 小程序码 / 手机号）。
 * scp.wx.mock=true（默认，开发/CI）：openid 由 code 确定性推导，其余能力返回友好错误；
 * 生产以环境变量注入 WX_SECRET 并置 WX_MOCK=false，即切换真实 api.weixin.qq.com 调用，
 * 业务层（MpService 等）无需改动。
 */
@Component
public class WxClient {

    private static final String API = "https://api.weixin.qq.com";

    private final String appid;
    private final String secret;
    private final boolean mock;
    private final ObjectMapper mapper;
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();

    /** access_token 缓存（微信侧 2 小时有效，提前 5 分钟刷新） */
    private volatile String cachedToken;
    private volatile Instant tokenExpiry = Instant.EPOCH;

    public WxClient(@Value("${scp.wx.appid:}") String appid,
                    @Value("${scp.wx.secret:}") String secret,
                    @Value("${scp.wx.mock:true}") boolean mock,
                    ObjectMapper mapper) {
        this.appid = appid;
        this.secret = secret;
        this.mock = mock;
        this.mapper = mapper;
    }

    public boolean isMock() {
        return mock;
    }

    /** code2Session：code → openid。Mock 模式 sha256 确定性推导（同 code 同 openid，登录幂等可测）。 */
    public String code2Session(String code) {
        if (mock) {
            return mockOpenid(code);
        }
        // M7：所有拼入 URL 的动态值一律 URL 编码——code 来自客户端，含 &/#/空格 会注入额外查询参数或截断 grant_type
        JsonNode resp = getJson(API + "/sns/jscode2session?appid=" + enc(appid) + "&secret=" + enc(secret)
                + "&js_code=" + enc(code) + "&grant_type=authorization_code");
        if (resp.path("errcode").asInt(0) != 0) {
            throw new BusinessException("微信登录失败：" + resp.path("errcode").asInt()
                    + " " + resp.path("errmsg").asText());
        }
        String openid = resp.path("openid").asText(null);
        if (openid == null || openid.isBlank()) {
            throw new BusinessException("微信登录失败：未返回 openid");
        }
        return openid;
    }

    /** 无限量小程序码（scene=邀请码），返回 PNG base64；Mock 模式返回 null（前端显示占位说明）。 */
    public String unlimitedQrcodeBase64(String scene, String page) {
        if (mock) {
            return null;
        }
        byte[] body = postBytes(API + "/wxa/getwxacodeunlimit?access_token=" + enc(accessToken()),
                writeJson(java.util.Map.of("scene", scene, "page", page, "check_path", false, "width", 430)));
        // 出错时微信返回 JSON 而非图片
        if (body.length > 0 && body[0] == '{') {
            throw new BusinessException("小程序码生成失败：" + new String(body, StandardCharsets.UTF_8));
        }
        return Base64.getEncoder().encodeToString(body);
    }

    /** 手机号快速验证（button open-type=getPhoneNumber 的 code 换手机号）。Mock 模式明确报错。 */
    public String phoneNumber(String phoneCode) {
        if (mock) {
            throw new BusinessException("演示环境未接入微信凭证，手机号绑定将在正式版开放");
        }
        JsonNode resp = postJson(API + "/wxa/business/getuserphonenumber?access_token=" + enc(accessToken()),
                writeJson(java.util.Map.of("code", phoneCode)));
        if (resp.path("errcode").asInt(-1) != 0) {
            throw new BusinessException("手机号获取失败：" + resp.path("errmsg").asText());
        }
        return resp.path("phone_info").path("phoneNumber").asText(null);
    }

    private synchronized String accessToken() {
        if (cachedToken != null && Instant.now().isBefore(tokenExpiry)) {
            return cachedToken;
        }
        JsonNode resp = getJson(API + "/cgi-bin/token?grant_type=client_credential&appid=" + enc(appid)
                + "&secret=" + enc(secret));
        if (resp.path("errcode").asInt(0) != 0 || resp.path("access_token").isMissingNode()) {
            throw new BusinessException("access_token 获取失败：" + resp.path("errmsg").asText());
        }
        cachedToken = resp.path("access_token").asText();
        tokenExpiry = Instant.now().plusSeconds(resp.path("expires_in").asLong(7200) - 300);
        return cachedToken;
    }

    /** URL 查询参数编码（M7：防客户端可控值注入/截断出站请求）。 */
    private static String enc(String v) {
        return URLEncoder.encode(v == null ? "" : v, StandardCharsets.UTF_8);
    }

    private JsonNode getJson(String url) {
        return parse(send(HttpRequest.newBuilder(URI.create(url))
                .timeout(Duration.ofSeconds(10)).GET().build()));
    }

    private JsonNode postJson(String url, String jsonBody) {
        return parse(send(HttpRequest.newBuilder(URI.create(url))
                .timeout(Duration.ofSeconds(10))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(jsonBody, StandardCharsets.UTF_8)).build()));
    }

    private byte[] postBytes(String url, String jsonBody) {
        return send(HttpRequest.newBuilder(URI.create(url))
                .timeout(Duration.ofSeconds(10))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(jsonBody, StandardCharsets.UTF_8)).build());
    }

    private byte[] send(HttpRequest request) {
        try {
            HttpResponse<byte[]> resp = http.send(request, HttpResponse.BodyHandlers.ofByteArray());
            return resp.body();
        } catch (IOException | InterruptedException e) {
            if (e instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
            throw new BusinessException("微信接口不可达：" + e.getMessage());
        }
    }

    /** 请求体一律 ObjectMapper 序列化（护栏 4：禁止字符串拼 JSON） */
    private String writeJson(Object value) {
        try {
            return mapper.writeValueAsString(value);
        } catch (IOException e) {
            throw new IllegalStateException(e);
        }
    }

    private JsonNode parse(byte[] body) {
        try {
            return mapper.readTree(body);
        } catch (IOException e) {
            throw new BusinessException("微信接口响应解析失败");
        }
    }

    /** Mock code2Session：openid 由 code 确定性推导（sha256 截断）。 */
    static String mockOpenid(String code) {
        try {
            byte[] hash = MessageDigest.getInstance("SHA-256").digest(code.getBytes(StandardCharsets.UTF_8));
            return "wxo-" + HexFormat.of().formatHex(hash).substring(0, 24);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
