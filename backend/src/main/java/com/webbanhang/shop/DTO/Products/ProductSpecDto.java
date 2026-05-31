package com.webbanhang.shop.DTO.Products;

import com.webbanhang.shop.Model.Products.ProductSpec;

public record ProductSpecDto(
        Integer specId,
        String version,
        String chip,
        String cameraFront,
        String cameraRear,
        String screen,
        String battery,
        String refreshRate,
        String fastCharge,
        Boolean support5g,
        Boolean nfc,
        String operatingSystem,
        String size,
        String weight,
        String material,
        String waterResistance,
        String chargingPort,
        String sim,
        String warranty
) {
    public static ProductSpecDto fromEntity(ProductSpec s) {
        return new ProductSpecDto(
                s.getSpecId(),
                s.getVersion(),
                s.getChip(),
                s.getCameraFront(),
                s.getCameraRear(),
                s.getScreen(),
                s.getBattery(),
                s.getRefreshRate(),
                s.getFastCharge(),
                s.getSupport5g(),
                s.getNfc(),
                s.getOperatingSystem(),
                s.getSize(),
                s.getWeight(),
                s.getMaterial(),
                s.getWaterResistance(),
                s.getChargingPort(),
                s.getSim(),
                s.getWarranty()
        );
    }
}
