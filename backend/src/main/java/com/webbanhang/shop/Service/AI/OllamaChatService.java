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
public class OllamaChatService {

    private final ObjectMapper objectMapper;

    @Value("${ollama.base-url:http://localhost:11434}")
    private String baseUrl;

    @Value("${ollama.model:llama3.1}")
    private String model;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    public OllamaChatService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public String chat(String systemPrompt, String userPrompt) {
        try {
            ObjectNode payload = objectMapper.createObjectNode();
            payload.put("model", model);
            payload.put("stream", false);

            ObjectNode options = payload.putObject("options");
            options.put("temperature", 0.2);
            options.put("top_p", 0.9);
            options.put("num_predict", 512);

            ArrayNode messages = payload.putArray("messages");
            messages.add(objectMapper.createObjectNode()
                    .put("role", "system")
                    .put("content", systemPrompt));
            messages.add(objectMapper.createObjectNode()
                    .put("role", "user")
                    .put("content", userPrompt));

            String url = baseUrl;
            if (url.endsWith("/")) {
                url = url.substring(0, url.length() - 1);
            }

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url + "/api/chat"))
                    .timeout(Duration.ofSeconds(120))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(payload.toString(), StandardCharsets.UTF_8))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                String body = response.body();
                String detail = body == null ? "" : body.trim();
                if (detail.length() > 800) {
                    detail = detail.substring(0, 800) + "...";
                }
                throw new ResponseStatusException(
                        HttpStatus.BAD_GATEWAY,
                        "Gọi Ollama thất bại (" + response.statusCode() + "). " + detail
                );
            }

            JsonNode root = objectMapper.readTree(response.body());
            JsonNode content = root.path("message").path("content");
            if (content.isMissingNode() || content.isNull()) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Ollama không trả về nội dung.");
            }
            return content.asText("").trim();
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            String msg = e.getMessage();
            if (msg == null) msg = "";
            msg = msg.trim();
            if (msg.length() > 300) {
                msg = msg.substring(0, 300) + "...";
            }
            String detail = e.getClass().getSimpleName() + (msg.isBlank() ? "" : (": " + msg));
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Lỗi khi gọi Ollama. " + detail);
        }
    }
}
