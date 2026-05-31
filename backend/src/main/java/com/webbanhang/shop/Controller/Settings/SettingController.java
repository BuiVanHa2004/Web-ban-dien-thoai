package com.webbanhang.shop.Controller.Settings;

import com.webbanhang.shop.DTO.Settings.MaintenanceSettingDto;
import com.webbanhang.shop.Service.Settings.SettingService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/settings")
public class SettingController {

    private final SettingService settingService;

    public SettingController(SettingService settingService) {
        this.settingService = settingService;
    }

    @GetMapping("/maintenance")
    public MaintenanceSettingDto maintenance() {
        return MaintenanceSettingDto.fromEntity(settingService.getCurrent());
    }
}
