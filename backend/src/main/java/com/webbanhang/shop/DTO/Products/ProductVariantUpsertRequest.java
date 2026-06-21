package com.webbanhang.shop.DTO.Products;

import java.math.BigDecimal;

public record ProductVariantUpsertRequest(
        Integer variantId,
        Integer ramGb,
        Integer storageGb,
        Integer stockAdjustment,  // ✅ NEW: Điều chỉnh tồn kho (+/-), null khi tạo mới
        BigDecimal originalPrice,
        String discountType,
        BigDecimal discountValue,
        BigDecimal finalPrice,
        String adjustmentReason  // ✅ NEW: Lý do điều chỉnh tồn kho (bắt buộc khi có stockAdjustment)
) {
}
