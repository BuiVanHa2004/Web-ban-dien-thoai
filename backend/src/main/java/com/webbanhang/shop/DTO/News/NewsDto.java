package com.webbanhang.shop.DTO.News;

import com.webbanhang.shop.Model.News.News;
import com.webbanhang.shop.Model.News.NewsImage;

import java.time.Instant;
import java.util.List;
import java.util.stream.Collectors;

public record NewsDto(
        Integer newsId,
        String newsTitle,
        String slug,
        String newsDescribe,
        List<String> newsImages,
        Instant createdAt,
        Instant updatedAt,
        Instant deletedAt
) {
    public static NewsDto fromEntity(News n) {
        List<String> imageUrls = n.getNewsImages() != null
                ? n.getNewsImages().stream()
                    .sorted((a, b) -> Integer.compare(a.getSortOrder(), b.getSortOrder()))
                    .map(NewsImage::getImageUrl)
                    .collect(Collectors.toList())
                : List.of();

        return new NewsDto(
                n.getNewsId(),
                n.getTitle(),
                n.getSlug(),
                n.getDescription(),
                imageUrls,
                n.getCreatedAt(),
                n.getUpdatedAt(),
                n.getDeletedAt()
        );
    }
}
