package com.webbanhang.shop.DTO.Settings;

import com.webbanhang.shop.Model.Settings.Setting;

import java.time.Instant;

public record MaintenanceSettingDto(
        Integer settingId,
        Instant maintenanceStart,
        Instant maintenanceEnd,
        Boolean isMaintenance,
        Instant updatedAt
) {
    public static MaintenanceSettingDto fromEntity(Setting s) {
        if (s == null) return null;
        return new MaintenanceSettingDto(
                s.getSettingId(),
                s.getMaintenanceStart(),
                s.getMaintenanceEnd(),
                Boolean.TRUE.equals(s.getIsMaintenance()),
                s.getUpdatedAt()
        );
    }
}
