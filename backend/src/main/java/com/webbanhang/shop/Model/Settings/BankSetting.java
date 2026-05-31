package com.webbanhang.shop.Model.Settings;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "bank_settings")
@Getter
@Setter
public class BankSetting {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "bank_bin", length = 20)
    private String bankBin = "970422"; // MB Bank default

    @Column(name = "account_number", length = 50, nullable = false)
    private String accountNumber;

    @Column(name = "account_name", length = 255, nullable = false)
    private String accountName;

    @Column(name = "is_active")
    private Boolean isActive = true;
}
