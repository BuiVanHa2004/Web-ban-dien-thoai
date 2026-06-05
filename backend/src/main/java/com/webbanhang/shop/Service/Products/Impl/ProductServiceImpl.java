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
    private final MinioStorageService minioStorageService;
    private final OrderItemRepository orderItemRepository;

    public ProductServiceImpl(
            ProductRepository productRepository,
            CategoryRepository categoryRepository,
            BrandRepository brandRepository,
            MinioStorageService minioStorageService,
            OrderItemRepository orderItemRepository
    ) {
        this.productRepository = productRepository;
        this.categoryRepository = categoryRepository;
        this.brandRepository = brandRepository;
        this.minioStorageService = minioStorageService;
        this.orderItemRepository = orderItemRepository;
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
        return productRepository.save(product);
    }

    @Override
    public Optional<Product> update(Integer id, ProductUpsertRequest req) {
        return productRepository.findByProductId(id).map(existing -> {
            applyRequest(existing, req);
            syncProductImages(existing, req.productImages());
            syncProductColors(existing, req.productColors());
            syncProductSpecs(existing, req.productSpec());
            return productRepository.save(existing);
        });
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
            existingSpec.setChip(reqSpec.chip());
            existingSpec.setCameraFront(reqSpec.cameraFront());
            existingSpec.setCameraRear(reqSpec.cameraRear());
            existingSpec.setScreen(reqSpec.screen());
            existingSpec.setBattery(reqSpec.battery());
            existingSpec.setRefreshRate(reqSpec.refreshRate());
            existingSpec.setFastCharge(reqSpec.fastCharge());
            existingSpec.setSupport5g(reqSpec.support5g() != null ? reqSpec.support5g() : false);
            existingSpec.setNfc(reqSpec.nfc() != null ? reqSpec.nfc() : false);
            existingSpec.setOperatingSystem(reqSpec.operatingSystem());
            existingSpec.setSize(reqSpec.size());
            existingSpec.setWeight(reqSpec.weight());
            existingSpec.setMaterial(reqSpec.material());
            existingSpec.setWaterResistance(reqSpec.waterResistance());
            existingSpec.setChargingPort(reqSpec.chargingPort());
            existingSpec.setSim(reqSpec.sim());
            existingSpec.setWarranty(reqSpec.warranty());
        } else {
            // Create new spec
            ProductSpec spec = new ProductSpec();
            spec.setProduct(product);
            spec.setVersion(targetVersion);
            spec.setChip(reqSpec.chip());
            spec.setCameraFront(reqSpec.cameraFront());
            spec.setCameraRear(reqSpec.cameraRear());
            spec.setScreen(reqSpec.screen());
            spec.setBattery(reqSpec.battery());
            spec.setRefreshRate(reqSpec.refreshRate());
            spec.setFastCharge(reqSpec.fastCharge());
            spec.setSupport5g(reqSpec.support5g() != null ? reqSpec.support5g() : false);
            spec.setNfc(reqSpec.nfc() != null ? reqSpec.nfc() : false);
            spec.setOperatingSystem(reqSpec.operatingSystem());
            spec.setSize(reqSpec.size());
            spec.setWeight(reqSpec.weight());
            spec.setMaterial(reqSpec.material());
            spec.setWaterResistance(reqSpec.waterResistance());
            spec.setChargingPort(reqSpec.chargingPort());
            spec.setSim(reqSpec.sim());
            spec.setWarranty(reqSpec.warranty());
            
            product.getProductSpecs().add(spec);
        }
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
            color.setColorName(rc.colorName().trim());
            color.setColorCode(rc.colorCode());
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

        if (color.getVariants() == null) {
            color.setVariants(new java.util.LinkedHashSet<>());
        }

        Set<ProductVariant> existing = new HashSet<>(color.getVariants());
        Map<Integer, ProductVariant> byId = existing.stream()
                .filter(v -> v.getVariantId() != null)
                .collect(Collectors.toMap(ProductVariant::getVariantId, v -> v, (a, b) -> a));

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
            if (rv.variantId() != null) {
                variant = byId.get(rv.variantId());
            }
            if (variant == null) {
                variant = new ProductVariant();
                variant.setProductColor(color);
                color.getVariants().add(variant);
            }
            variant.setRamGb(rv.ramGb());
            variant.setStorageGb(rv.storageGb());
            int qty = rv.quantity() != null ? Math.max(rv.quantity(), 0) : 0;
            variant.setQuantity(qty);

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

        product.setProductName(req.productName());
        product.setSlug(req.slug());
        product.setProductDescribe(req.productDescribe());
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
