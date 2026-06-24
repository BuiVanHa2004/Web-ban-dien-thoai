package com.webbanhang.shop.Service.Products.Impl;

import com.webbanhang.shop.DTO.Products.ProductColorUpsertRequest;
import com.webbanhang.shop.DTO.Products.ProductSpecUpsertRequest;
import com.webbanhang.shop.DTO.Products.ProductUpsertRequest;
import com.webbanhang.shop.Model.Brands.Brand;
import com.webbanhang.shop.Model.Categories.Category;
import com.webbanhang.shop.Model.Products.DiscountType;
import com.webbanhang.shop.Model.Products.Product;
import com.webbanhang.shop.Model.Products.ProductType;
import com.webbanhang.shop.Model.Products.ProductColor;
import com.webbanhang.shop.Model.Products.ProductColorImage;
import com.webbanhang.shop.Model.Products.ProductImage;
import com.webbanhang.shop.Model.Products.ProductSpec;
import com.webbanhang.shop.Model.Products.ProductVariant;
import com.webbanhang.shop.Repository.Brands.BrandRepository;
import com.webbanhang.shop.Repository.Categories.CategoryRepository;
import com.webbanhang.shop.Repository.Orders.OrderItemRepository;
import com.webbanhang.shop.Repository.Products.ProductRepository;
import com.webbanhang.shop.Repository.Products.ProductVariantRepository;
import com.webbanhang.shop.Repository.Products.ProductColorRepository;
import com.webbanhang.shop.Service.Products.ProductService;
import com.webbanhang.shop.Service.Storage.MinioStorageService;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@SuppressWarnings("null")
public class ProductServiceImpl implements ProductService {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final BrandRepository brandRepository;
    private final ProductVariantRepository productVariantRepository;
    private final ProductColorRepository productColorRepository;
    private final MinioStorageService minioStorageService;
    private final OrderItemRepository orderItemRepository;
    private final com.webbanhang.shop.Service.Inventory.InventoryService inventoryService;

    public ProductServiceImpl(
            ProductRepository productRepository,
            CategoryRepository categoryRepository,
            BrandRepository brandRepository,
            ProductVariantRepository productVariantRepository,
            ProductColorRepository productColorRepository,
            MinioStorageService minioStorageService,
            OrderItemRepository orderItemRepository,
            com.webbanhang.shop.Service.Inventory.InventoryService inventoryService
    ) {
        this.productRepository = productRepository;
        this.categoryRepository = categoryRepository;
        this.brandRepository = brandRepository;
        this.productVariantRepository = productVariantRepository;
        this.productColorRepository = productColorRepository;
        this.minioStorageService = minioStorageService;
        this.orderItemRepository = orderItemRepository;
        this.inventoryService = inventoryService;
    }

    @Override
    public List<Product> findAllActive() {
        return productRepository.findAllVisibleWithGraph();
    }

    @Override
    public List<Product> findAllActiveFiltered(
            String q,
            Integer categoryId
    ) {
        List<Integer> ids = productRepository.findAllActiveFilteredIds(
                q,
                categoryId
        );

        if (ids == null || ids.isEmpty()) {
            return List.of();
        }

        return productRepository.findAllActiveByProductIdInWithGraph(ids);
    }

    @Override
    public List<Product> findAllTrashed() {
        return productRepository.findAllByDeletedAtIsNotNullOrderByDeletedAtDesc();
    }

    @Override
    public Optional<Product> findById(Integer id) {
        Optional<Product> productOpt = productRepository.findByProductId(id);
        if (productOpt.isEmpty()) return Optional.empty();
        Product p = productOpt.get();
        if (p.getDeletedAt() != null) return Optional.empty();
        if (p.getIsActive() != null && !p.getIsActive()) return Optional.empty();
        validateAndCleanImages(p);
        return Optional.of(p);
    }

    @Override
    public List<Product> findAllByIdIn(List<Integer> ids) {
        if (ids == null || ids.isEmpty()) return List.of();
        return productRepository.findAllByProductIdIn(ids);
    }

