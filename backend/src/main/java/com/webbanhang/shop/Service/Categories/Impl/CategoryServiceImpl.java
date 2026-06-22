package com.webbanhang.shop.Service.Categories.Impl;

import com.webbanhang.shop.Model.Categories.Category;
import com.webbanhang.shop.Model.Categories.CategoryImage;
import com.webbanhang.shop.Model.PriceSegments.CategoryPriceSegment;
import com.webbanhang.shop.Model.PriceSegments.PriceSegment;
import com.webbanhang.shop.Repository.Categories.CategoryImageRepository;
import com.webbanhang.shop.Repository.Categories.CategoryRepository;
import com.webbanhang.shop.Repository.Products.ProductRepository;
import com.webbanhang.shop.Repository.PriceSegments.CategoryPriceSegmentRepository;
import com.webbanhang.shop.Repository.PriceSegments.PriceSegmentRepository;
import com.webbanhang.shop.Service.Categories.CategoryService;
import com.webbanhang.shop.Service.Storage.MinioStorageService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@SuppressWarnings("null")
public class CategoryServiceImpl implements CategoryService {

    private final CategoryRepository categoryRepository;
    private final MinioStorageService minioStorageService;
    private final PriceSegmentRepository priceSegmentRepository;
    private final CategoryPriceSegmentRepository categoryPriceSegmentRepository;
    private final ProductRepository productRepository;

    public CategoryServiceImpl(
            CategoryRepository categoryRepository, 
            CategoryImageRepository categoryImageRepository, 
            MinioStorageService minioStorageService, 
            PriceSegmentRepository priceSegmentRepository,
            CategoryPriceSegmentRepository categoryPriceSegmentRepository,
            ProductRepository productRepository) {
        this.categoryRepository = categoryRepository;
        this.minioStorageService = minioStorageService;
        this.priceSegmentRepository = priceSegmentRepository;
        this.categoryPriceSegmentRepository = categoryPriceSegmentRepository;
        this.productRepository = productRepository;
    }

    @Transactional
    private void syncSinglePriceSegment(Category category, BigDecimal minPrice, BigDecimal maxPrice) {
        // If category is persisted, delete existing links from database first
        if (category.getCategoryId() != null) {
            categoryPriceSegmentRepository.deleteByCategoryId(category.getCategoryId());
            // Clear the collection to sync with database state
            if (category.getCategoryPriceSegments() != null) {
                category.getCategoryPriceSegments().clear();
            }
        }
        
        // If both are null, no price segment
        if (minPrice == null && maxPrice == null) {
            return;
        }

        PriceSegment seg = priceSegmentRepository
                .findFirstByDeletedAtIsNullAndMinPriceAndMaxPrice(minPrice, maxPrice)
                .orElseGet(() -> {
                    PriceSegment created = new PriceSegment();
                    
                    // Generate segment name based on what's provided
                    String segmentName;
                    BigDecimal effectiveMinPrice;
                    
                    // Use Vietnamese number format with dot separator
                    java.text.DecimalFormat formatter = new java.text.DecimalFormat("#,###");
                    java.text.DecimalFormatSymbols symbols = new java.text.DecimalFormatSymbols(java.util.Locale.forLanguageTag("vi-VN"));
                    symbols.setGroupingSeparator('.');
                    formatter.setDecimalFormatSymbols(symbols);
                    
                    if (minPrice != null && maxPrice != null) {
                        // Both provided: "2.000.000-5.000.000"
                        segmentName = formatter.format(minPrice.longValue()) + "-" + formatter.format(maxPrice.longValue());
                        effectiveMinPrice = minPrice;
                    } else if (minPrice != null) {
                        // Only minPrice: "2.000.000+" (above 2M)
                        segmentName = formatter.format(minPrice.longValue()) + "+";
                        effectiveMinPrice = minPrice;
                    } else {
                        // Only maxPrice: "5.000.000-" (below 5M)
                        segmentName = formatter.format(maxPrice.longValue()) + "-";
                        effectiveMinPrice = BigDecimal.ZERO;
                    }
                    
                    created.setSegmentName(segmentName);
                    created.setMinPrice(effectiveMinPrice);
                    created.setMaxPrice(maxPrice);
                    created.setDeletedAt(null);
                    return priceSegmentRepository.save(created);
                });

        if (category.getCategoryPriceSegments() == null) {
            category.setCategoryPriceSegments(new LinkedHashSet<>());
        }

        // Add new link
        CategoryPriceSegment link = new CategoryPriceSegment();
        link.setCategory(category);
        link.setPriceSegment(seg);
        category.getCategoryPriceSegments().add(link);
    }

    @Override
    public List<Category> findAllActive() {
        return categoryRepository.findAllByDeletedAtIsNull();
    }

    @Override
    public List<Category> findAllTrashed() {
        return categoryRepository.findAllByDeletedAtIsNotNullOrderByDeletedAtDesc();
    }

    @Override
    public Optional<Category> findById(Integer id) {
        Optional<Category> categoryOpt = categoryRepository.findById(id);
        categoryOpt.ifPresent(this::validateAndCleanImages);
        return categoryOpt;
    }

