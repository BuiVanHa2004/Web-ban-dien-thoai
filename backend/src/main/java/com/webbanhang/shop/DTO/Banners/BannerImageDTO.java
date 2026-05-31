package com.webbanhang.shop.DTO.Banners;

import lombok.Data;

@Data
public class BannerImageDTO {
    private Integer bannerImageId;
    private String imageUrl;
    private String title;
    private String subtitle;
    private String linkUrl;
    private Integer sortOrder;
}