    private void validateAndCleanImages(Product product) {
        // Validate product color images
        if (product.getProductColors() != null) {
            product.getProductColors().forEach(color -> {
                if (color.getColorImages() != null && !color.getColorImages().isEmpty()) {
                    List<ProductColorImage> validColorImages = color.getColorImages().stream()
                            .filter(img -> {
                                if (img.getImageUrl() == null || img.getImageUrl().isBlank()) {
                                    return false;
                                }
                                String objectName = extractObjectNameFromImageUrl(img.getImageUrl());
                                if (objectName == null) {
                                    return false;
                                }
                                return minioStorageService.objectExists(objectName);
                            })
                            .collect(Collectors.toList());
                    if (validColorImages.size() != color.getColorImages().size()) {
                        color.getColorImages().clear();
                        color.getColorImages().addAll(validColorImages);
                    }
                }
            });
        }
    }

    @Override
    public Product create(ProductUpsertRequest req) {
        Product product = new Product();
        applyRequest(product, req);
        syncProductImages(product, req.productImages());
        syncProductColors(product, req.productColors());
        syncProductSpecs(product, req.productSpec());
        product.setProductId(null);
        
        // ✅ PHASE 1: Save product first to generate variant IDs
        Product savedProduct = productRepository.save(product);
        
        // ✅ PHASE 2: Process stock adjustments for NEW variants
        postProcessNewVariantsStockInit(savedProduct, req.productColors());
        
        return savedProduct;
    }

    @Override
    public Optional<Product> update(Integer id, ProductUpsertRequest req) {
        return productRepository.findByProductId(id).map(existing -> {
            // ✅ PHASE 1: Collect OLD stock values BEFORE any changes
            Map<Integer, Integer> oldStockMap = collectCurrentStockValues(existing);
            
            applyRequest(existing, req);
            syncProductImages(existing, req.productImages());
            syncProductColors(existing, req.productColors());
            syncProductSpecs(existing, req.productSpec());
            
            Product savedProduct = productRepository.save(existing);
            
            // ✅ PHASE 2: Log stock adjustments AFTER save (compare old vs new)
            postProcessStockAdjustments(savedProduct, req.productColors(), oldStockMap);
            
            return savedProduct;
        });
    }
    
    /**
     * ✅ Collect current stock values from product BEFORE sync
     */
    private Map<Integer, Integer> collectCurrentStockValues(Product product) {
        Map<Integer, Integer> stockMap = new HashMap<>();
        
        if (product.getProductColors() != null) {
            for (ProductColor color : product.getProductColors()) {
                if (color.getVariants() != null) {
                    for (ProductVariant variant : color.getVariants()) {
                        if (variant.getVariantId() != null) {
                            stockMap.put(variant.getVariantId(), variant.getTotalStock());
                        }
                    }
                }
            }
        }
        
        return stockMap;
    }
    
    /**
     * ✅ NEW: Initialize stock for newly created variants
     * Called after first save when variantIds are generated
     */
    private void postProcessNewVariantsStockInit(Product product, List<ProductColorUpsertRequest> reqColors) {
        if (reqColors == null || reqColors.isEmpty()) {
            return;
        }
        
        // Find matching variants and apply their initial stock from stockAdjustment
        for (ProductColor color : product.getProductColors()) {
            if (color.getVariants() == null) continue;
            
            // Find corresponding color request
            ProductColorUpsertRequest colorReq = reqColors.stream()
                .filter(rc -> rc.colorName() != null && rc.colorName().trim().equals(color.getColorName()))
                .findFirst()
                .orElse(null);
            
            if (colorReq == null || colorReq.variants() == null) continue;
            
            for (ProductVariant variant : color.getVariants()) {
                // Find corresponding variant request by RAM+Storage
                com.webbanhang.shop.DTO.Products.ProductVariantUpsertRequest variantReq = colorReq.variants().stream()
                    .filter(vr -> vr.ramGb() != null && vr.ramGb().equals(variant.getRamGb()) 
                               && vr.storageGb() != null && vr.storageGb().equals(variant.getStorageGb()))
                    .findFirst()
                    .orElse(null);
                
                if (variantReq == null) continue;
                
                // Check if this variant has initial stock (stockAdjustment field)
                Integer initialStock = variantReq.stockAdjustment();
                if (initialStock != null && initialStock > 0) {
                    String reason = variantReq.adjustmentReason();
                    if (reason == null || reason.isBlank()) {
                        reason = String.format("Nhập kho ban đầu: %d sản phẩm", initialStock);
                    }
                    
                    try {
                        // Use InventoryService to properly initialize stock
                        inventoryService.importStock(variant.getVariantId(), initialStock, reason, "ADMIN");
                        
                        System.out.println(String.format(
                            "[PRODUCT] ✅ Initialized stock for new variant %d: %d units. Reason: %s",
                            variant.getVariantId(), initialStock, reason
                        ));
                    } catch (Exception e) {
                        System.err.println("Failed to initialize stock for new variant " + variant.getVariantId() + ": " + e.getMessage());
                        throw new IllegalStateException("Không thể khởi tạo tồn kho: " + e.getMessage());
                    }
                }
            }
        }
    }
    
