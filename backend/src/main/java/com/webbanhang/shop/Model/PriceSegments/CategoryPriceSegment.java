package com.webbanhang.shop.Model.PriceSegments;

import com.webbanhang.shop.Model.Categories.Category;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(
        name = "category_price_segments",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_category_segment", columnNames = {"category_id", "price_segment_id"})
        }
)
@Getter
@Setter
public class CategoryPriceSegment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "category_price_segment_id")
    private Integer categoryPriceSegmentId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id", nullable = false)
    private Category category;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "price_segment_id", nullable = false)
    private PriceSegment priceSegment;

    @Column(name = "created_at")
    private Instant createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = Instant.now();
    }
}
