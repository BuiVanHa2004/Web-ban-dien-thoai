package com.webbanhang.shop.Controller.Products;

import com.webbanhang.shop.DTO.Products.ProductDto;
import com.webbanhang.shop.DTO.Products.ProductUpsertRequest;
import com.webbanhang.shop.Service.Products.ProductService;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/products")
public class ProductController {

    private final ProductService productService;

    public ProductController(ProductService productService) {
        this.productService = productService;
    }

    @GetMapping
    public List<ProductDto> getAll(
            @RequestParam(value = "q", required = false) String q,
            @RequestParam(value = "categoryId", required = false) Integer categoryId
    ) {
        boolean hasAnyFilter = (q != null && !q.isBlank())
                || categoryId != null;

        var list = hasAnyFilter
                ? productService.findAllActiveFiltered(
                q,
                categoryId
        )
                : productService.findAllActive();

        return list.stream().map(ProductDto::fromEntity).toList();
    }

    @GetMapping("/trash")
    public List<ProductDto> getTrash() {
        return productService.findAllTrashed().stream().map(ProductDto::fromEntity).toList();
    }

    @GetMapping("/{id:\\d+}")
    public ResponseEntity<ProductDto> getById(@PathVariable("id") Integer id) {
        return productService.findById(id)
                .map(ProductDto::fromEntity)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/batch")
    public List<ProductDto> getByIds(@RequestParam("ids") List<Integer> ids) {
        return productService.findAllByIdIn(ids).stream()
                .map(ProductDto::fromEntity)
                .toList();
    }

    @PostMapping
    public ResponseEntity<ProductDto> create(@RequestBody ProductUpsertRequest req) {
        var created = productService.create(req);
        return ResponseEntity.status(HttpStatus.CREATED).body(ProductDto.fromEntity(created));
    }

    @PutMapping("/{id:\\d+}")
    public ResponseEntity<ProductDto> update(@PathVariable("id") Integer id, @RequestBody ProductUpsertRequest req) {
        return productService.update(id, req)
                .map(ProductDto::fromEntity)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PatchMapping("/{id:\\d+}/restore")
    public ResponseEntity<Void> restore(@PathVariable("id") Integer id) {
        boolean ok = productService.restore(id);
        if (!ok) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id:\\d+}")
    public ResponseEntity<Void> delete(@PathVariable("id") Integer id) {
        boolean ok = productService.softDelete(id);
        if (!ok) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id:\\d+}/force")
    public ResponseEntity<?> deleteForever(@PathVariable("id") Integer id) {
        try {
            boolean ok = productService.deleteForever(id);
            if (!ok) {
                return ResponseEntity.notFound().build();
            }
            return ResponseEntity.noContent().build();
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("message", e.getMessage() != null ? e.getMessage() : "Không thể xóa vĩnh viễn."));
        } catch (DataIntegrityViolationException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("message", "Không thể xóa vĩnh viễn sản phẩm vì đang được sử dụng trong đơn hàng."));
        }
    }
}
