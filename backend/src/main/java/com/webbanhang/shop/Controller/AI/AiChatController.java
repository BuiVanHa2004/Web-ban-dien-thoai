package com.webbanhang.shop.Controller.AI;

import com.webbanhang.shop.DTO.AI.AiChatRequest;
import com.webbanhang.shop.DTO.AI.AiChatResponse;
import com.webbanhang.shop.DTO.AI.AiQuotaResponse;
import com.webbanhang.shop.Service.AI.AiChatService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/ai")
public class AiChatController {
    private final AiChatService aiChatService;

    public AiChatController(AiChatService aiChatService) {
        this.aiChatService = aiChatService;
    }

    @PostMapping("/chat")
    public AiChatResponse chat(
            @RequestHeader(value = "x-guest-session-id", required = false) String guestSessionId,
            @RequestHeader(value = "x-forwarded-for", required = false) String xForwardedFor,
            @RequestBody AiChatRequest request,
            Authentication authentication
    ) {
        Integer userId = extractUserId(authentication);
        String ip = extractIp(xForwardedFor);
        String reqGuest = request.guestSessionId() != null && !request.guestSessionId().isBlank()
                ? request.guestSessionId()
                : guestSessionId;
        AiChatRequest normalized = new AiChatRequest(request.sessionId(), reqGuest, request.messages());
        return aiChatService.chat(userId, ip, normalized);
    }

    @GetMapping("/quota")
    public AiQuotaResponse quota(
            @RequestHeader(value = "x-guest-session-id", required = false) String guestSessionId,
            @RequestHeader(value = "x-forwarded-for", required = false) String xForwardedFor,
            Authentication authentication
    ) {
        Integer userId = extractUserId(authentication);
        String ip = extractIp(xForwardedFor);
        return new AiQuotaResponse(aiChatService.quota(userId, guestSessionId, ip));
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
