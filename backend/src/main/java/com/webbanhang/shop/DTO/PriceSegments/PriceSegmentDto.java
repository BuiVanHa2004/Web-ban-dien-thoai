package com.webbanhang.shop.DTO.PriceSegments;

import com.webbanhang.shop.Model.PriceSegments.PriceSegment;

import java.math.BigDecimal;

public record PriceSegmentDto(
        Integer priceSegmentId,
        String segmentName,
        BigDecimal minPrice,
        BigDecimal maxPrice
) {
    public static PriceSegmentDto fromEntity(PriceSegment segment) {
        return new PriceSegmentDto(
                segment.getPriceSegmentId(),
                segment.getSegmentName(),
                segment.getMinPrice(),
                segment.getMaxPrice()
        );
    }
}