    /**
     * ✅ NEW: Post-process stock adjustments after product save
     * This logs all stock changes to inventory_transactions table
     */
    /**
     * ✅ REFACTORED: Process stock adjustments using InventoryService
     * Handles both positive and negative adjustments
     */
    private record StockAdjustment(Integer variantId, int adjustment, String reason) {}
    
    private void postProcessStockAdjustments(
            Product product, 
            List<ProductColorUpsertRequest> reqColors,
            Map<Integer, Integer> oldStockMap
    ) {
        if (reqColors == null || reqColors.isEmpty()) {
            return;
        }
        
        List<StockAdjustment> adjustments = new ArrayList<>();
        
        // Collect all stock adjustments from request
        for (ProductColorUpsertRequest colorReq : reqColors) {
            if (colorReq.variants() == null) continue;
            
            for (com.webbanhang.shop.DTO.Products.ProductVariantUpsertRequest variantReq : colorReq.variants()) {
                Integer variantId = variantReq.variantId();
                if (variantId == null) continue; // Skip new variants (no adjustment needed)
                
                Integer stockAdjustment = variantReq.stockAdjustment();
                if (stockAdjustment == null || stockAdjustment == 0) continue; // No adjustment
                
                String reason = variantReq.adjustmentReason();
                if (reason == null || reason.isBlank()) {
                    reason = stockAdjustment > 0 
                        ? String.format("Admin tăng tồn kho +%d", stockAdjustment)
                        : String.format("Admin giảm tồn kho %d", stockAdjustment);
                }
                
                adjustments.add(new StockAdjustment(variantId, stockAdjustment, reason));
            }
        }
        
        // Apply all adjustments via InventoryService
        for (StockAdjustment adj : adjustments) {
            try {
                // Fetch current stock
                ProductVariant variant = productVariantRepository.findById(adj.variantId)
                    .orElseThrow(() -> new IllegalArgumentException("Variant not found: " + adj.variantId));
                
                int currentStock = variant.getTotalStock();
                int newStock = currentStock + adj.adjustment;
                
                // Validate: cannot go below 0
                if (newStock < 0) {
                    throw new IllegalStateException(
                        String.format(
                            "Không thể điều chỉnh làm tồn kho nhỏ hơn 0. Hiện tại: %d, Điều chỉnh: %d, Kết quả: %d",
                            currentStock, adj.adjustment, newStock
                        )
                    );
                }
                
                // Validate: cannot reduce below reserved + sold
                int minAllowed = variant.getReservedStock() + variant.getSoldStock();
                if (newStock < minAllowed) {
                    throw new IllegalStateException(
                        String.format(
                            "Không thể giảm tồn kho xuống %d. Tối thiểu: %d (reserved: %d + sold: %d)",
                            newStock, minAllowed, variant.getReservedStock(), variant.getSoldStock()
                        )
                    );
                }
                
                // Apply adjustment via InventoryService
                if (adj.adjustment > 0) {
                    // Import stock (increase)
                    inventoryService.importStock(adj.variantId, adj.adjustment, adj.reason, "ADMIN");
                } else {
                    // Manual reduction (use adjustStock)
                    inventoryService.adjustStock(adj.variantId, newStock, adj.reason, "ADMIN");
                }
                
                System.out.println(String.format(
                    "[PRODUCT] ✅ Stock adjusted for variant %d: %d %+d = %d. Reason: %s",
                    adj.variantId, currentStock, adj.adjustment, newStock, adj.reason
                ));
            } catch (Exception e) {
                System.err.println("Failed to adjust stock for variant " + adj.variantId + ": " + e.getMessage());
                throw new IllegalStateException("Không thể điều chỉnh tồn kho: " + e.getMessage());
            }
        }
    }

