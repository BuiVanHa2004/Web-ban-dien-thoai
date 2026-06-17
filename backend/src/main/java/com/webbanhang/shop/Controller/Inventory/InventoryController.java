package com.webbanhang.shop.Controller.Inventory;

import com.webbanhang.shop.Model.Products.ProductVariant;
import com.webbanhang.shop.Repository.Products.ProductVariantRepository;
import com.webbanhang.shop.Service.Inventory.InventoryService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

/**
 * REST API để kiểm tra tồn kho
 */
@RestController
@RequestMapping("/api/inventory")
public class InventoryController {

    private final InventoryService inventoryService;
    private final ProductVariantRepository variantRepository;

    public InventoryController(
            InventoryService inventoryService,
            ProductVariantRepository variantRepository
    ) {
        this.inventoryService = inventoryService;
        this.variantRepository = variantRepository;
    }

    /**
     * Lấy thông tin tồn kho chi tiết của 1 variant
     * GET /api/inventory/variant/{variantId}
     */
    @GetMapping("/variant/{variantId}")
    public ResponseEntity<?> getVariantStock(@PathVariable Integer variantId) {
        try {
            ProductVariant variant = variantRepository.findById(variantId)
                    .orElseThrow(() -> new IllegalArgumentException("Variant không tồn tại"));

            int available = inventoryService.getAvailableStock(variantId);

            Map<String, Object> response = new HashMap<>();
            response.put("variantId", variant.getVariantId());
            response.put("totalStock", variant.getTotalStock());
            response.put("reservedStock", variant.getReservedStock());
            response.put("soldStock", variant.getSoldStock());
            response.put("availableStock", available);
            response.put("version", variant.getVersion());

            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Lỗi server: " + e.getMessage()));
        }
    }

    /**
     * Kiểm tra xem có đủ hàng để đặt không
     * GET /api/inventory/check-availability?variantId=1&quantity=2
     */
    @GetMapping("/check-availability")
    public ResponseEntity<?> checkAvailability(
            @RequestParam Integer variantId,
            @RequestParam Integer quantity
    ) {
        try {
            int available = inventoryService.getAvailableStock(variantId);
            boolean isAvailable = available >= quantity;

            Map<String, Object> response = new HashMap<>();
            response.put("variantId", variantId);
            response.put("requestedQuantity", quantity);
            response.put("availableStock", available);
            response.put("isAvailable", isAvailable);

            if (!isAvailable) {
                response.put("message", String.format(
                        "Không đủ hàng. Chỉ còn %d sản phẩm trong kho.", available));
            }

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Lỗi server: " + e.getMessage()));
        }
    }
}
