package com.webbanhang.shop.DTO.PriceSegments;

import java.math.BigDecimal;

public record PriceSegmentUpsertRequest(
        String segmentName,
        BigDecimal minPrice,
        BigDecimal maxPrice
) {
}