    private void syncProductSpecs(Product product, ProductSpecUpsertRequest reqSpec) {
        if (reqSpec == null) {
            product.getProductSpecs().clear();
            return;
        }

        String targetVersion = reqSpec.version() != null ? reqSpec.version() : "VN";
        
        // Find existing spec with same version
        ProductSpec existingSpec = product.getProductSpecs().stream()
            .filter(s -> targetVersion.equals(s.getVersion()))
            .findFirst()
            .orElse(null);

        if (existingSpec != null) {
            // Update existing spec
            existingSpec.setChip(truncateString(reqSpec.chip(), 255));
            existingSpec.setCameraFront(truncateString(reqSpec.cameraFront(), 255));
            existingSpec.setCameraRear(truncateString(reqSpec.cameraRear(), 255));
            existingSpec.setScreen(truncateString(reqSpec.screen(), 255));
            existingSpec.setBattery(truncateString(reqSpec.battery(), 255));
            existingSpec.setRefreshRate(truncateString(reqSpec.refreshRate(), 50));
            existingSpec.setFastCharge(truncateString(reqSpec.fastCharge(), 100));
            existingSpec.setSupport5g(reqSpec.support5g() != null ? reqSpec.support5g() : false);
            existingSpec.setNfc(reqSpec.nfc() != null ? reqSpec.nfc() : false);
            existingSpec.setOperatingSystem(truncateString(reqSpec.operatingSystem(), 100));
            existingSpec.setSize(truncateString(reqSpec.size(), 100));
            existingSpec.setWeight(truncateString(reqSpec.weight(), 100));
            existingSpec.setMaterial(truncateString(reqSpec.material(), 100));
            existingSpec.setWaterResistance(truncateString(reqSpec.waterResistance(), 100));
            existingSpec.setChargingPort(truncateString(reqSpec.chargingPort(), 100));
            existingSpec.setSim(truncateString(reqSpec.sim(), 100));
            existingSpec.setWarranty(truncateString(reqSpec.warranty(), 255));
        } else {
            // Create new spec
            ProductSpec spec = new ProductSpec();
            spec.setProduct(product);
            spec.setVersion(targetVersion);
            spec.setChip(truncateString(reqSpec.chip(), 255));
            spec.setCameraFront(truncateString(reqSpec.cameraFront(), 255));
            spec.setCameraRear(truncateString(reqSpec.cameraRear(), 255));
            spec.setScreen(truncateString(reqSpec.screen(), 255));
            spec.setBattery(truncateString(reqSpec.battery(), 255));
            spec.setRefreshRate(truncateString(reqSpec.refreshRate(), 50));
            spec.setFastCharge(truncateString(reqSpec.fastCharge(), 100));
            spec.setSupport5g(reqSpec.support5g() != null ? reqSpec.support5g() : false);
            spec.setNfc(reqSpec.nfc() != null ? reqSpec.nfc() : false);
            spec.setOperatingSystem(truncateString(reqSpec.operatingSystem(), 100));
            spec.setSize(truncateString(reqSpec.size(), 100));
            spec.setWeight(truncateString(reqSpec.weight(), 100));
            spec.setMaterial(truncateString(reqSpec.material(), 100));
            spec.setWaterResistance(truncateString(reqSpec.waterResistance(), 100));
            spec.setChargingPort(truncateString(reqSpec.chargingPort(), 100));
            spec.setSim(truncateString(reqSpec.sim(), 100));
            spec.setWarranty(truncateString(reqSpec.warranty(), 255));
            
            product.getProductSpecs().add(spec);
        }
    }
    
    /**
     * ✅ Truncate string to max length to prevent database errors
     * @param value Input string
     * @param maxLength Maximum allowed length
     * @return Truncated string or null if input is null
     */
    private String truncateString(String value, int maxLength) {
        if (value == null) {
            return null;
        }
        if (value.length() <= maxLength) {
            return value;
        }
        System.err.println(String.format(
            "[PRODUCT] ⚠️ Truncating field from %d to %d chars: %s...", 
            value.length(), maxLength, value.substring(0, Math.min(50, value.length()))
        ));
        return value.substring(0, maxLength);
    }

    @Override
    public boolean softDelete(Integer id) {
        return productRepository.findById(id).map(existing -> {
            if (existing.getDeletedAt() != null) {
                return true;
            }
            existing.setDeletedAt(Instant.now());
            productRepository.save(existing);
            return true;
        }).orElse(false);
    }

