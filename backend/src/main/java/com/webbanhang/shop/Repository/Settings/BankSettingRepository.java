package com.webbanhang.shop.Repository.Settings;

import com.webbanhang.shop.Model.Settings.BankSetting;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface BankSettingRepository extends JpaRepository<BankSetting, Integer> {
    Optional<BankSetting> findByIsActiveTrue();
}
