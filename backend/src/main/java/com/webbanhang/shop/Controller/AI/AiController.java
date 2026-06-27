package com.webbanhang.shop.Controller.AI;

import com.webbanhang.shop.DTO.AI.AiAdviceRequest;
import com.webbanhang.shop.DTO.AI.AiCompareRequest;
import com.webbanhang.shop.DTO.AI.AiResponse;
import com.webbanhang.shop.Service.AI.AiAdvisorService;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/ai")
public class AiController {

    private final AiAdvisorService aiAdvisorService;

    public AiController(AiAdvisorService aiAdvisorService) {
        this.aiAdvisorService = aiAdvisorService;
    }

    @PostMapping("/advice")
    public AiResponse advice(
            @RequestBody AiAdviceRequest req,
            @RequestHeader(value = "x-forwarded-for", required = false) String xForwardedFor,
            Authentication authentication
    ) {
        Integer userId = extractUserId(authentication);
        String ip = extractIp(xForwardedFor);
        return aiAdvisorService.advise(
            req.message(), 
            req.topK(), 
            userId, 
            req.guestSessionId(), 
            req.sessionId(),
            ip
        );
    }

    @PostMapping("/compare")
    public AiResponse compare(
            @RequestBody AiCompareRequest req,
            Authentication authentication
    ) {
        // ✅ Yêu cầu đăng nhập để sử dụng tính năng so sánh sản phẩm
        Integer userId = extractUserId(authentication);
        if (userId == null) {
            throw new ResponseStatusException(
                HttpStatus.UNAUTHORIZED, 
                "Vui lòng đăng nhập để sử dụng tính năng so sánh sản phẩm."
            );
        }
        return aiAdvisorService.compare(req.productIds(), req.question());
    }

    private Integer extractUserId(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) return null;
        String subject = authentication.getName();
        if (!subject.startsWith("customer:")) return null;
        try {
            return Integer.parseInt(subject.substring("customer:".length()));
        } catch (Exception e) {
            return null;
        }
    }

    private String extractIp(String xff) {
        if (xff == null || xff.isBlank()) return "unknown";
        return xff.split(",")[0].trim();
    }
}
