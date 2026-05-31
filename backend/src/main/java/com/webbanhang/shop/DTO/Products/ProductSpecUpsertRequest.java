package com.webbanhang.shop.DTO.Products;

public record ProductSpecUpsertRequest(
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
}
