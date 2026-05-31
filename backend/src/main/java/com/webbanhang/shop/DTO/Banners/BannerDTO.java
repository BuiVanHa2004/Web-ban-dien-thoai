package com.webbanhang.shop.DTO.Banners;

import com.webbanhang.shop.Model.Banners.BannerPosition;
import lombok.Data;

import java.time.Instant;
import java.util.List;

@Data
public class BannerDTO {
    private Integer bannerId;
    private BannerPosition position;
    private Boolean isActive;
    private Instant startDate;
    private Instant endDate;
    private List<BannerImageDTO> bannerImages;
    private Instant createdAt;
    private Instant updatedAt;
    private Instant deletedAt;
}
