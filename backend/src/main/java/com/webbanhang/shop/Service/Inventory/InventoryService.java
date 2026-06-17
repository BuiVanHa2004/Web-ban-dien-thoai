package com.webbanhang.shop.Service.Inventory;

import com.webbanhang.shop.Model.Products.ProductVariant;
import com.webbanhang.shop.Model.Inventory.OrderStockLog;
import com.webbanhang.shop.Repository.Products.ProductVariantRepository;
import com.webbanhang.shop.Repository.Inventory.OrderStockLogRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import java.util.List;

/**
 * Inventory Service - Quản lý tồn kho an toàn với concurrency control
 * 
 * Stock Model:
 * - total_stock: Tổng số lượng vật lý trong kho
 * - reserved_stock: Số lượng đang được giữ chỗ (đơn hàng chờ xử lý)
 * - sold_stock: Số lượng đã bán ra chính thức
 * - available_stock = total_stock - reserved_stock - sold_stock
 */
@Service
public class InventoryService {

    private final ProductVariantRepository variantRepository;
    private final EntityManager entityManager;
    private final OrderStockLogRepository stockLogRepository;

    public InventoryService(
            ProductVariantRepository variantRepository,
            EntityManager entityManager,
            OrderStockLogRepository stockLogRepository
    ) {
        this.variantRepository = variantRepository;
        this.entityManager = entityManager;
        this.stockLogRepository = stockLogRepository;
    }

    /**
     * Reserve stock khi tạo đơn hàng (cả COD và BANK_TRANSFER)
     * Sử dụng pessimistic lock để tránh race condition
     * 
     * @param variantId ID của variant
     * @param quantity Số lượng cần reserve
     * @throws IllegalStateException nếu không đủ hàng
     */
    @Transactional
    public void reserveStock(Integer variantId, int quantity) {
        if (quantity <= 0) {
            throw new IllegalArgumentException("Quantity must be positive");
        }

        // Pessimistic lock - chỉ 1 transaction được sửa cùng lúc
        ProductVariant variant = entityManager.find(
            ProductVariant.class, 
            variantId, 
            LockModeType.PESSIMISTIC_WRITE
        );

        if (variant == null) {
            throw new IllegalArgumentException("Product variant not found: " + variantId);
        }

        int available = calculateAvailable(variant);
        
        if (available < quantity) {
            throw new IllegalStateException(
                String.format("Insufficient stock. Available: %d, Requested: %d", available, quantity)
            );
        }

        int prevReserved = variant.getReservedStock();
        
        // Tăng reserved_stock
        variant.setReservedStock(variant.getReservedStock() + quantity);
        variant.setVersion(variant.getVersion() + 1);
        
        variantRepository.save(variant);
        
        // Log the action
        logStockChange(null, null, variant, quantity, OrderStockLog.StockAction.RESERVE,
                variant.getTotalStock(), prevReserved, variant.getSoldStock(),
                variant.getTotalStock(), variant.getReservedStock(), variant.getSoldStock(),
                "Reserved stock for new order");
        
        System.out.println(String.format(
            "[INVENTORY] Reserved %d units for variant %d. Reserved: %d/%d", 
            quantity, variantId, variant.getReservedStock(), variant.getTotalStock()
        ));
    }

    /**
     * Release stock khi hủy đơn hàng
     * Trả stock từ reserved về available
     * 
     * @param variantId ID của variant
     * @param quantity Số lượng cần release
     */
    @Transactional
    public void releaseStock(Integer variantId, int quantity) {
        if (quantity <= 0) {
            throw new IllegalArgumentException("Quantity must be positive");
        }

        ProductVariant variant = entityManager.find(
            ProductVariant.class, 
            variantId, 
            LockModeType.PESSIMISTIC_WRITE
        );

        if (variant == null) {
            throw new IllegalArgumentException("Product variant not found: " + variantId);
        }

        int prevReserved = variant.getReservedStock();
        
        // Giảm reserved_stock
        int newReserved = Math.max(0, variant.getReservedStock() - quantity);
        variant.setReservedStock(newReserved);
        variant.setVersion(variant.getVersion() + 1);
        
        variantRepository.save(variant);
        
        // Log the action
        logStockChange(null, null, variant, quantity, OrderStockLog.StockAction.RELEASE,
                variant.getTotalStock(), prevReserved, variant.getSoldStock(),
                variant.getTotalStock(), variant.getReservedStock(), variant.getSoldStock(),
                "Released stock due to order cancellation");
        
        System.out.println(String.format(
            "[INVENTORY] Released %d units for variant %d. Reserved: %d/%d", 
            quantity, variantId, variant.getReservedStock(), variant.getTotalStock()
        ));
    }

