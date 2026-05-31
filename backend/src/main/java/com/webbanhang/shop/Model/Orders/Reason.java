package com.webbanhang.shop.Model.Orders;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "reasons")
@Getter
@Setter
public class Reason {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "reason_id")
    private Integer reasonId;

    @Column(name = "reason_name", nullable = false, length = 255)
    private String reasonName;

    @Column(name = "allow_input")
    private Boolean allowInput = false;

    @Enumerated(EnumType.STRING)
    @Column(name = "reason_type")
    private ReasonType reasonType = ReasonType.ORDER_CANCEL;

    @Column(name = "is_active")
    private Boolean isActive = true;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
