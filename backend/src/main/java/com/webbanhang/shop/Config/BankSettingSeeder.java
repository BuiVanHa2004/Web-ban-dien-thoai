package com.webbanhang.shop.Config;

import com.webbanhang.shop.Model.Settings.BankSetting;
import com.webbanhang.shop.Repository.Settings.BankSettingRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Seeder để khởi tạo cấu hình ngân hàng mặc định
 */
@Configuration
public class BankSettingSeeder {

    @Bean
    CommandLineRunner initBankSettings(BankSettingRepository bankSettingRepository) {
        return args -> {
            // Kiểm tra xem đã có bank setting nào chưa
            if (bankSettingRepository.count() == 0) {
                System.out.println("Initializing default bank settings...");
                
                BankSetting defaultBank = new BankSetting();
                defaultBank.setBankBin("970422"); // MB Bank
                defaultBank.setAccountNumber("0978603382"); // Thay bằng số tài khoản thật
                defaultBank.setAccountName("MyPhone-Store"); // Thay bằng tên thật
                defaultBank.setIsActive(true);
                
                bankSettingRepository.save(defaultBank);
                System.out.println("✓ Default bank setting created successfully");
            } else {
                System.out.println("Bank settings already exist, skipping initialization");
            }
        };
    }
}
