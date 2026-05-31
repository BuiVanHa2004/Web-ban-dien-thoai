package com.webbanhang.shop.DTO.AI;

import java.util.List;

public record AiCompareRequest(
        List<Integer> productIds,
        String question
) {
}
