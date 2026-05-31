package com.webbanhang.shop.Service.AI;

import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class AiPromptSafetyService {
    private static final List<String> BLOCKED_PATTERNS = List.of(
            "ignore previous instructions",
            "reveal system prompt",
            "developer message",
            "bypass safety",
            "jailbreak"
    );

    public boolean isUnsafe(String input) {
        if (input == null || input.isBlank()) return false;
        String normalized = input.toLowerCase();
        return BLOCKED_PATTERNS.stream().anyMatch(normalized::contains);
    }
}
