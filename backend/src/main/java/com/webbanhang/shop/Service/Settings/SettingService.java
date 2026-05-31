package com.webbanhang.shop.Service.Settings;

import com.webbanhang.shop.Model.Settings.Setting;

public interface SettingService {
    Setting getCurrent();

    Setting updateMaintenance(Boolean isMaintenance);
}
