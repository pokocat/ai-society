package com.fenglema.scp.gateway;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.imageio.ImageIO;
import java.awt.BasicStroke;
import java.awt.Color;
import java.awt.Font;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.concurrent.TimeUnit;

/**
 * 演示活码图（仅 Mock 网关使用）。
 *
 * 真实企微 join_way 返回的是可公网访问的 https 图片地址，小程序 image 组件直接显示；
 * 而 Mock 此前返回管理台的相对路径 `/reference-assets/...`，小程序包内无此文件 → 二维码位置一片空白，
 * 演示与验收都看不出链路是否真的下发了活码。这里按 groupId 稳定生成一张可见的占位码图，
 * 图上明确标注「演示活码」，避免被误当成真实可扫的入群码。
 *
 * 生产环境（SCP_MOCK_ENDPOINTS=false）本端点不注册，见 WebConfig/MockEndpointsFilter 的整组下线开关。
 */
@RestController
@RequestMapping("/mock/qrcode")
public class MockQrcodeController {

    private final boolean mockEnabled;

    public MockQrcodeController(@Value("${scp.mock.endpoints:true}") boolean mockEnabled) {
        this.mockEnabled = mockEnabled;
    }

    @GetMapping(value = "/{groupId}.png", produces = MediaType.IMAGE_PNG_VALUE)
    public ResponseEntity<byte[]> qrcode(@PathVariable String groupId) throws IOException {
        if (!mockEnabled) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(1, TimeUnit.HOURS).cachePublic())
                .contentType(MediaType.IMAGE_PNG)
                .body(render(groupId));
    }

    /** 按 groupId 的哈希铺一张确定性的码点图（同群每次一致，不同群图案不同）。 */
    private byte[] render(String groupId) throws IOException {
        final int size = 360, quiet = 24, cells = 21;
        BufferedImage img = new BufferedImage(size, size, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = img.createGraphics();
        g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        g.setColor(Color.WHITE);
        g.fillRect(0, 0, size, size);

        byte[] seed = digest(groupId);
        int cell = (size - quiet * 2) / cells;
        g.setColor(new Color(0x11, 0x11, 0x11));
        for (int y = 0; y < cells; y++) {
            for (int x = 0; x < cells; x++) {
                if (inFinder(x, y, cells)) continue;
                int bit = seed[(y * cells + x) % seed.length] & (1 << (x % 8));
                if (bit != 0) {
                    g.fillRect(quiet + x * cell, quiet + y * cell, cell, cell);
                }
            }
        }
        // 三个定位角（让它一眼像二维码，而不是噪点）
        drawFinder(g, quiet, quiet, cell);
        drawFinder(g, quiet + (cells - 7) * cell, quiet, cell);
        drawFinder(g, quiet, quiet + (cells - 7) * cell, cell);

        // 中央标注：明确这是演示图，不可真扫
        int bw = 190, bh = 46, bx = (size - bw) / 2, by = (size - bh) / 2;
        g.setColor(Color.WHITE);
        g.fillRoundRect(bx, by, bw, bh, 10, 10);
        g.setColor(new Color(0x9B, 0x9A, 0x97));
        g.setStroke(new BasicStroke(1f));
        g.drawRoundRect(bx, by, bw, bh, 10, 10);
        g.setColor(new Color(0x11, 0x11, 0x11));
        g.setFont(new Font("PingFang SC", Font.BOLD, 15));
        drawCentered(g, "演示活码 · 不可扫", size, by + 20);
        g.setColor(new Color(0x78, 0x77, 0x74));
        g.setFont(new Font("PingFang SC", Font.PLAIN, 11));
        drawCentered(g, groupId, size, by + 37);
        g.dispose();

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(img, "png", out);
        return out.toByteArray();
    }

    private void drawCentered(Graphics2D g, String text, int width, int baseline) {
        int w = g.getFontMetrics().stringWidth(text);
        g.drawString(text, (width - w) / 2, baseline);
    }

    private boolean inFinder(int x, int y, int cells) {
        return (x < 8 && y < 8) || (x >= cells - 8 && y < 8) || (x < 8 && y >= cells - 8);
    }

    private void drawFinder(Graphics2D g, int px, int py, int cell) {
        g.setColor(new Color(0x11, 0x11, 0x11));
        g.fillRect(px, py, cell * 7, cell * 7);
        g.setColor(Color.WHITE);
        g.fillRect(px + cell, py + cell, cell * 5, cell * 5);
        g.setColor(new Color(0x11, 0x11, 0x11));
        g.fillRect(px + cell * 2, py + cell * 2, cell * 3, cell * 3);
    }

    private byte[] digest(String s) {
        try {
            return MessageDigest.getInstance("SHA-256").digest(s.getBytes(StandardCharsets.UTF_8));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