    @Override
    public boolean restore(Integer id) {
        return productRepository.findById(id).map(existing -> {
            existing.setDeletedAt(null);
            productRepository.save(existing);
            return true;
        }).orElse(false);
    }

    @Override
    public boolean deleteForever(Integer id) {
        return productRepository.findById(id).map(existing -> {
            if (orderItemRepository.existsByProductProductId(id)) {
                throw new IllegalStateException("Không thể xóa vĩnh viễn sản phẩm vì đã phát sinh đơn hàng.");
            }

            // Delete color images from storage
            if (existing.getProductColors() != null) {
                for (ProductColor c : existing.getProductColors()) {
                    if (c.getColorImages() == null) continue;
                    for (ProductColorImage img : c.getColorImages()) {
                        String obj = extractObjectNameFromImageUrl(img.getImageUrl());
                        if (obj != null) {
                            minioStorageService.deleteObjectIfExists(obj);
                        }
                    }
                }
            }

            productRepository.deleteById(id);
            return true;
        }).orElse(false);
    }

    private void syncProductColors(Product product, List<ProductColorUpsertRequest> reqColors) {
        List<ProductColorUpsertRequest> desired = reqColors == null
                ? List.of()
                : reqColors.stream().filter(c -> c != null && c.colorName() != null && !c.colorName().isBlank()).toList();

        Set<ProductColor> existing = product.getProductColors() == null
                ? Set.of()
                : new HashSet<>(product.getProductColors());

        Map<Integer, ProductColor> byId = existing.stream()
                .filter(c -> c.getProductColorId() != null)
                .collect(Collectors.toMap(ProductColor::getProductColorId, c -> c, (a, b) -> a));

        Set<Integer> desiredIds = desired.stream()
                .map(ProductColorUpsertRequest::productColorId)
                .filter(id -> id != null)
                .collect(Collectors.toSet());

        for (ProductColor c : new HashSet<>(existing)) {
            Integer id = c.getProductColorId();
            if (id != null && !desiredIds.contains(id)) {
                if (c.getColorImages() != null) {
                    for (ProductColorImage img : c.getColorImages()) {
                        String obj = extractObjectNameFromImageUrl(img.getImageUrl());
                        if (obj != null) {
                            minioStorageService.deleteObjectIfExists(obj);
                        }
                    }
                }
                product.getProductColors().remove(c);
            }
        }

        for (ProductColorUpsertRequest rc : desired) {
            ProductColor color = null;
            if (rc.productColorId() != null) {
                color = byId.get(rc.productColorId());
            }
            if (color == null) {
                color = new ProductColor();
                color.setProduct(product);
                product.getProductColors().add(color);
            }
            // ✅ Truncate color fields
            color.setColorName(truncateString(rc.colorName().trim(), 255));
            color.setColorCode(truncateString(rc.colorCode(), 64));
            syncColorImages(color, rc.images());
            syncColorVariants(color, rc.variants());
        }
    }

