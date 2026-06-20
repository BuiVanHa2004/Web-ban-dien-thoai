package com.webbanhang.shop.Service.Inventory.Impl;

import com.webbanhang.shop.Service.Inventory.InventoryService;
import com.webbanhang.shop.Repository.Products.ProductVariantRepository;
import com.webbanhang.shop.Model.Products.ProductVariant;
import com.webbanhang.shop.Repository.Orders.OrderStockLogRepository;
import com.webbanhang.shop.Model.Orders.OrderStockLog;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class InventoryServiceImpl implements InventoryService {

    private final ProductVariantRepository productVariantRepository;
    private final OrderStockLogRepository orderStockLogRepository;

    public InventoryServiceImpl(
            ProductVariantRepository productVariantRepository,
            OrderStockLogRepository orderStockLogRepository
    ) {
        this.productVariantRepository = productVariantRepository;
        this.orderStockLogRepository = orderStockLogRepository;
    }

    @Override
    @Transactional
    public void batchReserveStock(List<StockReservation> reservations) {
        for (StockReservation reservation : reservations) {
            reserveStock(reservation.variantId(), reservation.quantity());
        }
    }

    @Override
    @Transactional
    public void reserveStock(Integer variantId, int quantity) {
        ProductVariant variant = productVariantRepository.findByVariantId(variantId)
                .orElseThrow(() -> new IllegalArgumentException("Variant not found: " + variantId));

        int available = variant.getQuantity() != null ? variant.getQuantity() : 0;
        int reserved = variant.getReservedQuantity() != null ? variant.getReservedQuantity() : 0;

        if (quantity > available) {
            throw new IllegalStateException("Không đủ hàng trong kho. Còn: " + available + ", yêu cầu: " + quantity);
        }

        variant.setReservedQuantity(reserved + quantity);
        productVariantRepository.save(variant);

        System.out.println("[INVENTORY] Reserved " + quantity + " units of variant " + variantId);
    }

    @Override
    @Transactional
    public void confirmSale(Integer variantId, int quantity) {
        ProductVariant variant = productVariantRepository.findByVariantId(variantId)
                .orElseThrow(() -> new IllegalArgumentException("Variant not found: " + variantId));

        int currentStock = variant.getQuantity() != null ? variant.getQuantity() : 0;
        int reserved = variant.getReservedQuantity() != null ? variant.getReservedQuantity() : 0;

        // Trừ stock thực sự
        variant.setQuantity(Math.max(0, currentStock - quantity));
        
        // Release reserved
        variant.setReservedQuantity(Math.max(0, reserved - quantity));
        
        productVariantRepository.save(variant);

        System.out.println("[INVENTORY] ✅ Confirmed sale: variant " + variantId + ", quantity " + quantity + ", new stock: " + (currentStock - quantity));
    }

    @Override
    @Transactional
    public void releaseStock(Integer variantId, int quantity) {
        ProductVariant variant = productVariantRepository.findByVariantId(variantId)
                .orElseThrow(() -> new IllegalArgumentException("Variant not found: " + variantId));

        int reserved = variant.getReservedQuantity() != null ? variant.getReservedQuantity() : 0;
        variant.setReservedQuantity(Math.max(0, reserved - quantity));
        
        productVariantRepository.save(variant);

        System.out.println("[INVENTORY] Released reserved stock: variant " + variantId + ", quantity " + quantity);
    }

    @Override
    @Transactional
    public void restoreStock(Integer variantId, int quantity) {
        ProductVariant variant = productVariantRepository.findByVariantId(variantId)
                .orElseThrow(() -> new IllegalArgumentException("Variant not found: " + variantId));

        int currentStock = variant.getQuantity() != null ? variant.getQuantity() : 0;
        variant.setQuantity(currentStock + quantity);
        
        productVariantRepository.save(variant);

        System.out.println("[INVENTORY] ⚠️ Restored stock: variant " + variantId + ", quantity " + quantity + ", new stock: " + (currentStock + quantity));
    }
}
