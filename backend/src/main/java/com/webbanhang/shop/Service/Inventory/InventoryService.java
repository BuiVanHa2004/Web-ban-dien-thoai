package com.webbanhang.shop.Service.Inventory;

import com.webbanhang.shop.Model.Products.ProductVariant;
import com.webbanhang.shop.Model.Inventory.OrderStockLog;
import com.webbanhang.shop.Model.Inventory.InventoryTransaction;
import com.webbanhang.shop.Repository.Products.ProductVariantRepository;
import com.webbanhang.shop.Repository.Inventory.OrderStockLogRepository;
import com.webbanhang.shop.Repository.Inventory.InventoryTransactionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Inventory Service - Quản lý tồn kho an toàn với concurrency control
 * 
 * Stock Model (Theo chuẩn E-commerce Production):
 * - total_stock: Tổng số lượng vật lý trong kho
 * - reserved_stock: Số lượng đang được giữ chỗ (đơn hàng chờ xử lý)
 * - sold_stock: Số lượng đã bán ra chính thức (CHỈ ĐỂ THỐNG KÊ)
 * - available_stock = total_stock - reserved_stock (KHÔNG TRỪ sold_stock)
 * 
 * ✅ WHY NOT subtract sold_stock?
 * Vì sold_stock là số liệu thống kê lịch sử, KHÔNG ảnh hưởng tồn kho hiện tại.
 * 
 * Flow:
 * 1. Tạo đơn: RESERVE → reserved_stock++ → available--
 * 2. Giao hàng/Thanh toán: CONFIRM SALE → reserved_stock--, sold_stock++ → available không đổi
 * 3. Hủy đơn: RELEASE → reserved_stock-- → available++
 * 4. Nhập hàng: IMPORT → total_stock++ → available++
 */
@Service
public class InventoryService {

    private final ProductVariantRepository variantRepository;
    private final EntityManager entityManager;
    private final OrderStockLogRepository stockLogRepository; // ❌ DEPRECATED
    private final InventoryTransactionRepository inventoryTransactionRepository;

