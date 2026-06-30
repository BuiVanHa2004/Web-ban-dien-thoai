package com.webbanhang.shop.Service.AI;

import com.webbanhang.shop.DTO.AI.AiQuotaDto;
import com.webbanhang.shop.DTO.AI.AiUsageDecision;
import org.springframework.stereotype.Service;

@Service
public class AiUsageGuardService {

    /* ---- tunables ---- */
    private static final int GUEST_DAILY_MESSAGES = 5;
    private static final int USER_DAILY_MESSAGES = 200;

    public AiUsageDecision checkAndConsume(Integer userId, String guestSessionId, String ip, String latestUserMessage) {
        boolean isGuest = userId == null;
        int messageLimit = isGuest ? GUEST_DAILY_MESSAGES : USER_DAILY_MESSAGES;
        int estimatedTokens = estimateTokens(latestUserMessage);
        // Redis removed — always allow requests (no rate limiting without a backing store)
        return AiUsageDecision.allowed(new AiQuotaDto(messageLimit, messageLimit, isGuest, false), estimatedTokens);
    }

    public AiQuotaDto getQuota(Integer userId, String guestSessionId, String ip) {
        boolean isGuest = userId == null;
        int messageLimit = isGuest ? GUEST_DAILY_MESSAGES : USER_DAILY_MESSAGES;
        return new AiQuotaDto(messageLimit, messageLimit, isGuest, false);
    }

    private int estimateTokens(String text) {
        if (text == null || text.isBlank()) return 1;
        return Math.max(1, (int) Math.ceil(text.length() / 4.0));
    }
}
