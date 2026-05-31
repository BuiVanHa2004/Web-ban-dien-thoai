package com.webbanhang.shop.Repository.Orders;

import com.webbanhang.shop.Model.Orders.Reason;
import com.webbanhang.shop.Model.Orders.ReasonType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ReasonRepository extends JpaRepository<Reason, Integer> {
    Optional<Reason> findByReasonName(String reasonName);

    @org.springframework.data.jpa.repository.Query("SELECT r FROM Reason r WHERE r.reasonType = :reasonType AND r.isActive = true")
    java.util.List<Reason> findByReasonTypeAndIsActiveTrue(@org.springframework.data.repository.query.Param("reasonType") ReasonType reasonType);
}
