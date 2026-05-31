package com.webbanhang.shop.Service.AI;

import com.webbanhang.shop.DTO.AI.AiQuotaDto;
import com.webbanhang.shop.DTO.AI.AiUsageDecision;
 import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.HexFormat;

@Service
public class AiUsageGuardService {
    private final StringRedisTemplate redis;

    public AiUsageGuardService(StringRedisTemplate redis) {
        this.redis = redis;
    }

    private static final int GUEST_DAILY_MESSAGES = 5;
    private static final int USER_DAILY_MESSAGES = 200;
    private static final int GUEST_DAILY_TOKENS = 6000;
    private static final int USER_DAILY_TOKENS = 120000;
    private static final int GUEST_RATE_PER_MIN = 12;
    private static final int USER_RATE_PER_MIN = 60;
    private static final int IP_RATE_PER_MIN = 100;

    public AiUsageDecision checkAndConsume(Integer userId, String guestSessionId, String ip, String latestUserMessage) {
        boolean isGuest = userId == null;
        int messageLimit = isGuest ? GUEST_DAILY_MESSAGES : USER_DAILY_MESSAGES;
        int tokenLimit = isGuest ? GUEST_DAILY_TOKENS : USER_DAILY_TOKENS;
        int perMinLimit = isGuest ? GUEST_RATE_PER_MIN : USER_RATE_PER_MIN;
        int estimatedTokens = estimateTokens(latestUserMessage);

        String day = LocalDate.now(ZoneOffset.UTC).format(DateTimeFormatter.ISO_DATE);
        String identity = isGuest ? "guest:" + safe(guestSessionId) : "user:" + userId;
        String identityHash = hash(identity + ":" + ip);

        String msgCountKey = "ai:day:msg:" + day + ":" + identityHash;
        String tokenCountKey = "ai:day:tok:" + day + ":" + identityHash;
        String perMinKey = "ai:min:id:" + identityHash;
        String ipMinKey = "ai:min:ip:" + hash(ip);

        try {
            Long idPerMin = redis.opsForValue().increment(perMinKey);
            if (idPerMin != null && idPerMin == 1L) redis.expire(perMinKey, Duration.ofMinutes(1));
            Long ipPerMin = redis.opsForValue().increment(ipMinKey);
            if (ipPerMin != null && ipPerMin == 1L) redis.expire(ipMinKey, Duration.ofMinutes(1));
            if ((idPerMin != null && idPerMin > perMinLimit) || (ipPerMin != null && ipPerMin > IP_RATE_PER_MIN)) {
                AiQuotaDto q = currentQuota(messageLimit, msgCountKey, isGuest);
                return AiUsageDecision.blocked(429, "RATE_LIMITED", "Bạn thao tác quá nhanh. Vui lòng thử lại sau vài giây.", q, estimatedTokens);
            }

            Long msgCount = redis.opsForValue().increment(msgCountKey);
            if (msgCount != null && msgCount == 1L) redis.expire(msgCountKey, Duration.ofDays(2));
            Long tokCount = redis.opsForValue().increment(tokenCountKey, estimatedTokens);
            if (tokCount != null && tokCount == estimatedTokens) redis.expire(tokenCountKey, Duration.ofDays(2));

            if ((msgCount != null && msgCount > messageLimit) || (tokCount != null && tokCount > tokenLimit)) {
                AiQuotaDto q = currentQuota(messageLimit, msgCountKey, isGuest);
                String msg = isGuest
                        ? "Đăng nhập để tiếp tục tư vấn và nhận gợi ý cá nhân hóa."
                        : "Bạn đã dùng hết hạn mức hôm nay. Vui lòng quay lại sau.";
                return AiUsageDecision.blocked(403, "QUOTA_EXCEEDED", msg, q, estimatedTokens);
            }

            int remaining = Math.max(0, messageLimit - (msgCount == null ? 0 : msgCount.intValue()));
            return AiUsageDecision.allowed(new AiQuotaDto(remaining, messageLimit, isGuest, isGuest && remaining <= 1), estimatedTokens);
        } catch (RedisConnectionFailureException ex) {
            // Redis is optional in dev: allow AI to function even when quota/rate-limit storage is unavailable.
            return AiUsageDecision.allowed(new AiQuotaDto(messageLimit, messageLimit, isGuest, false), estimatedTokens);
        }
    }

    public AiQuotaDto getQuota(Integer userId, String guestSessionId, String ip) {
        boolean isGuest = userId == null;
        int messageLimit = isGuest ? GUEST_DAILY_MESSAGES : USER_DAILY_MESSAGES;
        String day = LocalDate.now(ZoneOffset.UTC).format(DateTimeFormatter.ISO_DATE);
        String identity = isGuest ? "guest:" + safe(guestSessionId) : "user:" + userId;
        String msgCountKey = "ai:day:msg:" + day + ":" + hash(identity + ":" + ip);
        try {
            return currentQuota(messageLimit, msgCountKey, isGuest);
        } catch (RedisConnectionFailureException ex) {
            return new AiQuotaDto(messageLimit, messageLimit, isGuest, false);
        }
    }

    private AiQuotaDto currentQuota(int messageLimit, String msgCountKey, boolean isGuest) {
        String raw = redis.opsForValue().get(msgCountKey);
        int used = 0;
        try {
            used = raw == null ? 0 : Integer.parseInt(raw);
        } catch (Exception ignored) {
        }
        int remaining = Math.max(0, messageLimit - used);
        return new AiQuotaDto(remaining, messageLimit, isGuest, isGuest && remaining <= 1);
    }

    private int estimateTokens(String text) {
        if (text == null || text.isBlank()) return 1;
        return Math.max(1, (int) Math.ceil(text.length() / 4.0));
    }

    private String safe(String v) {
        return (v == null || v.isBlank()) ? "guest-anon" : v;
    }

    private String hash(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] bytes = digest.digest(value.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(bytes);
        } catch (Exception e) {
            return Integer.toHexString(value.hashCode());
        }
    }
}
