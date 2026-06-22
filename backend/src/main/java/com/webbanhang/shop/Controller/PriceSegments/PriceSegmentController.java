package com.webbanhang.shop.Controller.PriceSegments;

import com.webbanhang.shop.DTO.PriceSegments.PriceSegmentDto;
import com.webbanhang.shop.DTO.PriceSegments.PriceSegmentUpsertRequest;
import com.webbanhang.shop.Model.PriceSegments.PriceSegment;
import com.webbanhang.shop.Service.PriceSegments.PriceSegmentService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/price-segments")
public class PriceSegmentController {

    private final PriceSegmentService priceSegmentService;

    public PriceSegmentController(PriceSegmentService priceSegmentService) {
        this.priceSegmentService = priceSegmentService;
    }

    @GetMapping
    public List<PriceSegmentDto> getAllActive() {
        return priceSegmentService.findAllActive().stream().map(PriceSegmentDto::fromEntity).toList();
    }

    @GetMapping("/{id:\\d+}")
    public ResponseEntity<PriceSegmentDto> getById(@PathVariable Integer id) {
        return priceSegmentService.findById(id)
                .map(PriceSegmentDto::fromEntity)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<?> create(@Valid @RequestBody PriceSegmentUpsertRequest req) {
        // Validate request
        if (req == null) {
            return ResponseEntity.badRequest().body(
                java.util.Map.of("message", "Request body không được để trống")
            );
        }
        
        if (req.segmentName() == null || req.segmentName().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(
                java.util.Map.of("message", "Tên phân khúc giá không được để trống")
            );
        }
        
        if (req.minPrice() == null) {
            return ResponseEntity.badRequest().body(
                java.util.Map.of("message", "Giá tối thiểu không được để trống")
            );
        }
        
        if (req.minPrice().compareTo(java.math.BigDecimal.ZERO) < 0) {
            return ResponseEntity.badRequest().body(
                java.util.Map.of("message", "Giá tối thiểu phải lớn hơn hoặc bằng 0")
            );
        }
        
        if (req.maxPrice() != null && req.maxPrice().compareTo(req.minPrice()) < 0) {
            return ResponseEntity.badRequest().body(
                java.util.Map.of("message", "Giá tối đa phải lớn hơn hoặc bằng giá tối thiểu")
            );
        }

        try {
            PriceSegment seg = new PriceSegment();
            seg.setSegmentName(req.segmentName().trim());
            seg.setMinPrice(req.minPrice());
            seg.setMaxPrice(req.maxPrice());

            PriceSegment created = priceSegmentService.create(seg);
            return ResponseEntity.ok(PriceSegmentDto.fromEntity(created));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(
                java.util.Map.of("message", "Không thể tạo phân khúc giá: " + e.getMessage())
            );
        }
    }
}
