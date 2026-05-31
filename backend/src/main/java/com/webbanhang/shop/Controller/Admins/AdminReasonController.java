package com.webbanhang.shop.Controller.Admins;

import com.webbanhang.shop.DTO.Orders.ReasonDto;
import com.webbanhang.shop.Model.Orders.ReasonType;
import com.webbanhang.shop.Service.Orders.ReasonService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/admin/reasons")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
public class AdminReasonController {

    private final ReasonService reasonService;

    @GetMapping("/order-cancel")
    public ResponseEntity<List<ReasonDto>> getCancelReasons() {
        List<ReasonDto> reasons = reasonService.getReasonsByType(ReasonType.ORDER_CANCEL);
        return ResponseEntity.ok(reasons);
    }
}
