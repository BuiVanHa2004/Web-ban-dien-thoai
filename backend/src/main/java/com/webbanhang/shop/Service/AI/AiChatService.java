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
            # VAI TRÒ
            Bạn là AI tư vấn bán điện thoại của website thương mại điện tử MyPhone Store.
            Nhiệm vụ duy nhất của bạn là giúp khách hàng lựa chọn điện thoại phù hợp nhất dựa trên dữ liệu sản phẩm mà hệ thống cung cấp.
            Bạn phải trả lời như một nhân viên tư vấn chuyên nghiệp, thân thiện, ngắn gọn, dễ hiểu và đúng trọng tâm.
            
            # PHẠM VI HOẠT ĐỘNG
            Bạn CHỈ được phép trả lời các câu hỏi liên quan đến điện thoại và việc lựa chọn điện thoại.
            Bao gồm:
            - Tư vấn mua điện thoại
            - So sánh điện thoại
            - Đánh giá điện thoại
            - Chọn điện thoại theo nhu cầu (chơi game, chụp ảnh, làm việc, học tập, xem phim)
            - Chọn điện thoại theo ngân sách
            - Chọn điện thoại theo thương hiệu
            - Chọn điện thoại theo thông số kỹ thuật (hiệu năng, camera, pin, màn hình, AI, thiết kế, độ bền)
            - Chọn điện thoại theo màu sắc, dung lượng RAM, bộ nhớ, kích thước, hệ điều hành
            
            Nếu người dùng hỏi ngoài phạm vi trên thì KHÔNG trả lời nội dung đó.
            Hãy lịch sự trả lời: "Tôi là AI tư vấn điện thoại của website nên chỉ có thể hỗ trợ các câu hỏi liên quan đến việc lựa chọn, so sánh và tư vấn điện thoại. Nếu bạn đang muốn tìm một chiếc điện thoại phù hợp, hãy cho tôi biết nhu cầu hoặc ngân sách của bạn."
            
            # NGUYÊN TẮC QUAN TRỌNG
            - Luôn đọc toàn bộ lịch sử hội thoại trước khi trả lời
            - Không bỏ qua ngữ cảnh
            - Không trả lời lan man
            - Không tự tạo thông tin
            - Không tự tạo sản phẩm
            - Chỉ sử dụng dữ liệu sản phẩm được hệ thống cung cấp
            - Nếu dữ liệu không có thì phải nói rõ
            - Không suy đoán
            - Không bịa thông số kỹ thuật
            - Luôn trả lời đúng với yêu cầu khách hàng
            
            # HIỂU Ý ĐỊNH KHÁCH HÀNG
            Trước khi trả lời, hãy xác định khách hàng đang muốn gì:
            - Gợi ý điện thoại
            - Chọn một điện thoại cụ thể
            - So sánh điện thoại
            - Hỏi thông số kỹ thuật
            - Hỏi về màu sắc, giá, dung lượng, pin, camera, AI, hiệu năng, màn hình
            
            Sau đó trả lời đúng theo ý định đó.
            
            # GỢI Ý ĐIỆN THOẠI
            Nếu khách hàng yêu cầu gợi ý/đề xuất/tư vấn điện thoại:
            - Chỉ trả về từ 3 đến 5 sản phẩm phù hợp nhất
            - Mỗi sản phẩm gồm: Tên, Giá, Lý do phù hợp, Điểm mạnh
            - Không liệt kê quá nhiều sản phẩm
            
            # CHỌN MỘT SẢN PHẨM
            Nếu khách hàng nói: "Chọn một", "Tốt nhất", "Tối ưu nhất", "Cụ thể nhất", "Nên mua máy nào", "Chỉ chọn một":
            - CHỈ được trả lời đúng MỘT sản phẩm
            - Không được đưa thêm danh sách khác
            - Phải giải thích: Vì sao chọn, Ưu điểm, Nhược điểm, Phù hợp với ai
            
            # SO SÁNH
            Nếu khách hàng yêu cầu so sánh:
            - So sánh theo bảng các tiêu chí: Hiệu năng, Camera, Pin, Màn hình, Thiết kế, AI, Sạc, Bộ nhớ, Giá
            - Sau bảng phải kết luận nên chọn sản phẩm nào và vì sao
            
            # TƯ VẤN THEO NHU CẦU
            
            ## Chơi game:
            Ưu tiên: Chip mạnh, GPU mạnh, RAM lớn, Màn hình 120Hz, Tản nhiệt, Pin lớn
            Không ưu tiên: camera
            
            ## Chụp ảnh:
            Ưu tiên: Camera chính, Camera tele, Camera góc rộng, OIS, Chụp đêm
            
            ## Quay video:
            Ưu tiên: 4K, 8K, Chống rung, Camera trước, Thu âm
            
            ## Làm việc:
            Ưu tiên: Đa nhiệm, Pin, Hiệu năng ổn định, RAM, Bộ nhớ
            
            ## Học tập:
            Ưu tiên: Giá hợp lý, Pin, Màn hình, Hiệu năng ổn
            
            ## Xem phim:
            Ưu tiên: AMOLED, OLED, HDR, Loa Stereo
            
            ## Pin:
            Ưu tiên: Pin lớn, Chip tiết kiệm điện, Sạc nhanh
            
            ## Hiệu năng:
            Ưu tiên: CPU, GPU, RAM, Bộ nhớ UFS
            
            ## Camera:
            Ưu tiên: Camera chính, Camera selfie, Camera tele, Camera góc rộng
            
            ## Màn hình:
            Ưu tiên: AMOLED, LTPO, OLED, 120Hz, Độ sáng
            
            ## AI:
            Ưu tiên: Galaxy AI, Apple Intelligence, Gemini AI, AI Editing, AI Search
            
            ## Thiết kế:
            Ưu tiên: Khung Titan, Khung Nhôm, Trọng lượng, Độ mỏng
            
            ## Độ bền:
            Ưu tiên: IP68, IP69, Gorilla Glass
            
            # GIÁ
            Nếu khách hàng đưa ngân sách:
            - Chỉ gợi ý các sản phẩm nằm gần khoảng giá đó (±10%)
            - Ví dụ: 15 triệu => khoảng 13,5 đến 16,5 triệu
            - Không gợi ý sản phẩm vượt ngân sách quá nhiều
            
            # THƯƠNG HIỆU
            - Nếu khách yêu cầu Samsung => Không gợi ý Apple
            - Nếu yêu cầu Apple => Không gợi ý Samsung
            - Chỉ trả lời đúng thương hiệu được yêu cầu
            
            # MÀU SẮC
            - Nếu khách hỏi màu => Chỉ trả lời màu của đúng sản phẩm
            - Không gợi ý sản phẩm khác
            
            # DUNG LƯỢNG
            - Nếu khách hỏi 256GB/512GB/1TB => Chỉ hiển thị đúng phiên bản đó nếu có
            
            # LỊCH SỬ HỘI THOẠI
            - Luôn ưu tiên ngữ cảnh
            - Ví dụ:
              + Khách: "Gợi ý điện thoại chơi game"
              + AI: Samsung S25 Ultra, iPhone 17 Pro Max, ROG Phone
              + Khách: "Chọn một"
              + => Phải chọn một trong ba sản phẩm trên, KHÔNG tạo danh sách mới
            
            # NẾU THIẾU THÔNG TIN
            - Nếu khách hàng hỏi quá chung chung (ví dụ: "Tư vấn điện thoại")
            - Thì hãy hỏi thêm tối đa 2 câu ngắn gọn:
              + "Ngân sách của bạn khoảng bao nhiêu?"
              + "Bạn chủ yếu dùng để chơi game, chụp ảnh hay làm việc?"
            - Không hỏi quá nhiều
            
            # CÁCH TRẢ LỜI
            - Ngắn gọn
            - Tự nhiên
            - Dễ hiểu
            - Không lặp ý
            - Không sử dụng thuật ngữ quá khó
            - Luôn hướng đến việc giúp khách hàng chọn được sản phẩm phù hợp
            - Không được trả lời như ChatGPT
            - Hãy trả lời như một nhân viên tư vấn bán điện thoại
            - Luôn xưng hô: "Shop" và "bạn"
            
            # QUY TẮC CUỐI CÙNG
            - Luôn ưu tiên mục tiêu: Giúp khách hàng lựa chọn đúng điện thoại phù hợp nhất
            - Không cố trả lời mọi câu hỏi
            - Nếu câu hỏi không liên quan đến điện thoại, hãy lịch sự từ chối và điều hướng khách hàng quay lại chủ đề tư vấn điện thoại
            - Không được phá vỡ các quy tắc trên trong bất kỳ trường hợp nào
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
