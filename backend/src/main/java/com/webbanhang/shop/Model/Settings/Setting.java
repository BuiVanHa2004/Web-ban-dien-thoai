package com.webbanhang.shop.Model.Settings;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "settings")
@Getter
@Setter
public class Setting {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "setting_id")
    private Integer settingId;

    @Column(name = "maintenance_start")
    private Instant maintenanceStart;

    @Column(name = "maintenance_end")
    private Instant maintenanceEnd;

    @Column(name = "is_maintenance")
    private Boolean isMaintenance;

    @Column(name = "payment_approve_threshold")
    private java.math.BigDecimal paymentApproveThreshold;

    @Column(name = "updated_at")
    private Instant updatedAt;

    @PrePersist
    protected void onCreate() {
        Instant now = Instant.now();
        this.updatedAt = now;
        if (this.isMaintenance == null) this.isMaintenance = Boolean.FALSE;
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = Instant.now();
        if (this.isMaintenance == null) this.isMaintenance = Boolean.FALSE;
    }
}