    /**
     * Confirm sale - chuyển stock từ reserved sang sold
     * Gọi khi:
     * - BANK_TRANSFER: Payment thành công (PAID status)
     * - COD: Giao hàng thành công (DELIVERED status)
     * 
     * @param variantId ID của variant
     * @param quantity Số lượng cần confirm
     */
    @Transactional
    public void confirmSale(Integer variantId, int quantity) {
        if (quantity <= 0) {
            throw new IllegalArgumentException("Quantity must be positive");
        }

        ProductVariant variant = entityManager.find(
            ProductVariant.class, 
            variantId, 
            LockModeType.PESSIMISTIC_WRITE
        );

        if (variant == null) {
            throw new IllegalArgumentException("Product variant not found: " + variantId);
        }

        if (variant.getReservedStock() < quantity) {
            throw new IllegalStateException(
                String.format("Cannot confirm. Reserved: %d, Requested: %d", 
                    variant.getReservedStock(), quantity)
            );
        }

        int prevReserved = variant.getReservedStock();
        int prevSold = variant.getSoldStock();
        
        // Chuyển từ reserved sang sold
        variant.setReservedStock(variant.getReservedStock() - quantity);
        variant.setSoldStock(variant.getSoldStock() + quantity);
        variant.setVersion(variant.getVersion() + 1);
        
        variantRepository.save(variant);
        
        // Log the action
        logStockChange(null, null, variant, quantity, OrderStockLog.StockAction.CONFIRM,
                variant.getTotalStock(), prevReserved, prevSold,
                variant.getTotalStock(), variant.getReservedStock(), variant.getSoldStock(),
                "Confirmed sale - moved from reserved to sold");
        
        System.out.println(String.format(
            "[INVENTORY] Confirmed sale %d units for variant %d. Sold: %d, Reserved: %d", 
            quantity, variantId, variant.getSoldStock(), variant.getReservedStock()
        ));
    }

    /**
     * Kiểm tra stock có sẵn
     * 
     * @param variantId ID của variant
     * @return số lượng available
     */
    @Transactional(readOnly = true)
    public int getAvailableStock(Integer variantId) {
        ProductVariant variant = variantRepository.findById(variantId)
                .orElseThrow(() -> new IllegalArgumentException("Variant not found"));
        return calculateAvailable(variant);
    }

    /**
     * Batch reserve stock cho nhiều variant cùng lúc (atomic)
     * 
     * @param items List of (variantId, quantity)
     */
    @Transactional
    public void batchReserveStock(List<StockReservation> items) {
        // 1. Validate tất cả trước
        for (StockReservation item : items) {
            ProductVariant variant = variantRepository.findById(item.variantId())
                    .orElseThrow(() -> new IllegalArgumentException("Variant not found: " + item.variantId()));
            
            int available = calculateAvailable(variant);
            if (available < item.quantity()) {
                throw new IllegalStateException(
                    String.format("Insufficient stock for variant %d. Available: %d, Requested: %d", 
                        item.variantId(), available, item.quantity())
                );
            }
        }

        // 2. Reserve tất cả (đã validate nên an toàn)
        for (StockReservation item : items) {
            reserveStock(item.variantId(), item.quantity());
        }
    }

    /**
     * Tính available stock
     */
    private int calculateAvailable(ProductVariant variant) {
        return variant.getTotalStock() - variant.getReservedStock() - variant.getSoldStock();
    }

    /**
     * Log mọi thay đổi về inventory vào audit trail
     */
    private void logStockChange(
            Integer orderId,
            String orderCode,
            ProductVariant variant,
            int quantity,
            OrderStockLog.StockAction action,
            int prevTotal,
            int prevReserved,
            int prevSold,
            int newTotal,
            int newReserved,
            int newSold,
            String note
    ) {
        try {
            OrderStockLog log = new OrderStockLog();
            log.setOrderId(orderId);
            log.setOrderCode(orderCode);
            log.setVariantId(variant.getVariantId());
            log.setQuantity(quantity);
            log.setAction(action);
            log.setPreviousTotal(prevTotal);
            log.setPreviousReserved(prevReserved);
            log.setPreviousSold(prevSold);
            log.setNewTotal(newTotal);
            log.setNewReserved(newReserved);
            log.setNewSold(newSold);
            log.setNote(note);
            stockLogRepository.save(log);
        } catch (Exception e) {
            System.err.println("[INVENTORY] Failed to log stock change: " + e.getMessage());
            // Don't throw - logging failure shouldn't break inventory operations
        }
    }

    /**
     * Record cho batch operations
     */
    public record StockReservation(Integer variantId, int quantity) {}
}
