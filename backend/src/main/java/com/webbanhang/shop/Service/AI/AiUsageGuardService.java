package com.webbanhang.shop.Service.AI;

import com.webbanhang.shop.DTO.AI.AiQuotaDto;
import com.webbanhang.shop.DTO.AI.AiUsageDecision;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.HexFormat;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

/**
 * In-memory rate-limiter / quota guard for AI chat.
 * Uses ConcurrentHashMap instead of Redis so there is no external dependency.
 * Counters reset naturally because the key includes the current UTC date.
 */
@Service
public class AiUsageGuardService {

    /* ---- tunables ---- */
    private static final int GUEST_DAILY_MESSAGES = 5;
    private static final int USER_DAILY_MESSAGES = 200;
    private static final int GUEST_DAILY_TOKENS = 6000;
    private static final int USER_DAILY_TOKENS = 120000;
    private static final int GUEST_RATE_PER_MIN = 12;
    private static final int USER_RATE_PER_MIN = 60;
    private static final int IP_RATE_PER_MIN = 100;

    /* ---- in-memory stores ---- */
    // day-level counters  (key includes date, so old entries become unreachable)
    private final ConcurrentHashMap<String, AtomicLong> dayMsgCounters = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, AtomicLong> dayTokCounters = new ConcurrentHashMap<>();
    // per-minute counters  (cleaned up lazily via timestamp in key)
    private final ConcurrentHashMap<String, long[]> minuteCounters = new ConcurrentHashMap<>();
    // last cleanup timestamp
    private volatile long lastCleanupEpochMinute = 0;

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

        // --- per-minute rate limit ---
        long currentMinute = System.currentTimeMillis() / 60_000;
        String idMinKey = "id:" + identityHash + ":" + currentMinute;
        String ipMinKey = "ip:" + hash(ip) + ":" + currentMinute;

        lazyCleanup(currentMinute);

        long idPerMin = incrementMinute(idMinKey, currentMinute);
        long ipPerMin = incrementMinute(ipMinKey, currentMinute);
        if (idPerMin > perMinLimit || ipPerMin > IP_RATE_PER_MIN) {
            AiQuotaDto q = currentQuota(messageLimit, msgCountKey, isGuest);
            return AiUsageDecision.blocked(429, "RATE_LIMITED",
                    "Bạn thao tác quá nhanh. Vui lòng thử lại sau vài giây.", q, estimatedTokens);
        }

        // --- daily message & token quota ---
        long msgCount = dayMsgCounters
                .computeIfAbsent(msgCountKey, k -> new AtomicLong(0))
                .incrementAndGet();
        long tokCount = dayTokCounters
                .computeIfAbsent(tokenCountKey, k -> new AtomicLong(0))
                .addAndGet(estimatedTokens);

        if (msgCount > messageLimit || tokCount > tokenLimit) {
            AiQuotaDto q = currentQuota(messageLimit, msgCountKey, isGuest);
            String msg = isGuest
                    ? "Bạn đã hết lượt hỏi trong hôm nay. Đăng nhập để tiếp tục tư vấn và nhận gợi ý cá nhân hóa."
                    : "Bạn đã hết lượt dùng trong hôm nay, thử lại trong ít giờ nữa.";
            return AiUsageDecision.blocked(403, "QUOTA_EXCEEDED", msg, q, estimatedTokens);
        }

        int remaining = Math.max(0, messageLimit - (int) msgCount);
        return AiUsageDecision.allowed(
                new AiQuotaDto(remaining, messageLimit, isGuest, isGuest && remaining <= 1),
                estimatedTokens);
    }

    public AiQuotaDto getQuota(Integer userId, String guestSessionId, String ip) {
        boolean isGuest = userId == null;
        int messageLimit = isGuest ? GUEST_DAILY_MESSAGES : USER_DAILY_MESSAGES;
        String day = LocalDate.now(ZoneOffset.UTC).format(DateTimeFormatter.ISO_DATE);
        String identity = isGuest ? "guest:" + safe(guestSessionId) : "user:" + userId;
        String msgCountKey = "ai:day:msg:" + day + ":" + hash(identity + ":" + ip);
        return currentQuota(messageLimit, msgCountKey, isGuest);
    }

    /* ---------- helpers ---------- */

    private long incrementMinute(String key, long currentMinute) {
        long[] entry = minuteCounters.computeIfAbsent(key, k -> new long[]{0, currentMinute});
        synchronized (entry) {
            if (entry[1] != currentMinute) {
                entry[0] = 0;
                entry[1] = currentMinute;
            }
            return ++entry[0];
        }
    }

    private void lazyCleanup(long currentMinute) {
        if (currentMinute - lastCleanupEpochMinute < 5) return;   // cleanup every 5 minutes
        lastCleanupEpochMinute = currentMinute;

        // remove stale per-minute entries
        minuteCounters.entrySet().removeIf(e -> e.getValue()[1] < currentMinute - 2);

        // remove stale daily entries (keys contain a date string)
        String today = LocalDate.now(ZoneOffset.UTC).format(DateTimeFormatter.ISO_DATE);
        dayMsgCounters.entrySet().removeIf(e -> !e.getKey().contains(today));
        dayTokCounters.entrySet().removeIf(e -> !e.getKey().contains(today));
    }

    private AiQuotaDto currentQuota(int messageLimit, String msgCountKey, boolean isGuest) {
        AtomicLong counter = dayMsgCounters.get(msgCountKey);
        int used = counter == null ? 0 : (int) counter.get();
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
