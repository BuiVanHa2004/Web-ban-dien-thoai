package com.webbanhang.shop.Controller.Brands;

import com.webbanhang.shop.DTO.Brands.BrandCreateUpdateDto;
import com.webbanhang.shop.DTO.Brands.BrandDto;
import com.webbanhang.shop.Model.Brands.Brand;
import com.webbanhang.shop.Service.Brands.BrandService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/brands")
public class BrandController {

    private final BrandService brandService;

    public BrandController(BrandService brandService) {
        this.brandService = brandService;
    }

    @GetMapping
    public List<BrandDto> getAll() {
        return brandService.findAllActive().stream().map(BrandDto::fromEntity).toList();
    }

    @GetMapping("/trash")
    public List<BrandDto> getTrash() {
        return brandService.findAllTrashed().stream().map(BrandDto::fromEntity).toList();
    }

    @GetMapping("/{id:\\d+}")
    public ResponseEntity<BrandDto> getById(@PathVariable Integer id) {
        return brandService.findById(id)
                .map(BrandDto::fromEntity)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<BrandDto> create(@RequestBody BrandCreateUpdateDto dto) {
        Brand created = brandService.createFromDto(dto);
        // Reload with images to ensure they're properly fetched
        Brand reloaded = brandService.findById(created.getBrandId()).orElse(created);
        return ResponseEntity.status(HttpStatus.CREATED).body(BrandDto.fromEntity(reloaded));
    }

    @PutMapping("/{id:\\d+}")
    public ResponseEntity<BrandDto> update(@PathVariable Integer id, @RequestBody BrandCreateUpdateDto dto) {
        return brandService.updateFromDto(id, dto)
                .map(BrandDto::fromEntity)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PatchMapping("/{id:\\d+}/restore")
    public ResponseEntity<Void> restore(@PathVariable Integer id) {
        boolean ok = brandService.restore(id);
        if (!ok) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id:\\d+}")
    public ResponseEntity<Void> delete(@PathVariable Integer id) {
        boolean ok = brandService.softDelete(id);
        if (!ok) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id:\\d+}/force")
    public ResponseEntity<Void> deleteForever(@PathVariable Integer id) {
        boolean ok = brandService.deleteForever(id);
        if (!ok) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.noContent().build();
    }
}
