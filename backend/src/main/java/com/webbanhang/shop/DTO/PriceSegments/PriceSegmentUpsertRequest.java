package com.webbanhang.shop.DTO.PriceSegments;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record PriceSegmentUpsertRequest(
        @NotBlank(message = "Tên phân khúc giá không được để trống")
        String segmentName,
        
        @NotNull(message = "Giá tối thiểu không được để trống")
        @DecimalMin(value = "0.0", message = "Giá tối thiểu phải lớn hơn hoặc bằng 0")
        BigDecimal minPrice,
        
        @DecimalMin(value = "0.0", message = "Giá tối đa phải lớn hơn hoặc bằng 0")
        BigDecimal maxPrice
) {
}
