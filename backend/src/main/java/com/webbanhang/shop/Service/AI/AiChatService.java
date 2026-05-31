package com.webbanhang.shop.Service.AI;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.webbanhang.shop.DTO.AI.*;
import com.webbanhang.shop.Exception.BadRequestException;
import com.webbanhang.shop.Model.AI.ChatMessage;
import com.webbanhang.shop.Model.AI.ChatSession;
import com.webbanhang.shop.Model.AI.UsageLog;
import com.webbanhang.shop.Repository.AI.ChatMessageRepository;
import com.webbanhang.shop.Repository.AI.ChatSessionRepository;
import com.webbanhang.shop.Repository.AI.UsageLogRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;

@Service
public class AiChatService {
    private final ChatSessionRepository chatSessionRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final UsageLogRepository usageLogRepository;
    private final AiPromptSafetyService safetyService;
    private final AiUsageGuardService usageGuardService;
    private final AiProviderService aiProviderService;
    private final ObjectMapper objectMapper;

    private static final String SYSTEM_PROMPT = """
            Bạn là trợ lý AI của MyPhone Store.
            Chỉ tư vấn chủ đề liên quan mua bán điện thoại, trả lời ngắn gọn, đúng trọng tâm.
            Nếu câu hỏi không liên quan, từ chối ngắn và điều hướng về chủ đề mua điện thoại.
            Luôn xưng hô: Shop và bạn.
            """;

    public AiChatService(
            ChatSessionRepository chatSessionRepository,
            ChatMessageRepository chatMessageRepository,
            UsageLogRepository usageLogRepository,
            AiPromptSafetyService safetyService,
            AiUsageGuardService usageGuardService,
            AiProviderService aiProviderService,
            ObjectMapper objectMapper
    ) {
        this.chatSessionRepository = chatSessionRepository;
        this.chatMessageRepository = chatMessageRepository;
        this.usageLogRepository = usageLogRepository;
        this.safetyService = safetyService;
        this.usageGuardService = usageGuardService;
        this.aiProviderService = aiProviderService;
        this.objectMapper = objectMapper;
    }

    public AiQuotaDto quota(Integer userId, String guestSessionId, String ip) {
        return usageGuardService.getQuota(userId, guestSessionId, ip);
    }

    // Backward-compatible method used by existing AiAdvisorService.
    public String chat(String systemPrompt, String userPrompt) {
        List<AiChatTurn> turns = new ArrayList<>();
        turns.add(new AiChatTurn("system", systemPrompt == null ? "" : systemPrompt));
        turns.add(new AiChatTurn("user", userPrompt == null ? "" : userPrompt));
        return aiProviderService.chat(turns).reply();
    }

    public AiChatResponse chat(Integer userId, String ip, AiChatRequest req) {
        if (req == null || req.messages() == null || req.messages().isEmpty()) {
            throw new BadRequestException("Vui lòng gửi tin nhắn.");
        }
        AiChatTurn latestUser = req.messages().stream()
                .filter(m -> "user".equals(m.role()))
                .reduce((a, b) -> b)
                .orElse(null);
        if (latestUser == null || latestUser.content() == null || latestUser.content().isBlank()) {
            throw new BadRequestException("Thiếu nội dung câu hỏi.");
        }
        if (safetyService.isUnsafe(latestUser.content())) {
            throw new BadRequestException("Nội dung yêu cầu không hợp lệ.");
        }

        AiUsageDecision decision = usageGuardService.checkAndConsume(userId, req.guestSessionId(), ip, latestUser.content());
        if (!decision.allowed()) {
            saveUsageLog(userId, req.guestSessionId(), ip, "quota_block", decision.estimatedInputTokens(), 0, BigDecimal.ZERO, "blocked",
                    Map.of("code", decision.code(), "message", decision.message()));
            throw new AiGuardBlockedException(decision.statusCode(), decision.code(), decision.message(), decision.quota());
        }

        ChatSession session = getOrCreateSession(userId, req.guestSessionId(), req.sessionId());

        ChatMessage userMsg = new ChatMessage();
        userMsg.setSessionId(session.getId());
        userMsg.setUserId(userId);
        userMsg.setRole("user");
        userMsg.setContent(latestUser.content());
        userMsg.setInputTokens(decision.estimatedInputTokens());
        chatMessageRepository.save(userMsg);

        List<AiChatTurn> context = buildContext(session.getId(), req.messages());
        AiProviderService.AiProviderResult ai = aiProviderService.chat(context);

        ChatMessage assistant = new ChatMessage();
        assistant.setSessionId(session.getId());
        assistant.setUserId(userId);
        assistant.setRole("assistant");
        assistant.setContent(ai.reply());
        assistant.setInputTokens(ai.promptTokens());
        assistant.setOutputTokens(ai.completionTokens());
        assistant.setModelName(ai.model());
        assistant.setCostUsd(estimateCost(ai.promptTokens(), ai.completionTokens()));
        chatMessageRepository.save(assistant);

        saveUsageLog(
                userId,
                req.guestSessionId(),
                ip,
                "chat_request",
                ai.promptTokens(),
                ai.completionTokens(),
                assistant.getCostUsd() == null ? BigDecimal.ZERO : assistant.getCostUsd(),
                "ok",
                Map.of("sessionId", session.getId(), "model", ai.model())
        );

        return new AiChatResponse(ai.reply(), session.getId(), decision.quota());
    }

