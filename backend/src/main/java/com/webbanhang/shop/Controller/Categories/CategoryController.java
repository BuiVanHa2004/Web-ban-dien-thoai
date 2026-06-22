package com.webbanhang.shop.Controller.Categories;

import com.webbanhang.shop.DTO.Categories.CategoryDto;
import com.webbanhang.shop.DTO.Categories.CategoryUpsertRequest;
import com.webbanhang.shop.Model.Categories.Category;
import com.webbanhang.shop.Service.Categories.CategoryService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/categories")
public class CategoryController {

    private final CategoryService categoryService;

    public CategoryController(CategoryService categoryService) {
        this.categoryService = categoryService;
    }

    @GetMapping
    public List<CategoryDto> getAll() {
        return categoryService.findAllActive().stream().map(CategoryDto::fromEntity).toList();
    }

    @GetMapping("/trash")
    public List<CategoryDto> getTrash() {
        return categoryService.findAllTrashed().stream().map(CategoryDto::fromEntity).toList();
    }

    @GetMapping("/{id:\\d+}")
    public ResponseEntity<CategoryDto> getById(@PathVariable Integer id) {
        return categoryService.findById(id)
                .map(CategoryDto::fromEntity)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody CategoryUpsertRequest req) {
        try {
            Category category = new Category();
            category.setCategoryName(req.categoryName());
            category.setSlug(req.slug());
            category.setCategoryDescription(req.categoryDescription());

            Category created = categoryService.create(category);

            // Save price segment range if at least one price is provided
            if (req.priceSegmentMin() != null || req.priceSegmentMax() != null) {
                categoryService.updatePriceSegmentRange(created.getCategoryId(), req.priceSegmentMin(), req.priceSegmentMax());
                created = categoryService.findById(created.getCategoryId()).orElse(created);
            }

            // Save images if provided
            if (req.categoryImages() != null && !req.categoryImages().isEmpty()) {
                categoryService.updateImages(created.getCategoryId(), req.categoryImages());
                created = categoryService.findById(created.getCategoryId()).orElse(created);
            }

            return ResponseEntity.status(HttpStatus.CREATED).body(CategoryDto.fromEntity(created));
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            String message = e.getMessage() != null ? e.getMessage().toLowerCase() : "";
            
            if (message.contains("category_name") || message.contains("uk_category_name")) {
                return ResponseEntity.badRequest().body(
                    java.util.Map.of("message", "Tên danh mục '" + req.categoryName() + "' đã tồn tại")
                );
            }
            if (message.contains("slug") || message.contains("uk_category_slug") || message.contains("uc_category_slug")) {
                return ResponseEntity.badRequest().body(
                    java.util.Map.of("message", "Slug '" + req.slug() + "' đã tồn tại")
                );
            }
            
            // Log chi tiết để debug
            System.err.println("DataIntegrityViolationException: " + e.getMessage());
            e.printStackTrace();
            
            return ResponseEntity.badRequest().body(
                java.util.Map.of(
                    "message", "Dữ liệu không hợp lệ hoặc đã tồn tại",
                    "detail", e.getMostSpecificCause().getMessage()
                )
            );
        } catch (Exception e) {
            System.err.println("Unexpected error creating category: " + e.getMessage());
            e.printStackTrace();
            
            return ResponseEntity.badRequest().body(
                java.util.Map.of("message", "Không thể tạo danh mục: " + e.getMessage())
            );
        }
    }

    @PutMapping("/{id:\\d+}")
    public ResponseEntity<?> update(@PathVariable Integer id, @RequestBody CategoryUpsertRequest req) {
        try {
            Category category = new Category();
            category.setCategoryName(req.categoryName());
            category.setSlug(req.slug());
            category.setCategoryDescription(req.categoryDescription());

            return categoryService.update(id, category)
                    .map(updated -> {
                        // Update price segment range if at least one price is provided
                        if (req.priceSegmentMin() != null || req.priceSegmentMax() != null) {
                            categoryService.updatePriceSegmentRange(id, req.priceSegmentMin(), req.priceSegmentMax());
                            updated = categoryService.findById(id).orElse(updated);
                        }
                        // Update images if provided
                        if (req.categoryImages() != null) {
                            categoryService.updateImages(id, req.categoryImages());
                            updated = categoryService.findById(id).orElse(updated);
                        }
                        return ResponseEntity.ok((Object) CategoryDto.fromEntity(updated));
                    })
                    .orElseGet(() -> ResponseEntity.notFound().build());
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            String message = e.getMessage();
            if (message != null) {
                if (message.contains("uk_category_name") || message.contains("category_name")) {
                    return ResponseEntity.badRequest().body(
                        java.util.Map.of("message", "Tên danh mục đã tồn tại")
                    );
                }
                if (message.contains("uk_category_slug") || message.contains("slug")) {
                    return ResponseEntity.badRequest().body(
                        java.util.Map.of("message", "Slug đã tồn tại")
                    );
                }
            }
            return ResponseEntity.badRequest().body(
                java.util.Map.of("message", "Dữ liệu không hợp lệ hoặc đã tồn tại")
            );
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(
                java.util.Map.of("message", "Không thể cập nhật danh mục: " + e.getMessage())
            );
        }
    }

    @PatchMapping("/{id:\\d+}/soft-delete")
    public ResponseEntity<Void> softDelete(@PathVariable Integer id) {
        boolean ok = categoryService.softDelete(id);
        if (!ok) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id:\\d+}/restore")
    public ResponseEntity<Void> restore(@PathVariable Integer id) {
        boolean ok = categoryService.restore(id);
        if (!ok) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id:\\d+}")
    public ResponseEntity<Void> delete(@PathVariable Integer id) {
        boolean ok = categoryService.softDelete(id);
        if (!ok) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id:\\d+}/force")
    public ResponseEntity<Void> deleteForever(@PathVariable Integer id) {
        boolean ok = categoryService.deleteForever(id);
        if (!ok) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.noContent().build();
    }
}
