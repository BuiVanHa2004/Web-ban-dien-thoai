package com.webbanhang.shop.Service.AI;

import com.webbanhang.shop.DTO.AI.AiChatTurn;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.client.RestClientResponseException;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class GoogleAiService {
    private static final Logger log = LoggerFactory.getLogger(GoogleAiService.class);

    private final RestTemplate restTemplate = new RestTemplate();
    private final String apiKey;
    private final List<String> models;

    // Danh sách model dự phòng - CHỈ dùng models TỒN TẠI trên API v1
    private static final String[] FALLBACK_MODELS = {
        "gemini-1.5-flash-latest",         // Stable, nhanh nhất
        "gemini-1.5-pro-latest",           // Stable, mạnh nhất
        "gemini-1.0-pro-latest"            // Fallback cuối cùng
    };

    public GoogleAiService(
            @Value("${google-ai.api-key:}") String apiKey,
            @Value("${google-ai.model:gemini-1.5-flash-latest}") String model
    ) {
        this.apiKey = apiKey;
        // Xây dựng danh sách model: model chính + các model dự phòng (loại trùng)
        this.models = new ArrayList<>();
        this.models.add(model);
        for (String fallback : FALLBACK_MODELS) {
            if (!this.models.contains(fallback)) {
                this.models.add(fallback);
            }
        }
    }

    public boolean isConfigured() {
        return apiKey != null && !apiKey.isBlank();
    }

    public AiProviderService.AiProviderResult chat(List<AiChatTurn> messages) {
        if (!isConfigured()) {
            throw new RuntimeException("Google AI API key not configured");
        }

        // Build prompt once
        String prompt = buildPrompt(messages);

        // Try each model in order, max 4 attempts
        int maxAttempts = Math.min(4, models.size());
        Exception lastException = null;
        
        for (int i = 0; i < maxAttempts; i++) {
            String currentModel = models.get(i);
            try {
                if (i > 0) {
                    log.info("Thử model dự phòng Google AI #{}: {}", i + 1, currentModel);
                    // Chờ 1 giây trước khi thử model tiếp theo
                    Thread.sleep(1000);
                } else {
                    log.info("Thử model Google AI chính: {}", currentModel);
                }
                return callGoogleAi(prompt, currentModel);
            } catch (Exception e) {
                lastException = e;
                String msg = e.getMessage() != null ? e.getMessage() : "";
                boolean isOverloaded = msg.contains("503") || msg.contains("429")
                        || msg.contains("UNAVAILABLE") || msg.contains("high demand")
                        || msg.contains("overloaded") || msg.contains("rate limit");
                
                boolean isNotFound = msg.contains("404") || msg.contains("NOT_FOUND") 
                        || msg.contains("not found");
                
                // Nếu model không tồn tại, thử model khác
                if (isNotFound && i < maxAttempts - 1) {
                    log.warn("Google AI model {} không tồn tại, thử model tiếp theo...", currentModel);
                    continue;
                }
                
                // Nếu bị quá tải, thử model khác
                if (isOverloaded && i < maxAttempts - 1) {
                    log.warn("Google AI model {} bị quá tải, thử model tiếp theo...", currentModel);
                    continue;
                }
                
                // Nếu không phải lỗi quá tải/not found hoặc hết model dự phòng, throw luôn
                break;
            }
        }

        throw new RuntimeException("Google AI API error (đã thử " + maxAttempts + " models): " 
                + (lastException != null ? lastException.getMessage() : "unknown"), lastException);
    }

    private String buildPrompt(List<AiChatTurn> messages) {
        StringBuilder fullPrompt = new StringBuilder();
        
        // Gộp tất cả messages thành 1 prompt (system + user + assistant)
        for (AiChatTurn msg : messages) {
            if ("system".equals(msg.role())) {
                fullPrompt.append(msg.content()).append("\n\n");
            } else if ("user".equals(msg.role())) {
                fullPrompt.append(msg.content()).append("\n\n");
            } else if ("assistant".equals(msg.role())) {
                fullPrompt.append(msg.content()).append("\n\n");
            }
        }
        
        return fullPrompt.toString().trim();
    }

    private AiProviderService.AiProviderResult callGoogleAi(String prompt, String modelName) {
        Map<String, Object> payload = new LinkedHashMap<>();
        
        // Build contents array - chỉ gửi text thuần, không dùng systemInstruction
        Map<String, Object> content = new LinkedHashMap<>();
        content.put("parts", List.of(Map.of("text", prompt)));
        
        payload.put("contents", List.of(content));
        
        // Generation config - không giới hạn output để tránh cắt
        Map<String, Object> generationConfig = new LinkedHashMap<>();
        generationConfig.put("temperature", 0.7);
        generationConfig.put("topP", 0.95);
        generationConfig.put("topK", 40);
        payload.put("generationConfig", generationConfig);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        String url = "https://generativelanguage.googleapis.com/v1/models/" + modelName + ":generateContent?key=" + apiKey;

        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> response = restTemplate.postForObject(
                    url,
                    new HttpEntity<>(payload, headers),
                    Map.class
            );

            if (response == null) {
                throw new RuntimeException("Empty response from Google AI (" + modelName + ")");
            }

            // Parse response
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> candidates = (List<Map<String, Object>>) response.get("candidates");
            if (candidates == null || candidates.isEmpty()) {
                throw new RuntimeException("No candidates in Google AI response (" + modelName + ")");
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

            log.info("Google AI trả lời thành công với model: {}", modelName);
            log.debug("Google AI response length: {} chars, reply preview: {}", 
                    reply != null ? reply.length() : 0, 
                    reply != null && reply.length() > 200 ? reply.substring(0, 200) + "..." : reply);
            return new AiProviderService.AiProviderResult(
                    reply != null ? reply : "",
                    promptTokens,
                    completionTokens,
                    modelName
            );

        } catch (RestClientResponseException e) {
            int status = e.getStatusCode().value();
            String body = e.getResponseBodyAsString();
            throw new RuntimeException(status + " " + e.getStatusText() + ": " + (body.length() > 300 ? body.substring(0, 300) : body));
        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("Google AI API error (" + modelName + "): " + e.getMessage(), e);
        }
    }
}

