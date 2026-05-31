package com.webbanhang.shop.Controller.Banners;

import com.webbanhang.shop.DTO.Banners.BannerDTO;
import com.webbanhang.shop.Service.Banners.BannerService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/banners")
public class BannerController {

    private final BannerService bannerService;

    public BannerController(BannerService bannerService) {
        this.bannerService = bannerService;
    }

    @GetMapping
    public ResponseEntity<List<BannerDTO>> getAll() {
        return ResponseEntity.ok(bannerService.getAllActive());
    }

    @GetMapping("/trash")
    public ResponseEntity<List<BannerDTO>> getTrash() {
        return ResponseEntity.ok(bannerService.getTrash());
    }

    @GetMapping("/{id}")
    public ResponseEntity<BannerDTO> getById(@PathVariable Integer id) {
        return ResponseEntity.ok(bannerService.getById(id));
    }

    @PostMapping
    public ResponseEntity<BannerDTO> create(@RequestBody BannerDTO bannerDTO) {
        return ResponseEntity.ok(bannerService.create(bannerDTO));
    }

    @PutMapping("/{id}")
    public ResponseEntity<BannerDTO> update(@PathVariable Integer id, @RequestBody BannerDTO bannerDTO) {
        return ResponseEntity.ok(bannerService.update(id, bannerDTO));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> softDelete(@PathVariable Integer id) {
        bannerService.softDelete(id);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/restore")
    public ResponseEntity<Void> restore(@PathVariable Integer id) {
        bannerService.restore(id);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}/forever")
    public ResponseEntity<Void> deleteForever(@PathVariable Integer id) {
        bannerService.deleteForever(id);
        return ResponseEntity.ok().build();
    }
}
