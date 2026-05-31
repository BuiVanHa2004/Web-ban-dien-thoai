package com.webbanhang.shop.DTO.AI;

public record AiQuotaDto(
        int remaining,
        int limit,
        boolean isGuest,
        boolean warning
) {
}
