package com.webbanhang.shop.DTO.AI;

public record AiChatResponse(
        String reply,
        Long sessionId,
        AiQuotaDto quota
) {
}
