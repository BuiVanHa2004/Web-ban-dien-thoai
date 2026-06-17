package com.webbanhang.shop.Repository.Inventory;

import com.webbanhang.shop.Model.Inventory.OrderStockLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OrderStockLogRepository extends JpaRepository<OrderStockLog, Integer> {
    
    List<OrderStockLog> findByOrderIdOrderByCreatedAtDesc(Integer orderId);
    
    List<OrderStockLog> findByVariantIdOrderByCreatedAtDesc(Integer variantId);
    
    List<OrderStockLog> findByOrderCodeOrderByCreatedAtDesc(String orderCode);
}