    private ChatSession getOrCreateSession(Integer userId, String guestSessionId, Long sessionId) {
        if (sessionId != null) {
            if (userId != null) {
                return chatSessionRepository.findByIdAndUserId(sessionId, userId)
                        .orElseThrow(() -> new BadRequestException("Session không hợp lệ."));
            }
            return chatSessionRepository.findByIdAndGuestSessionId(sessionId, guestSessionId)
                    .orElseThrow(() -> new BadRequestException("Session không hợp lệ."));
        }
        ChatSession s = new ChatSession();
        s.setUserId(userId);
        s.setGuestSessionId(userId == null ? guestSessionId : null);
        s.setTitle("Tư vấn sản phẩm");
        s.setIsActive(true);
        return chatSessionRepository.save(s);
    }

    private List<AiChatTurn> buildContext(Long sessionId, List<AiChatTurn> inbound) {
        List<AiChatTurn> out = new ArrayList<>();
        out.add(new AiChatTurn("system", SYSTEM_PROMPT));

        // ưu tiên lịch sử từ DB, tránh user gửi full history quá lớn
        List<ChatMessage> history = chatMessageRepository.findTop20BySessionIdOrderByCreatedAtDesc(sessionId);
        history.stream()
                .sorted(Comparator.comparing(ChatMessage::getCreatedAt))
                .forEach(m -> out.add(new AiChatTurn(m.getRole(), m.getContent())));

        if (history.isEmpty() && inbound != null) {
            inbound.stream()
                    .filter(m -> "user".equals(m.role()) || "assistant".equals(m.role()))
                    .limit(12)
                    .forEach(out::add);
        }
        return out;
    }

    private BigDecimal estimateCost(int inputTokens, int outputTokens) {
        // simple approximate pricing guard
        double usd = inputTokens * 0.0000008 + outputTokens * 0.0000012;
        return BigDecimal.valueOf(usd);
    }

    private void saveUsageLog(
            Integer userId,
            String guestSessionId,
            String ip,
            String action,
            int reqTokens,
            int resTokens,
            BigDecimal cost,
            String status,
            Map<String, Object> metadata
    ) {
        UsageLog log = new UsageLog();
        log.setUserId(userId);
        log.setGuestSessionId(guestSessionId);
        log.setIpHash(Integer.toHexString((ip == null ? "unknown" : ip).hashCode()));
        log.setAction(action);
        log.setRequestTokensEst(reqTokens);
        log.setResponseTokens(resTokens);
        log.setCostUsd(cost);
        log.setStatus(status);
        try {
            log.setMetadata(objectMapper.writeValueAsString(metadata));
        } catch (Exception e) {
            log.setMetadata("{\"error\":\"metadata_serialize_failed\"}");
        }
        log.setCreatedAt(Instant.now());
        usageLogRepository.save(log);
    }
}