    private void syncColorVariants(ProductColor color, List<com.webbanhang.shop.DTO.Products.ProductVariantUpsertRequest> reqVariants) {
        List<com.webbanhang.shop.DTO.Products.ProductVariantUpsertRequest> desired = reqVariants == null
                ? List.of()
                : reqVariants.stream()
                .filter(v -> v != null && (v.ramGb() != null || v.storageGb() != null))
                .toList();

        // ✅ VALIDATION: Check for duplicate (ramGb, storageGb) in request
        Set<String> seenSpecs = new HashSet<>();
        for (com.webbanhang.shop.DTO.Products.ProductVariantUpsertRequest rv : desired) {
            String specKey = rv.ramGb() + "-" + rv.storageGb();
            if (seenSpecs.contains(specKey)) {
                throw new IllegalArgumentException(
                    String.format("Duplicate variant specification: RAM %dGB + Storage %dGB. Each variant must be unique.", 
                        rv.ramGb(), rv.storageGb())
                );
            }
            seenSpecs.add(specKey);
        }

        if (color.getVariants() == null) {
            color.setVariants(new java.util.LinkedHashSet<>());
        }

        Set<ProductVariant> existing = new HashSet<>(color.getVariants());
        Map<Integer, ProductVariant> byId = existing.stream()
                .filter(v -> v.getVariantId() != null)
                .collect(Collectors.toMap(ProductVariant::getVariantId, v -> v, (a, b) -> a));
        
        // ✅ NEW: Also create map by (ramGb, storageGb) for existing variants
        Map<String, ProductVariant> bySpec = existing.stream()
                .filter(v -> v.getRamGb() != null && v.getStorageGb() != null)
                .collect(Collectors.toMap(
                    v -> v.getRamGb() + "-" + v.getStorageGb(), 
                    v -> v, 
                    (a, b) -> a // Keep first if duplicate
                ));

        Set<Integer> desiredIds = desired.stream()
                .map(com.webbanhang.shop.DTO.Products.ProductVariantUpsertRequest::variantId)
                .filter(id -> id != null)
                .collect(Collectors.toSet());

        for (ProductVariant v : new HashSet<>(existing)) {
            Integer id = v.getVariantId();
            if (id != null && !desiredIds.contains(id)) {
                color.getVariants().remove(v);
            }
        }

        for (com.webbanhang.shop.DTO.Products.ProductVariantUpsertRequest rv : desired) {
            ProductVariant variant = null;
            boolean isNewVariant = false;
            
            // ✅ IMPROVED: Try to find by variantId first, then by (ramGb, storageGb)
            if (rv.variantId() != null) {
                variant = byId.get(rv.variantId());
            }
            if (variant == null && rv.ramGb() != null && rv.storageGb() != null) {
                // Try to match by spec (for update operations without variantId)
                String specKey = rv.ramGb() + "-" + rv.storageGb();
                variant = bySpec.get(specKey);
            }
            if (variant == null) {
                variant = new ProductVariant();
                variant.setProductColor(color);
                color.getVariants().add(variant);
                isNewVariant = true;
            }
            
            variant.setRamGb(rv.ramGb());
            variant.setStorageGb(rv.storageGb());
            
            // ✅ CRITICAL CHANGE: Không cho phép set quantity trực tiếp
            // Chỉ xử lý stockAdjustment cho existing variants
            if (isNewVariant) {
                // Variant mới: Khởi tạo với stock = 0
                variant.setTotalStock(0);
                variant.setReservedStock(0);
                variant.setSoldStock(0);
                variant.setQuantity(0); // Legacy field
                System.out.println("[PRODUCT] New variant initialized with stock = 0");
            } else {
                // Existing variant: GIỮ NGUYÊN stock, không update
                // stockAdjustment sẽ được xử lý sau trong postProcessStockAdjustments()
                System.out.println("[PRODUCT] Existing variant - stock will be adjusted via InventoryService if needed");
            }

            // Handle price fields per new schema
            BigDecimal originalPrice = rv.originalPrice() != null ? rv.originalPrice() : BigDecimal.ZERO;
            variant.setOriginalPrice(originalPrice);

            // Parse discount type
            DiscountType discountType = DiscountType.NONE;
            if (rv.discountType() != null && !rv.discountType().isBlank()) {
                try {
                    discountType = DiscountType.valueOf(rv.discountType().toUpperCase());
                } catch (IllegalArgumentException e) {
                    discountType = DiscountType.NONE;
                }
            }
            variant.setDiscountType(discountType);

            BigDecimal discountValue = rv.discountValue() != null ? rv.discountValue() : BigDecimal.ZERO;
            variant.setDiscountValue(discountValue);

            // Calculate final price
            BigDecimal finalPrice = rv.finalPrice();
            if (finalPrice == null) {
                if (discountType == DiscountType.NONE || discountValue.compareTo(BigDecimal.ZERO) == 0) {
                    finalPrice = originalPrice;
                } else if (discountType == DiscountType.PERCENT) {
                    BigDecimal discountAmount = originalPrice.multiply(discountValue).divide(new BigDecimal("100"), 2, java.math.RoundingMode.HALF_UP);
                    finalPrice = originalPrice.subtract(discountAmount);
                } else { // AMOUNT
                    finalPrice = originalPrice.subtract(discountValue);
                }
                // Ensure price doesn't go below zero
                if (finalPrice.compareTo(BigDecimal.ZERO) < 0) {
                    finalPrice = BigDecimal.ZERO;
                }
            }
            variant.setFinalPrice(finalPrice);
        }
    }

