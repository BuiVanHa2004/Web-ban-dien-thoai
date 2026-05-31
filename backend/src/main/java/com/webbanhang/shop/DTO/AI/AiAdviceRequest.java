package com.webbanhang.shop.DTO.AI;

public record AiAdviceRequest(
        String message,
        Integer topK
) {
}
