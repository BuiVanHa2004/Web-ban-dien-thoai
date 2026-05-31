package com.webbanhang.shop.Service.Brands.Impl;

import com.webbanhang.shop.DTO.Brands.BrandCreateUpdateDto;
import com.webbanhang.shop.Model.Brands.Brand;
import com.webbanhang.shop.Model.Brands.BrandImage;
import com.webbanhang.shop.Repository.Brands.BrandRepository;
import com.webbanhang.shop.Repository.Products.ProductRepository;
import com.webbanhang.shop.Service.Brands.BrandService;
import com.webbanhang.shop.Service.Storage.MinioStorageService;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class BrandServiceImpl implements BrandService {

    private final BrandRepository brandRepository;
    private final MinioStorageService minioStorageService;
    private final ProductRepository productRepository;

    public BrandServiceImpl(BrandRepository brandRepository, MinioStorageService minioStorageService, ProductRepository productRepository) {
        this.brandRepository = brandRepository;
        this.minioStorageService = minioStorageService;
        this.productRepository = productRepository;
    }

    @Override
    public List<Brand> findAllActive() {
        return brandRepository.findAllByDeletedAtIsNull();
    }

    @Override
    public List<Brand> findAllTrashed() {
        return brandRepository.findAllByDeletedAtIsNotNullOrderByDeletedAtDesc();
    }

    @Override
    public Optional<Brand> findById(Integer id) {
        Optional<Brand> brandOpt = brandRepository.findByIdWithImages(id);
        brandOpt.ifPresent(this::validateAndCleanImages);
        return brandOpt;
    }

    private void validateAndCleanImages(Brand brand) {
        if (brand.getBrandImages() == null || brand.getBrandImages().isEmpty()) {
            return;
        }

        List<BrandImage> validImages = brand.getBrandImages().stream()
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

        if (validImages.size() != brand.getBrandImages().size()) {
            brand.getBrandImages().clear();
            brand.getBrandImages().addAll(validImages);
            // Re-sort by sortOrder
            for (int i = 0; i < validImages.size(); i++) {
                validImages.get(i).setSortOrder(i);
            }
            brandRepository.save(brand);
        }
    }

    @Override
    public Brand create(Brand brand) {
        brand.setBrandId(null);
        return brandRepository.save(brand);
    }

    @Override
    public Brand createFromDto(BrandCreateUpdateDto dto) {
        // Check if slug already exists (including deleted brands)
        if (dto.slug() != null && !dto.slug().trim().isEmpty()) {
            brandRepository.findBySlugIncludeDeleted(dto.slug()).ifPresent(existing -> {
                throw new RuntimeException("Thương hiệu này đã tồn tại");
            });
        }

        Brand brand = new Brand();
        brand.setBrandName(dto.brandName());
        brand.setSlug(dto.slug());
        brand.setBrandDescription(dto.brandDescription());

        // Convert image URLs to BrandImage entities
        if (dto.brandImages() != null && !dto.brandImages().isEmpty()) {
            for (int i = 0; i < dto.brandImages().size(); i++) {
                BrandImage brandImage = new BrandImage();
                brandImage.setImageUrl(dto.brandImages().get(i));
                brandImage.setSortOrder(i);
                brandImage.setBrand(brand);
                brand.getBrandImages().add(brandImage);
            }
        }

        return brandRepository.save(brand);
    }

    @Override
    public Optional<Brand> update(Integer id, Brand brand) {
        return brandRepository.findByIdWithImages(id).map(existing -> {
            existing.setBrandName(brand.getBrandName());
            existing.setSlug(brand.getSlug());
            existing.setBrandDescription(brand.getBrandDescription());

            // Handle brand images
            if (brand.getBrandImages() != null) {
                // Get old image URLs
                List<String> oldImageUrls = existing.getBrandImages().stream()
                        .map(BrandImage::getImageUrl)
                        .collect(Collectors.toList());

                // Get new image URLs
                List<String> newImageUrls = brand.getBrandImages().stream()
                        .map(BrandImage::getImageUrl)
                        .collect(Collectors.toList());

                // Delete old images that are not in new images
                oldImageUrls.stream()
                        .filter(oldUrl -> !newImageUrls.contains(oldUrl))
                        .forEach(oldUrl -> {
                            String objectName = extractObjectNameFromImageUrl(oldUrl);
                            if (objectName != null) {
                                minioStorageService.deleteObjectIfExists(objectName);
                            }
                        });

                // Update brand images
                existing.getBrandImages().clear();
                for (int i = 0; i < brand.getBrandImages().size(); i++) {
                    BrandImage newImage = brand.getBrandImages().get(i);
                    newImage.setBrand(existing);
                    newImage.setSortOrder(i);
                    existing.getBrandImages().add(newImage);
                }
            }

            return brandRepository.save(existing);
        });
    }

    @Override
    public Optional<Brand> updateFromDto(Integer id, BrandCreateUpdateDto dto) {
        return brandRepository.findByIdWithImages(id).map(existing -> {
            // Check if slug already exists (excluding current brand, including deleted brands)
            if (dto.slug() != null && !dto.slug().trim().isEmpty()) {
                brandRepository.findBySlugIncludeDeleted(dto.slug()).ifPresent(brandWithSameSlug -> {
                    if (!brandWithSameSlug.getBrandId().equals(id)) {
                        throw new RuntimeException("Thương hiệu này đã tồn tại");
                    }
                });
            }

            existing.setBrandName(dto.brandName());
            existing.setSlug(dto.slug());
            existing.setBrandDescription(dto.brandDescription());

            // Handle brand images
            if (dto.brandImages() != null) {
                // Get old image URLs
                List<String> oldImageUrls = existing.getBrandImages().stream()
                        .map(BrandImage::getImageUrl)
                        .collect(Collectors.toList());

                // Get new image URLs
                List<String> newImageUrls = dto.brandImages();

                // Delete old images that are not in new images
                oldImageUrls.stream()
                        .filter(oldUrl -> !newImageUrls.contains(oldUrl))
                        .forEach(oldUrl -> {
                            String objectName = extractObjectNameFromImageUrl(oldUrl);
                            if (objectName != null) {
                                minioStorageService.deleteObjectIfExists(objectName);
                            }
                        });

                // Update brand images
                existing.getBrandImages().clear();
                for (int i = 0; i < dto.brandImages().size(); i++) {
                    BrandImage brandImage = new BrandImage();
                    brandImage.setImageUrl(dto.brandImages().get(i));
                    brandImage.setSortOrder(i);
                    brandImage.setBrand(existing);
                    existing.getBrandImages().add(brandImage);
                }
            }

            return brandRepository.save(existing);
        });
    }

    @Override
    public boolean softDelete(Integer id) {
        return brandRepository.findById(id).map(existing -> {
            if (existing.getDeletedAt() != null) {
                return true;
            }
            // Check for products
            long productCount = productRepository.countByBrandBrandIdAndDeletedAtIsNull(id);
            if (productCount > 0) {
                throw new IllegalStateException("Sản phẩm trong thương hiệu đang tồn tại, yêu cầu xử lý sản phẩm trước khi xóa");
            }
            existing.setDeletedAt(Instant.now());
            brandRepository.save(existing);
            return true;
        }).orElse(false);
    }

    @Override
    public boolean restore(Integer id) {
        return brandRepository.findById(id).map(existing -> {
            existing.setDeletedAt(null);
            brandRepository.save(existing);
            return true;
        }).orElse(false);
    }

    @Override
    public boolean deleteForever(Integer id) {
        return brandRepository.findById(id).map(existing -> {
            // Delete all associated images from MinIO
            if (existing.getBrandImages() != null) {
                existing.getBrandImages().forEach(brandImage -> {
                    String objectName = extractObjectNameFromImageUrl(brandImage.getImageUrl());
                    if (objectName != null) {
                        minioStorageService.deleteObjectIfExists(objectName);
                    }
                });
            }
            brandRepository.deleteById(id);
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

        if (!objectName.startsWith("brands/")) {
            return null;
        }

        return objectName;
    }
}
