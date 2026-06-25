package com.webbanhang.shop.Service.AI;

import com.webbanhang.shop.DTO.AI.AiChatTurn;
import com.webbanhang.shop.Exception.BadRequestException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
 import org.springframework.web.client.ResourceAccessException;
 import org.springframework.web.client.RestClientResponseException;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@SuppressWarnings("null")
public class AiProviderService {
    private static final Logger log = LoggerFactory.getLogger(AiProviderService.class);
    
    private final RestTemplate restTemplate = new RestTemplate();
    private final String groqApiKey;
    private final String model;
    private final GoogleAiService googleAiService;

    public AiProviderService(
            @Value("${groq.api-key:}") String groqApiKey,
            @Value("${groq.model:llama-3.3-70b-versatile}") String model,
            GoogleAiService googleAiService
    ) {
        this.groqApiKey = groqApiKey;
        this.model = model;
        this.googleAiService = googleAiService;
    }

    public AiProviderResult chat(List<AiChatTurn> messages) {
        Exception groqException = null;
        
        // Try Groq first
        if (groqApiKey != null && !groqApiKey.isBlank()) {
            try {
                log.info("Attempting to use Groq API...");
                return chatWithGroq(messages);
            } catch (Exception e) {
                groqException = e;
                log.warn("Groq API failed ({}), falling back to Google AI...", e.getMessage());
                // Fall through to Google AI fallback
            }
        }

        // Fallback to Google AI
        if (googleAiService.isConfigured()) {
            try {
                log.info("Using Google AI fallback");
                return googleAiService.chat(messages);
            } catch (Exception e) {
                log.error("Google AI fallback also failed: {}", e.getMessage());
                
                // Provide detailed error message
                String errorMsg = "Cả Groq và Google AI đều không khả dụng. ";
                if (groqException != null) {
                    errorMsg += "Groq: " + groqException.getMessage() + ". ";
                }
                errorMsg += "Google AI: " + e.getMessage();
                
                throw new BadRequestException(errorMsg);
            }
        }

        // If no API keys configured
        if (groqException != null) {
            log.error("Groq failed and no Google AI configured: {}", groqException.getMessage());
            throw new BadRequestException("Groq API lỗi và chưa cấu hình Google AI. Chi tiết: " + groqException.getMessage());
        }
        
        throw new BadRequestException("Chưa cấu hình API key cho AI provider.");
    }

    private AiProviderResult chatWithGroq(List<AiChatTurn> messages) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(groqApiKey);

        List<Map<String, String>> payloadMessages = messages.stream()
                .map(m -> Map.of("role", m.role(), "content", m.content()))
                .toList();

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("model", model);
        payload.put("messages", payloadMessages);
        payload.put("temperature", 0.6);
        payload.put("max_tokens", 2048);
        payload.put("top_p", 0.9);

        Map<?, ?> res;
        try {
            res = restTemplate.postForObject(
                    "https://api.groq.com/openai/v1/chat/completions",
                    new HttpEntity<>(payload, headers),
                    Map.class
            );
        } catch (RestClientResponseException ex) {
            int status = ex.getStatusCode().value();
            String errorBody = ex.getResponseBodyAsString();
            
            // Log chi tiết lỗi
            log.error("Groq API error - Status: {}, Body: {}", status, errorBody.length() > 200 ? errorBody.substring(0, 200) : errorBody);
            
            if (status == 401 || status == 403) {
                throw new RuntimeException("GROQ API key không hợp lệ hoặc không có quyền.");
            }
            if (status == 429) {
                throw new RuntimeException("Groq rate limit exceeded - đã hết token miễn phí hoặc vượt quá giới hạn");
            }
            throw new RuntimeException("Groq API lỗi (HTTP " + status + "): " + errorBody);
        } catch (ResourceAccessException ex) {
            throw new RuntimeException("Không kết nối được tới Groq API: " + ex.getMessage());
        }
        
        if (res == null) throw new RuntimeException("Không nhận được phản hồi từ Groq API.");

        List<?> choices = (List<?>) res.get("choices");
        if (choices == null || choices.isEmpty()) {
            throw new RuntimeException("Groq API trả về dữ liệu không hợp lệ.");
        }
        Map<?, ?> c0 = (Map<?, ?>) choices.get(0);
        Map<?, ?> msg = (Map<?, ?>) c0.get("message");
        String reply = msg == null ? null : (String) msg.get("content");
        if (reply == null || reply.isBlank()) reply = "Xin lỗi, tôi chưa thể trả lời lúc này.";

        Map<?, ?> usage = (Map<?, ?>) res.get("usage");
        int promptTokens = usage != null && usage.get("prompt_tokens") != null ? ((Number) usage.get("prompt_tokens")).intValue() : 0;
        int completionTokens = usage != null && usage.get("completion_tokens") != null ? ((Number) usage.get("completion_tokens")).intValue() : 0;

        log.info("Groq API thành công - Model: {}, Tokens: {}/{}", model, promptTokens, completionTokens);
        return new AiProviderResult(reply, promptTokens, completionTokens, model);
    }

    public record AiProviderResult(String reply, int promptTokens, int completionTokens, String model) {
    }
}
