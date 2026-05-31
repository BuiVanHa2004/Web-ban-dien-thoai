package com.webbanhang.shop.Repository.Settings;

import com.webbanhang.shop.Model.Settings.Setting;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface SettingRepository extends JpaRepository<Setting, Integer> {
    Optional<Setting> findTopByOrderBySettingIdDesc();
}
