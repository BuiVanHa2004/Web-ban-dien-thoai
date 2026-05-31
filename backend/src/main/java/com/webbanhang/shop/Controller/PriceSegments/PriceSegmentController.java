package com.webbanhang.shop.Controller.PriceSegments;

import com.webbanhang.shop.DTO.PriceSegments.PriceSegmentDto;
import com.webbanhang.shop.DTO.PriceSegments.PriceSegmentUpsertRequest;
import com.webbanhang.shop.Model.PriceSegments.PriceSegment;
import com.webbanhang.shop.Service.PriceSegments.PriceSegmentService;
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
    public ResponseEntity<PriceSegmentDto> create(@RequestBody PriceSegmentUpsertRequest req) {
        if (req == null || req.segmentName() == null || req.segmentName().trim().isEmpty() || req.minPrice() == null) {
            return ResponseEntity.badRequest().build();
        }

        PriceSegment seg = new PriceSegment();
        seg.setSegmentName(req.segmentName().trim());
        seg.setMinPrice(req.minPrice());
        seg.setMaxPrice(req.maxPrice());

        PriceSegment created = priceSegmentService.create(seg);
        return ResponseEntity.ok(PriceSegmentDto.fromEntity(created));
    }
}
