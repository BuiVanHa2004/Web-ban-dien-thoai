package com.webbanhang.shop.DTO.Products;

import com.webbanhang.shop.Model.Products.Product;

import java.time.Instant;
import java.util.List;

public record ProductDto(
        Integer productId,
        String productName,
        String slug,
        Integer categoryId,
        String categoryName,
        Integer brandId,
        String brandName,
        String productDescribe,
        String productType,
        java.math.BigDecimal basePrice,
        java.math.BigDecimal originalBasePrice,
        java.math.BigDecimal currentPrice,
        String discountType,
        java.math.BigDecimal discountValue,
        List<ProductColorDto> productColors,
        List<ProductSpecDto> productSpecs,
        List<ProductImageDto> productImages,
        Instant createdAt,
        Instant updatedAt,
        Instant deletedAt
) {
    public static ProductDto fromEntity(Product p) {
        return new ProductDto(
                p.getProductId(),
                p.getProductName(),
                p.getSlug(),
                p.getCategory() != null ? p.getCategory().getCategoryId() : null,
                p.getCategory() != null ? p.getCategory().getCategoryName() : null,
                p.getBrand() != null ? p.getBrand().getBrandId() : null,
                p.getBrand() != null ? p.getBrand().getBrandName() : null,
                p.getProductDescribe(),
                p.getProductType() != null ? p.getProductType().name() : null,
                computeBasePrice(p),
                computeOriginalBasePrice(p),
                computeCurrentPrice(p),
                computeDiscountType(p),
                computeDiscountValue(p),
                p.getProductColors() == null ? List.of() : p.getProductColors().stream().map(ProductColorDto::fromEntity).toList(),
                p.getProductSpecs() == null ? List.of() : p.getProductSpecs().stream().map(ProductSpecDto::fromEntity).toList(),
                p.getProductImages() == null ? List.of() : p.getProductImages().stream().map(ProductImageDto::fromEntity).toList(),
                p.getCreatedAt(),
                p.getUpdatedAt(),
                p.getDeletedAt()
        );
    }

    private static java.math.BigDecimal computeBasePrice(Product p) {
        if (p.getProductColors() == null) return java.math.BigDecimal.ZERO;
        java.math.BigDecimal min = null;
        for (var c : p.getProductColors()) {
            if (c.getVariants() == null) continue;
            for (var v : c.getVariants()) {
                java.math.BigDecimal price = v.getFinalPrice();
                if (price != null) {
                    if (min == null || price.compareTo(min) < 0) {
                        min = price;
                    }
                }
            }
        }
        return min != null ? min : java.math.BigDecimal.ZERO;
    }

    private static java.math.BigDecimal computeOriginalBasePrice(Product p) {
        // Compute base price from originalPrice (before discount)
        if (p.getProductColors() == null) return java.math.BigDecimal.ZERO;
        java.math.BigDecimal min = null;
        for (var c : p.getProductColors()) {
            if (c.getVariants() == null) continue;
            for (var v : c.getVariants()) {
                java.math.BigDecimal price = v.getOriginalPrice();
                if (price != null) {
                    if (min == null || price.compareTo(min) < 0) {
                        min = price;
                    }
                }
            }
        }
        return min != null ? min : java.math.BigDecimal.ZERO;
    }

    private static java.math.BigDecimal computeCurrentPrice(Product p) {
        // For now currentPrice equals basePrice (lowest variant finalPrice)
        // Could be extended with product-level discount logic if needed
        return computeBasePrice(p);
    }

    private static String computeDiscountType(Product p) {
        if (p.getProductColors() == null) return null;
        for (var c : p.getProductColors()) {
            if (c.getVariants() == null) continue;
            for (var v : c.getVariants()) {
                if (v.getDiscountType() != null) {
                    return v.getDiscountType().name();
                }
            }
        }
        return null;
    }

    private static java.math.BigDecimal computeDiscountValue(Product p) {
        if (p.getProductColors() == null) return java.math.BigDecimal.ZERO;
        for (var c : p.getProductColors()) {
            if (c.getVariants() == null) continue;
            for (var v : c.getVariants()) {
                if (v.getDiscountValue() != null) {
                    return v.getDiscountValue();
                }
            }
        }
        return java.math.BigDecimal.ZERO;
    }
}
