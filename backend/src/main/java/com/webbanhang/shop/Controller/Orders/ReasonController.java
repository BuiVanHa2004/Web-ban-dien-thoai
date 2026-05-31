package com.webbanhang.shop.Controller.Orders;

import com.webbanhang.shop.DTO.Orders.ReasonDto;
import com.webbanhang.shop.Model.Orders.ReasonType;
import com.webbanhang.shop.Service.Orders.ReasonService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/reasons")
@RequiredArgsConstructor
public class ReasonController {

    private final ReasonService reasonService;

    @GetMapping
    public ResponseEntity<?> getReasons(@RequestParam String type) {
        try {
            ReasonType reasonType = ReasonType.valueOf(type.toUpperCase());
            List<ReasonDto> reasons = reasonService.getReasonsByType(reasonType);
            return ResponseEntity.ok(reasons);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body("Invalid reason type: " + type);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error fetching reasons: " + e.getMessage());
        }
    }
}
