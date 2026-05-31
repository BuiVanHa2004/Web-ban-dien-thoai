package com.webbanhang.shop.Model.Orders;

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
@Table(name = "evaluate_images")
@Getter
@Setter
public class EvaluateImage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "evaluate_image_id")
    private Integer evaluateImageId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "evaluate_id", nullable = false, columnDefinition = "int unsigned")
    private Evaluate evaluate;

    @Column(name = "image_url", length = 1024)
    private String imageUrl;

    @Column(name = "created_at")
    private Instant createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = Instant.now();
    }
}
