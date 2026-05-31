package com.webbanhang.shop.Model.Orders;

import com.webbanhang.shop.Model.Admins.AdminAccount;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "evaluate_replies")
@Getter
@Setter
public class EvaluateReply {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "reply_id")
    private Integer replyId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "evaluate_id", nullable = false, columnDefinition = "int unsigned")
    private Evaluate evaluate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "admin_id", columnDefinition = "int unsigned")
    private AdminAccount admin;

    @Column(name = "reply_content", nullable = false, columnDefinition = "TEXT")
    private String replyContent;

    @Column(name = "created_at")
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    @PrePersist
    protected void onCreate() {
        Instant now = Instant.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = Instant.now();
    }
}
