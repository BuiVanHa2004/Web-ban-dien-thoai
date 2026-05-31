package com.webbanhang.shop.DTO.AI;

import java.util.List;

public record AiChatRequest(
        Long sessionId,
        String guestSessionId,
        List<AiChatTurn> messages
) {
}
