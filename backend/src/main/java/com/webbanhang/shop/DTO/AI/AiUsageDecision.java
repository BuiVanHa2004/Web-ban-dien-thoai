package com.webbanhang.shop.DTO.AI;

public record AiUsageDecision(
        boolean allowed,
        int statusCode,
        String code,
        String message,
        AiQuotaDto quota,
        int estimatedInputTokens
) {
    public static AiUsageDecision allowed(AiQuotaDto quota, int estimatedInputTokens) {
        return new AiUsageDecision(true, 200, null, null, quota, estimatedInputTokens);
    }

    public static AiUsageDecision blocked(int statusCode, String code, String message, AiQuotaDto quota, int estimatedInputTokens) {
        return new AiUsageDecision(false, statusCode, code, message, quota, estimatedInputTokens);
    }
}