    public InventoryService(
            ProductVariantRepository variantRepository,
            EntityManager entityManager,
            OrderStockLogRepository stockLogRepository,
            InventoryTransactionRepository inventoryTransactionRepository
    ) {
        this.variantRepository = variantRepository;
        this.entityManager = entityManager;
        this.stockLogRepository = stockLogRepository;
        this.inventoryTransactionRepository = inventoryTransactionRepository;
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
        
        // ✅ NEW: Log to inventory_transactions
        logInventoryTransaction(
                variant.getVariantId(),
                InventoryTransaction.TransactionType.RESERVE,
                quantity,
                variant.getTotalStock(), prevReserved, variant.getSoldStock(),
                variant.getTotalStock(), variant.getReservedStock(), variant.getSoldStock(),
                null, null, null,
                "Reserved stock for new order",
                "SYSTEM"
        );
        
        // ❌ DEPRECATED: Also log to old table for backward compatibility
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
        
        // ✅ NEW: Log to inventory_transactions
        logInventoryTransaction(
                variant.getVariantId(),
                InventoryTransaction.TransactionType.RELEASE,
                quantity,
                variant.getTotalStock(), prevReserved, variant.getSoldStock(),
                variant.getTotalStock(), variant.getReservedStock(), variant.getSoldStock(),
                null, null, null,
                "Released stock due to order cancellation",
                "SYSTEM"
        );
        
        // ❌ DEPRECATED: Also log to old table
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
     * ✅ NEW: Restore stock khi hủy đơn đã trừ kho
     * Hoàn lại stock từ sold về available (uncommon case - chỉ khi cancel sau khi đã giao hàng)
     * 
     * @param variantId ID của variant
     * @param quantity Số lượng cần restore
     */
    @Transactional
    public void restoreStock(Integer variantId, int quantity) {
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

        int prevSold = variant.getSoldStock();
        
        // Giảm sold_stock (hoàn lại hàng)
        int newSold = Math.max(0, variant.getSoldStock() - quantity);
        variant.setSoldStock(newSold);
        variant.setVersion(variant.getVersion() + 1);
        
        variantRepository.save(variant);
        
        // ✅ NEW: Log to inventory_transactions
        logInventoryTransaction(
                variant.getVariantId(),
                InventoryTransaction.TransactionType.RETURN,
                quantity,
                variant.getTotalStock(), variant.getReservedStock(), prevSold,
                variant.getTotalStock(), variant.getReservedStock(), variant.getSoldStock(),
                null, null, null,
                "Restored stock due to order cancellation after delivery",
                "SYSTEM"
        );
        
        // ❌ DEPRECATED: Also log to old table
        logStockChange(null, null, variant, quantity, OrderStockLog.StockAction.RESTORE,
                variant.getTotalStock(), variant.getReservedStock(), prevSold,
                variant.getTotalStock(), variant.getReservedStock(), variant.getSoldStock(),
                "Restored stock due to order cancellation after delivery");
        
        System.out.println(String.format(
            "[INVENTORY] ⚠️ Restored %d units for variant %d. Sold: %d -> %d", 
            quantity, variantId, prevSold, variant.getSoldStock()
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
        
        // ✅ NEW: Log to inventory_transactions
        logInventoryTransaction(
                variant.getVariantId(),
                InventoryTransaction.TransactionType.SALE,
                quantity,
                variant.getTotalStock(), prevReserved, prevSold,
                variant.getTotalStock(), variant.getReservedStock(), variant.getSoldStock(),
                null, null, null,
                "Confirmed sale - moved from reserved to sold",
                "SYSTEM"
        );
        
        // ❌ DEPRECATED: Also log to old table
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
     * ✅ CORRECT FORMULA: available = total - reserved (NOT subtracting sold)
     */
    private int calculateAvailable(ProductVariant variant) {
        return variant.getTotalStock() - variant.getReservedStock();
    }

    /**
     * Log mọi thay đổi về inventory vào audit trail
     * Note: orderId có thể null nếu order chưa được save
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
        OrderStockLog log = new OrderStockLog();
        log.setOrderId(orderId); // Có thể null nếu order chưa được persist
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
    }

    /**
     * Record cho batch operations
     */
    public record StockReservation(Integer variantId, int quantity) {}
    
    /**
     * ✅ NEW: Log stock adjustment (không update variant, chỉ ghi log)
     * Dùng khi admin đã update totalStock trực tiếp qua form, chỉ cần ghi audit log
     * 
     * @param variantId ID của variant
     * @param oldStock Số lượng cũ
     * @param newStock Số lượng mới
     * @param reason Lý do điều chỉnh
     * @param createdBy Người thực hiện
     */
    @Transactional
    public void logStockAdjustmentOnly(Integer variantId, int oldStock, int newStock, String reason, String createdBy) {
        ProductVariant variant = variantRepository.findById(variantId)
                .orElseThrow(() -> new IllegalArgumentException("Product variant not found: " + variantId));

        int diff = newStock - oldStock;
        
        if (diff == 0) {
            return; // No change
        }
        
        // Validate: Ensure the variant's totalStock matches newStock
        if (variant.getTotalStock() != newStock) {
            System.err.println(String.format(
                "[INVENTORY] ⚠️ WARNING: Expected totalStock=%d but found %d for variant %d",
                newStock, variant.getTotalStock(), variantId
            ));
        }
        
        // Log to inventory_transactions (không update variant)
        String adjustmentNote = String.format(
            "%s (Change: %+d)", 
            reason != null ? reason : "Stock adjustment", 
            diff
        );
        
        logInventoryTransaction(
                variant.getVariantId(),
                InventoryTransaction.TransactionType.STOCK_ADJUSTMENT,
                Math.abs(diff),
                oldStock, variant.getReservedStock(), variant.getSoldStock(),
                newStock, variant.getReservedStock(), variant.getSoldStock(),
                "MANUAL_ADJUSTMENT", null, null,
                adjustmentNote,
                createdBy != null ? createdBy : "ADMIN"
        );
        
        System.out.println(String.format(
            "[INVENTORY] 📝 Logged stock adjustment for variant %d: %d -> %d (Change: %+d). Reason: %s", 
            variantId, oldStock, newStock, diff, reason
        ));
    }

    /**
     * ✅ NEW: Import stock (nhập hàng mới)
     * Được gọi khi nhận hàng từ nhà cung cấp
     * 
     * @param variantId ID của variant
     * @param quantity Số lượng nhập vào
     * @param reason Lý do nhập hàng
     * @param createdBy Người thực hiện
     */
    @Transactional
    public void importStock(Integer variantId, int quantity, String reason, String createdBy) {
        if (quantity <= 0) {
            throw new IllegalArgumentException("Import quantity must be positive");
        }

        ProductVariant variant = entityManager.find(
            ProductVariant.class, 
            variantId, 
            LockModeType.PESSIMISTIC_WRITE
        );

        if (variant == null) {
            throw new IllegalArgumentException("Product variant not found: " + variantId);
        }

        int prevTotal = variant.getTotalStock();
        
        // Tăng total_stock
        variant.setTotalStock(variant.getTotalStock() + quantity);
        variant.setVersion(variant.getVersion() + 1);
        
        // ✅ CRITICAL FIX: Also update legacy quantity field for backward compatibility
        variant.setQuantity(variant.getTotalStock());
        
        variantRepository.save(variant);
        
        // Log to new table
        logInventoryTransaction(
                variant.getVariantId(),
                InventoryTransaction.TransactionType.IMPORT,
                quantity,
                prevTotal, variant.getReservedStock(), variant.getSoldStock(),
                variant.getTotalStock(), variant.getReservedStock(), variant.getSoldStock(),
                "IMPORT", null, null,
                reason != null ? reason : "Import new stock",
                createdBy != null ? createdBy : "SYSTEM"
        );
        
        System.out.println(String.format(
            "[INVENTORY] ➕ Imported %d units for variant %d. Total: %d -> %d", 
            quantity, variantId, prevTotal, variant.getTotalStock()
        ));
    }
    
    /**
     * ✅ NEW: Stock adjustment (điều chỉnh kho bởi admin)
     * Được gọi khi admin sửa số lượng sản phẩm trong form Update Product
     * 
     * @param variantId ID của variant
     * @param newTotalStock Số lượng mới (số tuyệt đối, KHÔNG phải delta)
     * @param reason Lý do điều chỉnh (bắt buộc)
     * @param createdBy Người thực hiện
     */
    @Transactional
    public void adjustStock(Integer variantId, int newTotalStock, String reason, String createdBy) {
        if (newTotalStock < 0) {
            throw new IllegalArgumentException("Total stock cannot be negative");
        }
        
        if (reason == null || reason.isBlank()) {
            throw new IllegalArgumentException("Adjustment reason is required");
        }

        ProductVariant variant = entityManager.find(
            ProductVariant.class, 
            variantId, 
            LockModeType.PESSIMISTIC_WRITE
        );

        if (variant == null) {
            throw new IllegalArgumentException("Product variant not found: " + variantId);
        }

        int prevTotal = variant.getTotalStock();
        int diff = newTotalStock - prevTotal;
        
        // Validate: Cannot reduce below reserved + sold
        int minAllowed = variant.getReservedStock() + variant.getSoldStock();
        if (newTotalStock < minAllowed) {
            throw new IllegalStateException(
                String.format(
                    "Cannot reduce stock to %d. Minimum allowed: %d (reserved: %d + sold: %d)",
                    newTotalStock, minAllowed, variant.getReservedStock(), variant.getSoldStock()
                )
            );
        }
        
        if (diff == 0) {
            System.out.println("[INVENTORY] No stock change for variant " + variantId);
            return; // No change
        }
        
        // Update total_stock
        variant.setTotalStock(newTotalStock);
        variant.setVersion(variant.getVersion() + 1);
        
        // ❌ DEPRECATED: Also update legacy quantity field for backward compatibility
        variant.setQuantity(newTotalStock);
        
        variantRepository.save(variant);
        
        // Log to new table
        String adjustmentNote = String.format(
            "%s (Change: %+d)", 
            reason, 
            diff
        );
        
        logInventoryTransaction(
                variant.getVariantId(),
                InventoryTransaction.TransactionType.STOCK_ADJUSTMENT,
                Math.abs(diff),
                prevTotal, variant.getReservedStock(), variant.getSoldStock(),
                variant.getTotalStock(), variant.getReservedStock(), variant.getSoldStock(),
                "MANUAL_ADJUSTMENT", null, null,
                adjustmentNote,
                createdBy != null ? createdBy : "ADMIN"
        );
        
        System.out.println(String.format(
            "[INVENTORY] 🔧 Adjusted stock for variant %d: %d -> %d (Change: %+d). Reason: %s", 
            variantId, prevTotal, newTotalStock, diff, reason
        ));
    }
    
    /**
     * ✅ NEW: Log to inventory_transactions table
     */
    private void logInventoryTransaction(
            Integer variantId,
            InventoryTransaction.TransactionType transactionType,
            int quantity,
            int beforeTotal,
            int beforeReserved,
            int beforeSold,
            int afterTotal,
            int afterReserved,
            int afterSold,
            String referenceType,
            String referenceId,
            String orderCode,
            String reason,
            String createdBy
    ) {
        InventoryTransaction txn = new InventoryTransaction();
        txn.setVariantId(variantId);
        txn.setTransactionType(transactionType);
        txn.setQuantity(quantity);
        txn.setBeforeTotalStock(beforeTotal);
        txn.setBeforeReservedStock(beforeReserved);
        txn.setBeforeSoldStock(beforeSold);
        txn.setAfterTotalStock(afterTotal);
        txn.setAfterReservedStock(afterReserved);
        txn.setAfterSoldStock(afterSold);
        txn.setReferenceType(referenceType);
        txn.setReferenceId(referenceId);
        txn.setOrderCode(orderCode);
        txn.setReason(reason);
        txn.setCreatedBy(createdBy);
        txn.setCreatedAt(LocalDateTime.now());
        
        inventoryTransactionRepository.save(txn);
    }
}
