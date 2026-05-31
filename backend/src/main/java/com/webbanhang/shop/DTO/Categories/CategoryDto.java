package com.webbanhang.shop.DTO.Categories;

import com.webbanhang.shop.Model.Categories.Category;
import com.webbanhang.shop.DTO.PriceSegments.PriceSegmentDto;

import java.time.Instant;
import java.util.List;

public record CategoryDto(
        Integer categoryId,
        String categoryName,
        String slug,
        String categoryDescription,
        List<String> categoryImages,
        List<PriceSegmentDto> priceSegments,
        Instant createdAt,
        Instant updatedAt,
        Instant deletedAt
) {
    public static CategoryDto fromEntity(Category category) {
        List<PriceSegmentDto> segments = category.getCategoryPriceSegments() == null ? List.of()
                : category.getCategoryPriceSegments().stream()
                .map(link -> link.getPriceSegment())
                .filter(seg -> seg != null && seg.getDeletedAt() == null)
                .sorted((a, b) -> {
                    Integer ai = a.getPriceSegmentId() == null ? 0 : a.getPriceSegmentId();
                    Integer bi = b.getPriceSegmentId() == null ? 0 : b.getPriceSegmentId();
                    return Integer.compare(ai, bi);
                })
                .map(PriceSegmentDto::fromEntity)
                .toList();

        return new CategoryDto(
                category.getCategoryId(),
                category.getCategoryName(),
                category.getSlug(),
                category.getCategoryDescription(),
                category.getCategoryImages() == null ? List.of()
                        : category.getCategoryImages().stream()
                                .sorted((a, b) -> {
                                    int ao = a.getSortOrder() == null ? 0 : a.getSortOrder();
                                    int bo = b.getSortOrder() == null ? 0 : b.getSortOrder();
                                    return Integer.compare(ao, bo);
                                })
                                .map(img -> img.getImageUrl())
                                .toList(),
                segments,
                category.getCreatedAt(),
                category.getUpdatedAt(),
                category.getDeletedAt()
        );
    }
}
