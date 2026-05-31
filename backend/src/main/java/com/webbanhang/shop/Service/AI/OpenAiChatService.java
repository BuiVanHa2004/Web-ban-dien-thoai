package com.webbanhang.shop.Service.AI;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;

@Service
public class OpenAiChatService {

    private final ObjectMapper objectMapper;

    @Value("${openai.api-key:}")
    private String apiKey;

    @Value("${openai.model:gpt-4o-mini}")
    private String model;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(20))
            .build();

    public OpenAiChatService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public String chat(String systemPrompt, String userPrompt) {
        if (apiKey == null || apiKey.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Thiếu OPENAI_API_KEY. Hãy cấu hình biến môi trường OPENAI_API_KEY cho backend.");
        }

        try {
            ObjectNode payload = objectMapper.createObjectNode();
            payload.put("model", model);

            ArrayNode messages = payload.putArray("messages");
            messages.add(objectMapper.createObjectNode()
                    .put("role", "system")
                    .put("content", systemPrompt));
            messages.add(objectMapper.createObjectNode()
                    .put("role", "user")
                    .put("content", userPrompt));

            payload.put("temperature", 0.4);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.openai.com/v1/chat/completions"))
                    .timeout(Duration.ofSeconds(60))
                    .header("Authorization", "Bearer " + apiKey.trim())
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(payload.toString(), StandardCharsets.UTF_8))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                String body = response.body();
                String detail = body == null ? "" : body.trim();
                String friendly = null;

                try {
                    JsonNode errRoot = objectMapper.readTree(detail);
                    JsonNode err = errRoot.path("error");
                    String code = err.path("code").asText("").trim();
                    String type = err.path("type").asText("").trim();
                    String msg = err.path("message").asText("").trim();

                    if ("insufficient_quota".equalsIgnoreCase(code)) {
                        friendly = "Tài khoản OpenAI của bạn đang hết quota hoặc chưa bật thanh toán (Billing).";
                    } else if ("invalid_api_key".equalsIgnoreCase(code)) {
                        friendly = "OPENAI_API_KEY không hợp lệ. Vui lòng kiểm tra lại API key của backend.";
                    } else if ("rate_limit_exceeded".equalsIgnoreCase(code)) {
                        friendly = "Bạn đang gửi quá nhiều yêu cầu tới OpenAI. Vui lòng thử lại sau ít phút.";
                    } else if (!code.isBlank()) {
                        friendly = "OpenAI trả lỗi: " + code + ".";
                    } else if (!type.isBlank()) {
                        friendly = "OpenAI trả lỗi: " + type + ".";
                    } else if (!msg.isBlank()) {
                        friendly = msg;
                    }
                } catch (Exception ignored) {
                    // ignore parse errors
                }

                if (friendly != null && !friendly.isBlank()) {
                    detail = friendly;
                } else {
                    if (detail.length() > 800) {
                        detail = detail.substring(0, 800) + "...";
                    }
                }
                throw new ResponseStatusException(
                        HttpStatus.BAD_GATEWAY,
                        "Gọi OpenAI thất bại (" + response.statusCode() + "). " + detail
                );
            }

            JsonNode root = objectMapper.readTree(response.body());
            JsonNode content = root.path("choices").path(0).path("message").path("content");
            if (content.isMissingNode() || content.isNull()) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "OpenAI không trả về nội dung.");
            }
            return content.asText("").trim();
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Lỗi khi gọi OpenAI.");
        }
    }
}