    private void syncColorImages(ProductColor color, List<String> urls) {
        List<String> desired = urls == null
                ? List.of()
                : urls.stream().filter(u -> u != null && !u.isBlank()).toList();

        List<ProductColorImage> existing = color.getColorImages() == null
                ? List.of()
                : new java.util.ArrayList<>(color.getColorImages());

        Map<String, ProductColorImage> byUrl = new HashMap<>();
        for (ProductColorImage img : existing) {
            if (img.getImageUrl() != null && !img.getImageUrl().isBlank()) {
                byUrl.put(img.getImageUrl(), img);
            }
        }

        Set<String> desiredSet = new HashSet<>(desired);
        for (ProductColorImage img : new java.util.ArrayList<>(existing)) {
            String url = img.getImageUrl();
            if (url != null && !url.isBlank() && !desiredSet.contains(url)) {
                String obj = extractObjectNameFromImageUrl(url);
                if (obj != null) {
                    minioStorageService.deleteObjectIfExists(obj);
                }
                color.getColorImages().remove(img);
            }
        }

        for (int i = 0; i < desired.size(); i++) {
            String url = desired.get(i);
            ProductColorImage img = byUrl.get(url);
            if (img == null) {
                img = new ProductColorImage();
                img.setProductColor(color);
                img.setImageUrl(url);
                color.getColorImages().add(img);
            }
            img.setSortOrder(i);
        }
    }

    private void applyRequest(Product product, ProductUpsertRequest req) {
        Category category = categoryRepository.findById(req.categoryId())
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy danh mục."));

        Brand brand = null;
        if (req.brandId() != null) {
            brand = brandRepository.findById(req.brandId())
                    .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy thương hiệu."));
        }

        // ✅ Truncate strings to prevent database errors
        product.setProductName(truncateString(req.productName(), 255));
        product.setSlug(truncateString(req.slug(), 255));
        product.setProductDescribe(req.productDescribe()); // TEXT field - no limit
        product.setCategory(category);
        product.setBrand(brand);

        ProductType productType = null;
        if (req.productType() != null && !req.productType().isBlank()) {
            try {
                productType = ProductType.valueOf(req.productType().toUpperCase());
            } catch (IllegalArgumentException ignored) {
                productType = null;
            }
        }
        product.setProductType(productType);

    }

    private void syncProductImages(Product product, List<String> urls) {
        List<String> desired = urls == null
                ? List.of()
                : urls.stream().filter(u -> u != null && !u.isBlank()).toList();

        List<ProductImage> existing = product.getProductImages() == null
                ? List.of()
                : new ArrayList<>(product.getProductImages());

        Map<String, ProductImage> byUrl = new HashMap<>();
        for (ProductImage img : existing) {
            if (img.getImageUrl() != null && !img.getImageUrl().isBlank()) {
                byUrl.put(img.getImageUrl(), img);
            }
        }

        Set<String> desiredSet = new HashSet<>(desired);
        for (ProductImage img : new ArrayList<>(existing)) {
            String url = img.getImageUrl();
            if (url != null && !url.isBlank() && !desiredSet.contains(url)) {
                String obj = extractObjectNameFromImageUrl(url);
                if (obj != null) {
                    minioStorageService.deleteObjectIfExists(obj);
                }
                product.getProductImages().remove(img);
            }
        }

        for (int i = 0; i < desired.size(); i++) {
            String url = desired.get(i);
            ProductImage img = byUrl.get(url);
            if (img == null) {
                img = new ProductImage();
                img.setProduct(product);
                img.setImageUrl(url);
                img.setIsThumbnail(false);
                product.getProductImages().add(img);
            }
            img.setSortOrder(i);
        }

        // Mark first image as thumbnail if exists and no thumbnail set
        if (!desired.isEmpty()) {
            boolean hasThumbnail = product.getProductImages().stream()
                    .anyMatch(img -> Boolean.TRUE.equals(img.getIsThumbnail()));
            if (!hasThumbnail) {
                product.getProductImages().iterator().next().setIsThumbnail(true);
            }
        }
    }

    private String extractObjectNameFromImageUrl(String url) {
        if (url == null || url.isBlank()) {
            return null;
        }

        String marker = "/api/files/";
        int idx = url.indexOf(marker);
        if (idx < 0) {
            return null;
        }

        String objectName = url.substring(idx + marker.length());
        if (objectName.isBlank()) {
            return null;
        }

        if (!objectName.startsWith("products/")) {
            return null;
        }

        return objectName;
    }
}