    private void validateAndCleanImages(Category category) {
        if (category.getCategoryImages() == null || category.getCategoryImages().isEmpty()) {
            return;
        }

        List<CategoryImage> validImages = category.getCategoryImages().stream()
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

        if (validImages.size() != category.getCategoryImages().size()) {
            category.getCategoryImages().clear();
            category.getCategoryImages().addAll(validImages);
            // Re-sort by sortOrder
            for (int i = 0; i < validImages.size(); i++) {
                validImages.get(i).setSortOrder(i);
            }
            categoryRepository.save(category);
        }
    }

    @Override
    public Category create(Category category) {
        category.setCategoryId(null);
        // Keep any price segment links if caller set them, otherwise empty
        if (category.getCategoryPriceSegments() != null) {
            category.getCategoryPriceSegments().forEach(link -> link.setCategory(category));
        }
        return categoryRepository.save(category);
    }

    @Override
    public Optional<Category> update(Integer id, Category category) {
        return categoryRepository.findById(id).map(existing -> {
            existing.setCategoryName(category.getCategoryName());
            existing.setSlug(category.getSlug());
            existing.setCategoryDescription(category.getCategoryDescription());

            return categoryRepository.save(existing);
        });
    }

    @Transactional
    @Override
    public Optional<Category> updatePriceSegments(Integer id, List<Integer> priceSegmentIds) {
        return categoryRepository.findById(id).map(existing -> {
            // Deprecated: multi-select segments is no longer supported
            if (existing.getCategoryPriceSegments() != null) {
                existing.getCategoryPriceSegments().clear();
            }
            return categoryRepository.save(existing);
        });
    }

    @Transactional
    @Override
    public Optional<Category> updatePriceSegmentRange(Integer id, BigDecimal minPrice, BigDecimal maxPrice) {
        return categoryRepository.findById(id).map(existing -> {
            syncSinglePriceSegment(existing, minPrice, maxPrice);
            return categoryRepository.save(existing);
        });
    }

    @Override
    public boolean softDelete(Integer id) {
        return categoryRepository.findById(id).map(existing -> {
            if (existing.getDeletedAt() != null) {
                return true;
            }
            // Check for products
            long productCount = productRepository.countByCategoryCategoryIdAndDeletedAtIsNull(id);
            if (productCount > 0) {
                throw new IllegalStateException("Sản phẩm trong danh mục đang tồn tại, yêu cầu xử lý sản phẩm trước khi xóa");
            }
            existing.setDeletedAt(Instant.now());
            categoryRepository.save(existing);
            return true;
        }).orElse(false);
    }

    @Override
    public boolean restore(Integer id) {
        return categoryRepository.findById(id).map(existing -> {
            existing.setDeletedAt(null);
            categoryRepository.save(existing);
            return true;
        }).orElse(false);
    }

    @Override
    @Transactional
    public Category updateImages(Integer categoryId, List<String> imageUrls) {
        Category category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy danh mục."));

        // Get old image URLs before clearing
        List<String> oldImageUrls = category.getCategoryImages().stream()
                .map(CategoryImage::getImageUrl)
                .collect(Collectors.toList());

        // Get new image URLs
        List<String> newImageUrls = imageUrls != null ? imageUrls.stream()
                .filter(url -> url != null && !url.isBlank())
                .toList() : List.of();

        // Delete old images that are not in new images from MinIO
        oldImageUrls.stream()
                .filter(oldUrl -> !newImageUrls.contains(oldUrl))
                .forEach(oldUrl -> {
                    String objectName = extractObjectNameFromImageUrl(oldUrl);
                    if (objectName != null) {
                        minioStorageService.deleteObjectIfExists(objectName);
                    }
                });

        // Clear existing images
        category.getCategoryImages().clear();

        // Add new images
        if (!newImageUrls.isEmpty()) {
            Set<CategoryImage> newImages = new LinkedHashSet<>();
            for (int i = 0; i < newImageUrls.size(); i++) {
                String url = newImageUrls.get(i);
                CategoryImage img = new CategoryImage();
                img.setCategory(category);
                img.setImageUrl(url.trim());
                img.setSortOrder(i);
                newImages.add(img);
            }
            category.getCategoryImages().addAll(newImages);
        }

        return categoryRepository.save(category);
    }

    @Override
    public boolean deleteForever(Integer id) {
        return categoryRepository.findById(id).map(existing -> {
            // Delete all associated images from MinIO
            if (existing.getCategoryImages() != null) {
                existing.getCategoryImages().forEach(categoryImage -> {
                    String objectName = extractObjectNameFromImageUrl(categoryImage.getImageUrl());
                    if (objectName != null) {
                        minioStorageService.deleteObjectIfExists(objectName);
                    }
                });
            }
            categoryRepository.deleteById(id);
            return true;
        }).orElse(false);
    }

    private String extractObjectNameFromImageUrl(String imageUrl) {
        if (imageUrl == null || imageUrl.isBlank()) {
            return null;
        }

        String marker = "/api/files/";
        int idx = imageUrl.indexOf(marker);
        if (idx < 0) {
            return null;
        }

        String objectName = imageUrl.substring(idx + marker.length());
        if (objectName.isBlank()) {
            return null;
        }

        if (!objectName.startsWith("categories/")) {
            return null;
        }

        return objectName;
    }
}
