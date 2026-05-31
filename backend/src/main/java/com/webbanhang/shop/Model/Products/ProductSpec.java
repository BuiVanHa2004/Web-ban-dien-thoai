package com.webbanhang.shop.Model.Products;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "product_specs")
@Getter
@Setter
public class ProductSpec {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "spec_id")
    private Integer specId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(name = "version", length = 10)
    private String version = "VN";

    @Column(name = "chip", length = 255)
    private String chip;

    @Column(name = "camera_front", length = 255)
    private String cameraFront;

    @Column(name = "camera_rear", length = 255)
    private String cameraRear;

    @Column(name = "screen", length = 255)
    private String screen;

    @Column(name = "battery", length = 255)
    private String battery;

    @Column(name = "refresh_rate", length = 50)
    private String refreshRate;

    @Column(name = "fast_charge", length = 100)
    private String fastCharge;

    @Column(name = "support_5g")
    private Boolean support5g = false;

    @Column(name = "nfc")
    private Boolean nfc = false;

    @Column(name = "operating_system", length = 100)
    private String operatingSystem;

    @Column(name = "size", length = 100)
    private String size;

    @Column(name = "weight", length = 100)
    private String weight;

    @Column(name = "material", length = 100)
    private String material;

    @Column(name = "water_resistance", length = 100)
    private String waterResistance;

    @Column(name = "charging_port", length = 100)
    private String chargingPort;

    @Column(name = "sim", length = 100)
    private String sim;

    @Column(name = "warranty", length = 255)
    private String warranty;

    @Column(name = "created_at")
    private Instant createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = Instant.now();
    }
}
