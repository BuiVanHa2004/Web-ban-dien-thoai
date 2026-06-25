package com.webbanhang.shop.Service.AI;

import com.webbanhang.shop.DTO.AI.AiChatTurn;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class GoogleAiService {
    private final RestTemplate restTemplate = new RestTemplate();
    private final String apiKey;
    private final String model;

    public GoogleAiService(
            @Value("${google-ai.api-key:}") String apiKey,
            @Value("${google-ai.model:gemini-1.5-flash-latest}") String model
    ) {
        this.apiKey = apiKey;
        this.model = model;
    }

    public boolean isConfigured() {
        return apiKey != null && !apiKey.isBlank();
    }

    public AiProviderService.AiProviderResult chat(List<AiChatTurn> messages) {
        if (!isConfigured()) {
            throw new RuntimeException("Google AI API key not configured");
        }

        // Convert messages to Gemini format
        // Gemini uses "parts" with "text" instead of "content"
        // System messages are treated as initial user message
        StringBuilder fullPrompt = new StringBuilder();
        
        for (AiChatTurn msg : messages) {
            if ("system".equals(msg.role())) {
                fullPrompt.append("System Instructions: ").append(msg.content()).append("\n\n");
            } else if ("user".equals(msg.role())) {
                fullPrompt.append(msg.content()).append("\n");
            } else if ("assistant".equals(msg.role())) {
                // Skip assistant messages for simplicity in fallback
            }
        }

        Map<String, Object> payload = new LinkedHashMap<>();
        
        // Build contents array
        Map<String, Object> content = new LinkedHashMap<>();
        content.put("parts", List.of(Map.of("text", fullPrompt.toString())));
        
        payload.put("contents", List.of(content));
        
        // Generation config
        Map<String, Object> generationConfig = new LinkedHashMap<>();
        generationConfig.put("temperature", 0.6);
        generationConfig.put("maxOutputTokens", 2048);
        generationConfig.put("topP", 0.9);
        payload.put("generationConfig", generationConfig);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        // Use v1 API instead of v1beta
        String url = "https://generativelanguage.googleapis.com/v1/models/" + model + ":generateContent?key=" + apiKey;

        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> response = restTemplate.postForObject(
                    url,
                    new HttpEntity<>(payload, headers),
                    Map.class
            );

            if (response == null) {
                throw new RuntimeException("Empty response from Google AI");
            }

            // Parse response
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> candidates = (List<Map<String, Object>>) response.get("candidates");
            if (candidates == null || candidates.isEmpty()) {
                throw new RuntimeException("No candidates in Google AI response");
            }

            @SuppressWarnings("unchecked")
            Map<String, Object> content0 = (Map<String, Object>) candidates.get(0).get("content");
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> parts = (List<Map<String, Object>>) content0.get("parts");
            
            String reply = "";
            if (parts != null && !parts.isEmpty()) {
                reply = (String) parts.get(0).get("text");
            }

            // Token usage
            @SuppressWarnings("unchecked")
            Map<String, Object> usageMetadata = (Map<String, Object>) response.get("usageMetadata");
            int promptTokens = 0;
            int completionTokens = 0;
            
            if (usageMetadata != null) {
                promptTokens = ((Number) usageMetadata.getOrDefault("promptTokenCount", 0)).intValue();
                completionTokens = ((Number) usageMetadata.getOrDefault("candidatesTokenCount", 0)).intValue();
            }

            return new AiProviderService.AiProviderResult(
                    reply != null ? reply : "",
                    promptTokens,
                    completionTokens,
                    model
            );

        } catch (Exception e) {
            throw new RuntimeException("Google AI API error: " + e.getMessage(), e);
        }
    }
}
