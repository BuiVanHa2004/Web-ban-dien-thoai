package com.webbanhang.shop.DTO.AI;

import java.util.List;

public record AiResponse(
        String answer,
        List<Integer> recommendedProductIds,
        List<Integer> comparedProductIds
) {
}
