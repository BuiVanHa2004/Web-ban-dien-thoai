package com.webbanhang.shop.Controller.Orders;

import com.webbanhang.shop.DTO.Orders.EvaluateDetailDto;
import com.webbanhang.shop.DTO.Orders.EvaluateProductStatDto;
import com.webbanhang.shop.DTO.Orders.ReplyEvaluateRequest;
import com.webbanhang.shop.Service.Orders.EvaluateAdminService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/evaluates")
public class EvaluateAdminController {

    private final EvaluateAdminService evaluateAdminService;

    public EvaluateAdminController(EvaluateAdminService evaluateAdminService) {
        this.evaluateAdminService = evaluateAdminService;
    }

    @GetMapping("/products")
    public List<EvaluateProductStatDto> productStats() {
        return evaluateAdminService.getProductStats();
    }

    @GetMapping("/products/{productId}")
    public ResponseEntity<List<EvaluateDetailDto>> byProduct(@PathVariable Integer productId) {
        if (productId == null) return ResponseEntity.badRequest().build();
        return ResponseEntity.ok(evaluateAdminService.getByProductId(productId));
    }

    @DeleteMapping("/{id:\\d+}")
    public ResponseEntity<Void> delete(@PathVariable Integer id) {
        boolean ok = evaluateAdminService.softDelete(id);
        if (!ok) return ResponseEntity.notFound().build();
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id:\\d+}/reply")
    public ResponseEntity<Void> reply(@PathVariable Integer id, @RequestBody ReplyEvaluateRequest req) {
        if (req == null || req.reply() == null || req.reply().trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        boolean ok = evaluateAdminService.reply(id, req.reply().trim());
        if (!ok) return ResponseEntity.notFound().build();
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id:\\d+}/reply")
    public ResponseEntity<Void> deleteReply(@PathVariable Integer id) {
        boolean ok = evaluateAdminService.deleteReply(id);
        if (!ok) return ResponseEntity.notFound().build();
        return ResponseEntity.noContent().build();
    }
}
