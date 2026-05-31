package com.webbanhang.shop.DTO.News;

import java.util.List;

public record NewsUpsertRequest(
        String newsTitle,
        String slug,
        String newsDescribe,
        List<String> newsImages
) {
    public NewsUpsertRequest {
        if (newsImages == null) {
            newsImages = List.of();
        }
    }
}
