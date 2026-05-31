package com.webbanhang.shop.Service.Settings.Impl;

import com.webbanhang.shop.Model.Settings.Setting;
import com.webbanhang.shop.Repository.Settings.SettingRepository;
import com.webbanhang.shop.Service.Settings.SettingService;
import org.springframework.stereotype.Service;

import java.time.Instant;

@Service
public class SettingServiceImpl implements SettingService {

    private final SettingRepository settingRepository;

    public SettingServiceImpl(SettingRepository settingRepository) {
        this.settingRepository = settingRepository;
    }

    @Override
    public Setting getCurrent() {
        return settingRepository.findTopByOrderBySettingIdDesc().orElseGet(() -> {
            Setting s = new Setting();
            s.setIsMaintenance(Boolean.FALSE);
            return settingRepository.save(s);
        });
    }

    @Override
    public Setting updateMaintenance(Boolean isMaintenance) {
        boolean next = Boolean.TRUE.equals(isMaintenance);
        Setting current = getCurrent();

        boolean prev = Boolean.TRUE.equals(current.getIsMaintenance());
        if (prev == next) {
            return current;
        }

        current.setIsMaintenance(next);
        if (next) {
            current.setMaintenanceStart(Instant.now());
            current.setMaintenanceEnd(null);
        } else {
            current.setMaintenanceEnd(Instant.now());
        }

        return settingRepository.save(current);
    }
}
