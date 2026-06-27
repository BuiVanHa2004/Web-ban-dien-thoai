package com.webbanhang.shop.Service.AI;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.webbanhang.shop.DTO.AI.AiResponse;
import com.webbanhang.shop.Model.AI.ChatMessage;
import com.webbanhang.shop.Model.AI.ChatSession;
import com.webbanhang.shop.Model.Products.Product;
import com.webbanhang.shop.Model.Products.ProductSpec;
import com.webbanhang.shop.Repository.AI.ChatMessageRepository;
import com.webbanhang.shop.Repository.AI.ChatSessionRepository;
import com.webbanhang.shop.Repository.Products.ProductRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class AiAdvisorService {

    private final ProductRepository productRepository;
    private final AiChatService aiChatService;
    private final ChatSessionRepository chatSessionRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final ObjectMapper objectMapper;
    private final ObjectMapper localObjectMapper;

    public AiAdvisorService(
            ProductRepository productRepository,
            AiChatService aiChatService,
            ChatSessionRepository chatSessionRepository,
            ChatMessageRepository chatMessageRepository,
            ObjectMapper objectMapper
    ) {
        this.productRepository = productRepository;
        this.aiChatService = aiChatService;
        this.chatSessionRepository = chatSessionRepository;
        this.chatMessageRepository = chatMessageRepository;
        this.objectMapper = objectMapper;
        this.localObjectMapper = objectMapper.copy()
                .configure(com.fasterxml.jackson.core.JsonParser.Feature.ALLOW_UNQUOTED_CONTROL_CHARS, true);
    }

    private static final String OFF_TOPIC_REDIRECT_ANSWER =
            "Shop chỉ hỗ trợ tư vấn mua bán điện thoại, nên Shop không trả lời câu hỏi ngoài chủ đề này. "
                    + "Bạn cho Shop biết nhu cầu (tầm giá, hãng, pin, camera, chơi game...) để Shop gợi ý máy phù hợp nhé!\n\n"
                    + "Dưới đây là 5 sản phẩm nổi bật tại MyPhone Store:";

    /**
     * Class lưu thông tin kiểm tra sản phẩm có trong shop không
     */
    private static class ProductAvailabilityCheck {
        List<String> requestedProducts = new ArrayList<>();
        List<String> unavailableProducts = new ArrayList<>();
        boolean isComparisonQuery = false;
        boolean isPurchaseQuery = false;

        boolean hasUnavailableProducts() {
            return !unavailableProducts.isEmpty();
        }

        boolean allProductsUnavailable() {
            return !requestedProducts.isEmpty() && requestedProducts.size() == unavailableProducts.size();
        }
    }

    public AiResponse advise(String message, Integer topK, Integer userId, String guestSessionId, Long sessionId, String ip) {
        if (message == null || message.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Vui lòng nhập nhu cầu (message).");
        }

        // ✅ Bước 1: Lấy hoặc tạo chat session
        ChatSession session = getOrCreateSession(userId, guestSessionId, sessionId);
        
        // ✅ Kiểm tra nếu là guest (chưa đăng nhập)
        boolean isGuest = (userId == null);
        
        // ✅ Nếu là guest, kiểm tra số lượng tin nhắn đã gửi trong session này
        if (isGuest && sessionId != null) {
            long messageCount = chatMessageRepository.countBySessionIdAndRole(session.getId(), "user");
            if (messageCount >= 1) {
                throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN, 
                    "Bạn đã hết lượt hỏi. Vui lòng đăng nhập để tiếp tục tư vấn và nhận gợi ý cá nhân hóa."
                );
            }
        }
        
        // ✅ Bước 2: Lưu tin nhắn của user vào database
        ChatMessage userMsg = new ChatMessage();
        userMsg.setSessionId(session.getId());
        userMsg.setUserId(userId);
        userMsg.setRole("user");
        userMsg.setContent(message);
        userMsg.setCreatedAt(Instant.now());
        ChatMessage savedUserMsg = chatMessageRepository.save(userMsg);
        System.out.println("✅ [AI Advisor] Saved user message ID: " + savedUserMsg.getId() + " to ai_chat_messages");

        String userMessage = normalizeUserMessage(message);
        
        // Phát hiện màu sắc trong câu hỏi
        String requestedColor = detectColor(userMessage);
        if (requestedColor != null) {
            System.out.println("🎨 DEBUG: Detected color request: " + requestedColor);
        }
        
        // Phát hiện số lượng sản phẩm yêu cầu từ message
        Integer detectedCount = detectProductCount(userMessage);
        int k = detectedCount != null ? detectedCount : ((topK == null || topK <= 0) ? 5 : Math.min(topK, 10));

        if (!isPhoneRelated(userMessage)) {
            List<Product> allProducts = productRepository.findAllVisibleWithGraph();
            List<Integer> topProductIds = pickBestShopProducts(allProducts, k).stream()
                    .map(Product::getProductId)
                    .filter(Objects::nonNull)
                    .distinct()
                    .limit(k)
                    .toList();
            return new AiResponse(OFF_TOPIC_REDIRECT_ANSWER, topProductIds, List.of(), session.getId());
        }

        List<Product> products = productRepository.findAllVisibleWithGraph();

        // ✅ BƯỚC MỚI: Phát hiện sản phẩm cụ thể không có trong shop
        ProductAvailabilityCheck availabilityCheck = checkProductAvailability(userMessage, products);
        if (availabilityCheck.hasUnavailableProducts()) {
            return handleUnavailableProducts(availabilityCheck, products, k, session.getId());
        }

        // Phát hiện câu hỏi so sánh 2 hãng
        BrandComparisonQuery brandComparison = detectBrandComparison(userMessage);
        if (brandComparison != null) {
            AiResponse brandComparisonResult = handleBrandComparison(brandComparison, products, userMessage);
            if (brandComparisonResult != null) {
                return brandComparisonResult;
            }
            // Nếu không đủ sản phẩm để so sánh, tiếp tục xử lý thông thường
        }

        boolean wantsIphone = wantsIphoneOnly(userMessage);
        if (wantsIphone) {
            products = products.stream().filter(this::isIphoneProduct).toList();
        }
        
        // ✅ LỌC THEO MÀU NẾU KHÁCH YÊU CẦU
        if (requestedColor != null) {
            final String color = requestedColor;
            int beforeFilter = products.size();
            products = products.stream()
                    .filter(p -> productHasColor(p, color))
                    .toList();
            System.out.println("🎨 DEBUG: Filtered products by color '" + color + "': " + beforeFilter + " → " + products.size());
            
            // Nếu không tìm thấy sản phẩm nào có màu đó
            if (products.isEmpty()) {
                return new AiResponse(
                    "Rất tiếc, Shop hiện không có sản phẩm màu " + color + ". Bạn có thể xem các màu khác hoặc cho Shop biết nhu cầu để Shop gợi ý sản phẩm phù hợp nhé! 🎨",
                    List.of(),
                    List.of(),
                    session.getId()
                );
            }
        }

        List<Product> sample = pickRelevantProducts(products, userMessage, 40);

        String systemPrompt = "# VAI TRÒ\n"
                + "Bạn là AI tư vấn bán điện thoại chuyên nghiệp của MyPhone Store với kiến thức chuyên sâu về phần cứng.\n"
                + "Nhiệm vụ của bạn là giúp khách hàng lựa chọn điện thoại phù hợp nhất dựa trên dữ liệu sản phẩm được cung cấp.\n"
                + "\n# PHẠM VI HOẠT ĐỘNG\n"
                + "CHỈ TƯ VẤN điện thoại có trong danh sách cung cấp.\n"
                + "KHÔNG trả lời câu hỏi ngoài lề (thời tiết, bóng đá, chính trị, sức khỏe, phim nhạc, lập trình, v.v.).\n"
                + "Nếu câu hỏi không liên quan điện thoại, từ chối lịch sự: 'Tôi là AI tư vấn điện thoại của website nên chỉ có thể hỗ trợ các câu hỏi liên quan đến việc lựa chọn, so sánh và tư vấn điện thoại. Nếu bạn đang muốn tìm một chiếc điện thoại phù hợp, hãy cho tôi biết nhu cầu hoặc ngân sách của bạn.'\n"
                + "\n# NGUYÊN TẮC QUAN TRỌNG\n"
                + "- CHỈ dùng sản phẩm trong danh sách. KHÔNG bịa thông tin hay productId.\n"
                + "- Mỗi sản phẩm có status (CÒN_HÀNG/HẾT_HÀNG). Ưu tiên CÒN_HÀNG. Nếu gợi ý HẾT_HÀNG phải nói rõ 'tạm hết hàng'.\n"
                + "- ⚠️ **MÀU SẮC:** Mỗi sản phẩm có thông tin `colors=...` liệt kê các màu có sẵn. CHỈ gợi ý sản phẩm có đúng màu khách yêu cầu. KHÔNG bịa màu không có trong danh sách.\n"
                + "- Luôn đọc toàn bộ ngữ cảnh và lịch sử hội thoại trước khi trả lời.\n"
                + "- Không bỏ qua ngữ cảnh. Không trả lời lan man. Không suy đoán.\n"
                + (wantsIphone ? "- Người dùng YÊU CẦU iPhone/Apple → CHỈ gợi ý iPhone/Apple, KHÔNG đề xuất hãng khác.\n" : "")
                + (requestedColor != null ? "- ⚠️ KHÁCH YÊU CẦU MÀU " + requestedColor.toUpperCase() + " → CHỈ gợi ý sản phẩm có màu " + requestedColor + " trong danh sách colors. KIỂM TRA KỸ trước khi gợi ý!\n" : "")
                + "\n# FORMAT TRÍCH DẪN SẢN PHẨM\n"
                + "BẮT BUỘC: Khi nhắc tên sản phẩm, PHẢI dùng markdown link: [Tên sản phẩm](/product/productId)\n"
                + "Ví dụ: [iPhone 14 Pro Max](/product/123) thay vì chỉ iPhone 14 Pro Max.\n"
                + "\n# GỢI Ý ĐIỆN THOẠI\n"
                + "Nếu khách hàng yêu cầu gợi ý/đề xuất:\n"
                + "- Chỉ trả về từ 3 đến 5 sản phẩm phù hợp nhất\n"
                + "- Mỗi sản phẩm gồm: Tên (có link), Giá, Lý do phù hợp, Điểm mạnh\n"
                + "- Không liệt kê quá nhiều sản phẩm\n"
                + "\n# CHỌN MỘT SẢN PHẨM\n"
                + "Nếu khách hàng nói: 'Chọn một', 'Tốt nhất', 'Nên mua máy nào', 'Chỉ chọn một':\n"
                + "- CHỈ được trả lời đúng MỘT sản phẩm\n"
                + "- Không được đưa thêm danh sách khác\n"
                + "- Phải giải thích: Vì sao chọn, Ưu điểm, Nhược điểm, Phù hợp với ai\n"
                + "\n# XỬ LÝ CÂU HỎI SO SÁNH\n"
                + "Nếu user hỏi SO SÁNH (ví dụ: 'so sánh camera Samsung vs iPhone', 'iPhone hay Samsung tốt hơn'):\n"
                + "1. Chọn sản phẩm ĐẠI DIỆN tốt nhất của mỗi hãng\n"
                + "2. So sánh ngắn gọn khía cạnh user quan tâm (camera, hiệu năng, pin, hoặc chung)\n"
                + "3. KẾT LUẬN RÕ RÀNG: Sản phẩm nào tốt hơn và tại sao\n"
                + "4. Format cực kỳ ngắn gọn, dễ đọc với emoji và bullet points\n"
                + "\nVí dụ câu trả lời SO SÁNH TỐT:\n"
                + "📸 **So sánh camera:**\n"
                + "• [Samsung Galaxy S25 Ultra](/product/X): 200MP, zoom 100x 🔭\n"
                + "• [iPhone 17 Pro Max](/product/Y): 48MP, xử lý đêm tốt 🌙\n"
                + "✅ Chọn Samsung để zoom xa, chọn iPhone để chụp đêm đẹp tự nhiên.\n"
                + "\n# CÁCH TRẢ LỜI\n"
                + "- Ngắn gọn, tự nhiên, dễ hiểu, không lặp ý\n"
                + "- Không sử dụng thuật ngữ quá khó\n"
                + "- Trả lời như nhân viên tư vấn, không như ChatGPT\n"
                + "- Luôn xưng hô: 'Shop' và 'bạn'\n"
                + "\n# BẮT BUỘC CHỈ PHẢN HỒI JSON\n"
                + "Bạn CHỈ ĐƯỢC PHÉP trả về một đối tượng JSON hợp lệ duy nhất, tuyệt đối không viết thêm lời dẫn, không bọc trong ký tự markdown như ```json.\n"
                + "Đối tượng JSON có cấu trúc chính xác như sau:\n"
                + "{\n"
                + "  \"answer\": \"Nội dung câu trả lời tư vấn bằng tiếng Việt ở đây. Câu trả lời phải cực kỳ NGẮN GỌN và cô đọng (dưới 60 từ cho câu thường, dưới 100 từ cho câu so sánh). Sử dụng emoji và markdown bold/link phù hợp. BẮT BUỘC: Nếu cần xuống dòng trong câu trả lời, hãy sử dụng chuỗi '\\\\n' (hai ký tự là dấu gạch chéo ngược và chữ n) thay vì ký tự xuống dòng thực tế để tránh làm hỏng định dạng JSON.\",\n"
                + "  \"recommendedProductIds\": [id_sản_phẩm_được_gợi_ý]\n"
                + "}";

        String userPrompt = "# YÊU CẦU TƯ VẤN\n"
                + "Nhu cầu của khách hàng: " + userMessage + "\n\n"
                + "# DANH SÁCH SẢN PHẨM TRONG SHOP\n"
                + "(CHỈ dùng productId này, CHÚ Ý status - ưu tiên CÒN_HÀNG)\n"
                + buildCompactProductContext(sample)
                + "\n\n# NHIỆM VỤ CỦA BẠN\n"
                + "🎯 1. ĐỌC KỸ thông số THỰC TẾ của từng sản phẩm\n"
                + "🎯 2. ⚠️ **QUAN TRỌNG:** Khách hàng yêu cầu " + k + " sản phẩm → BẮT BUỘC chỉ trả về ĐÚNG " + k + " sản phẩm, KHÔNG ĐƯỢC nhiều hơn hoặc ít hơn\n"
                + "🎯 3. GIẢI THÍCH cực kỳ ngắn gọn (1 câu ngắn cho mỗi sản phẩm) tại sao phù hợp:\n"
                + "   - Nêu THÔNG SỐ THỰC TẾ ngắn gọn\n"
                + "   - Ưu tiên sản phẩm CÒN_HÀNG\n"
                + "   - Nếu gợi ý sản phẩm HẾT_HÀNG phải nói rõ 'tạm hết hàng'\n"
                + "\n# PHONG CÁCH TRẢ LỜI\n"
                + "💬 Thân thiện, tự nhiên nhưng Cực kỳ ngắn gọn và súc tích (dưới 60 từ cho câu thường, dưới 100 từ cho so sánh)\n"
                + "💬 Dùng emoji phù hợp (🔥💪⚡🎮📸💰)\n"
                + "💬 CHỈ nhắc TÊN sản phẩm với link [Tên](/product/ID), KHÔNG nhắc productId\n"
                + "💬 Luôn xưng hô: 'Shop' và 'bạn'\n"
                + (k == 1 ? "\n# ⚠️ ĐẶC BIỆT: KHÁCH YÊU CẦU 1 SẢN PHẨM DUY NHẤT\n"
                    + "- CHỈ được trả về MỘT sản phẩm duy nhất\n"
                    + "- KHÔNG được đưa ra danh sách nhiều sản phẩm\n"
                    + "- Giải thích: Vì sao chọn, Ưu điểm, Nhược điểm (nếu có), Phù hợp với ai\n"
                    + "- Format: Giới thiệu 1 sản phẩm chi tiết thay vì liệt kê danh sách\n\n" : "")
                + "\n# XỬ LÝ CÂU HỎI 'CHỌN MỘT'\n"
                + "⚠️ Nếu đây là câu hỏi tiếp theo yêu cầu 'chọn một' từ danh sách đã gợi ý trước đó:\n"
                + "   - CHỈ chọn MỘT sản phẩm duy nhất từ danh sách đó\n"
                + "   - KHÔNG tạo danh sách mới\n"
                + "   - Giải thích: Vì sao chọn, Ưu điểm, Nhược điểm, Phù hợp với ai\n"
                + "\n# BẮT BUỘC CHỈ TRẢ VỀ ĐỐI TƯỢNG JSON\n"
                + "Theo schema sau (không thêm bất kỳ văn bản nào khác ngoài JSON):\n"
                + "{\n"
                + "  \"answer\": \"Nội dung câu trả lời cực kỳ NGẮN GỌN (dưới 60 từ cho câu thường, dưới 100 từ cho so sánh), thân thiện, có emoji và markdown link. Sử dụng chuỗi '\\\\n' để xuống dòng.\",\n"
                + "  \"recommendedProductIds\": [ĐÚNG " + k + " id sản phẩm - KHÔNG ĐƯỢC nhiều hơn hoặc ít hơn]\n"
                + "}";

        String raw = aiChatService.chat(systemPrompt, userPrompt);
        Parsed parsed = parseJsonResponse(raw);
        
        // ✅ Bước 3: Lưu tin nhắn AI response vào database
        String aiAnswer = parsed.answer == null || parsed.answer.isBlank() ? raw : parsed.answer;
        ChatMessage assistantMsg = new ChatMessage();
        assistantMsg.setSessionId(session.getId());
        assistantMsg.setUserId(userId);
        assistantMsg.setRole("assistant");
        assistantMsg.setContent(aiAnswer);
        assistantMsg.setCreatedAt(Instant.now());
        ChatMessage savedAssistant = chatMessageRepository.save(assistantMsg);
        System.out.println("✅ [AI Advisor] Saved assistant message ID: " + savedAssistant.getId() + " to ai_chat_messages");

        List<Integer> allowIds = sample.stream().map(Product::getProductId).filter(Objects::nonNull).toList();
        Set<Integer> allowSet = new HashSet<>(allowIds);

        List<Integer> rec = parsed.recommendedProductIds == null ? List.of() : parsed.recommendedProductIds.stream()
                .filter(Objects::nonNull)
                .filter(allowSet::contains)
                .distinct()
                .limit(k)
                .toList();

        if (wantsIphone && !rec.isEmpty()) {
            Set<Integer> iphoneAllow = sample.stream()
                    .filter(this::isIphoneProduct)
                    .map(Product::getProductId)
                    .filter(Objects::nonNull)
                    .collect(Collectors.toSet());
            rec = rec.stream().filter(iphoneAllow::contains).toList();
        }

        String answer = parsed.answer == null || parsed.answer.isBlank() ? raw : parsed.answer;
        if (answer.contains("```json")) {
            int idx = answer.indexOf("```json");
            String preText = answer.substring(0, idx).trim();
            if (!preText.isBlank()) {
                answer = preText;
            } else {
                answer = tryExtractAnswerFromRaw(answer);
            }
        } else if (answer.contains("{\"answer\"") || answer.contains("{\n  \"answer\"")) {
            answer = tryExtractAnswerFromRaw(answer);
        }

        String cleanedAnswer = answer
                .replaceAll("(?i)\\(\\s*product\\s*id\\s*=\\s*\\d+\\s*\\)", "")
                .replaceAll("(?i)product\\s*id\\s*=\\s*\\d+", "")
                .replaceAll("[ \\t]{2,}", " ")
                .trim();

        return new AiResponse(
                cleanedAnswer,
                rec,
                List.of(),
                session.getId()
        );
    }

    public AiResponse compare(List<Integer> productIds, String question) {
        if (productIds == null || productIds.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Vui lòng cung cấp productIds để so sánh.");
        }

        List<Integer> ids = productIds.stream().filter(Objects::nonNull).distinct().limit(5).toList();
        List<Product> products = productRepository.findAllActiveByProductIdInWithGraph(ids);
        if (products.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy sản phẩm để so sánh.");
        }

        int productCount = products.size();
        
        String systemPrompt = "# VAI TRÒ\n"
                + "Bạn là AI tư vấn bán điện thoại chuyên nghiệp của MyPhone Store với kiến thức chuyên sâu về điện thoại thông minh.\n"
                + "Nhiệm vụ của bạn là SO SÁNH " + productCount + " sản phẩm điện thoại mà khách hàng đã chọn và giúp khách hàng đưa ra quyết định mua hàng.\n"
                + "\n# PHẠM VI HOẠT ĐỘNG\n"
                + "- Chỉ sử dụng dữ liệu sản phẩm được hệ thống cung cấp\n"
                + "- Không tự tạo thông số\n"
                + "- Không sử dụng kiến thức ngoài dữ liệu\n"
                + "- Không tự thêm hoặc bỏ sản phẩm\n"
                + "- Không suy đoán\n"
                + "- Nếu thiếu dữ liệu của một tiêu chí hãy ghi: 'Chưa có dữ liệu để đánh giá.'\n"
                + "\n# NGUYÊN TẮC\n"
                + "- Luôn đọc câu hỏi của khách hàng trước\n"
                + "- Nếu khách có nêu nhu cầu (chơi game, chụp ảnh, pin, AI, làm việc...) thì ưu tiên phân tích các tiêu chí liên quan\n"
                + "- Không trả lời lan man\n"
                + "- Không lặp ý\n"
                + "- Không thiên vị thương hiệu\n"
                + "- Chỉ so sánh đúng các sản phẩm được cung cấp\n"
                + "\n# FORMAT SO SÁNH\n"
                + "Đối với MỖI tiêu chí, thực hiện theo đúng format sau:\n"
                + "\n**[Icon] [Tên tiêu chí]:**\n"
                + "- **[Tên SP1](/product/ID1)**: Thông số chính. Điểm: X/10\n"
                + "- **[Tên SP2](/product/ID2)**: Thông số chính. Điểm: Y/10\n"
                + "➡️ *Kết luận:* Viết đúng MỘT câu. Nêu rõ sản phẩm nào nổi bật nhất.\n"
                + "\n# ICON CHO MỖI TIÊU CHÍ\n"
                + "BẮT BUỘC sử dụng đúng icon sau:\n"
                + "- 💰 Giá bán & Biến thể\n"
                + "- 🎮 Hiệu năng & Chip\n"
                + "- 📸 Camera\n"
                + "- 🔋 Pin & Sạc\n"
                + "- 📱 Màn hình\n"
                + "- 🏆 Tổng kết\n"
                + "\n# VÍ DỤ FORMAT ĐÚNG\n"
                + "**📸 Camera:**\n"
                + "- **[iPhone 17 Pro Max](/product/1)**: 48MP + 48MP + 48MP. Điểm: 8/10\n"
                + "- **[Samsung Galaxy S25 Ultra](/product/2)**: 200MP + 50MP + 50MP + 10MP. Điểm: 9/10\n"
                + "➡️ *Kết luận:* Samsung Galaxy S25 Ultra có hệ thống camera tốt nhất.\n"
                + "\n# QUY TẮC CHẤM ĐIỂM\n"
                + "- Thang điểm từ 0 đến 10\n"
                + "- Không cho tất cả sản phẩm cùng điểm\n"
                + "- Điểm phải phản ánh đúng dữ liệu thực tế\n"
                + "- Không chấm điểm ngẫu nhiên\n"
                + "- Nếu thông số tương đương thì điểm có thể gần nhau\n"
                + "\n# ĐIỂM TỔNG THỂ\n"
                + "Đánh giá điểm tổng thể của từng sản phẩm.\n"
                + "Nếu khách hàng có nhu cầu cụ thể thì ưu tiên các tiêu chí liên quan khi tính điểm.\n"
                + "\n**BẮT BUỘC mỗi sản phẩm PHẢI xuống dòng riêng. VÍ DỤ:**\n"
                + "\n🥇 [Tên SP1](/product/ID1): 9.82/10\n\n"
                + "🥈 [Tên SP2](/product/ID2): 9.70/10\n\n"
                + "🥉 [Tên SP3](/product/ID3): 9.55/10\n"
                + "\n**CHÚ Ý:** Sử dụng '\\\\n\\\\n' (double newline) sau mỗi sản phẩm để xuống dòng.\n"
                + "Điểm tổng thể phải phản ánh kết quả đánh giá của tất cả tiêu chí.\n"
                + "\n# KẾT LUẬN CUỐI CÙNG\n"
                + "Bắt buộc chọn DUY NHẤT MỘT sản phẩm đáng mua nhất theo đúng định dạng:\n"
                + "🏆 **Shop khuyến nghị:** [Tên sản phẩm](/product/ID)\n"
                + "⭐ **Điểm tổng thể:** X/10\n"
                + "**Lý do:** ...\n"
                + "**Phù hợp với:** ...\n"
                + "\nKhông được trả lời: 'Cả hai đều tốt', 'Tùy nhu cầu', 'Khó lựa chọn', 'Máy nào cũng ổn'.\n"
                + "Luôn đưa ra DUY NHẤT MỘT lựa chọn cuối cùng.\n"
                + "\n# QUY TẮC TRÌNH BÀY\n"
                + "- Ngắn gọn, dễ đọc, dễ hiểu\n"
                + "- Không lặp ý\n"
                + "- Không quá 450 từ\n"
                + "- Mỗi tiêu chí chỉ 3–6 dòng\n"
                + "- Mỗi tiêu chí chỉ có MỘT câu kết luận\n"
                + "- Luôn dùng Markdown Link: [Tên sản phẩm](/product/ID)\n"
                + "- Sử dụng '\\\\n\\\\n' để ngăn cách các phần\n"
                + "- Luôn xưng hô: 'Shop' và 'bạn'\n"
                + "- BẮT BUỘC xuống dòng sau tên tiêu chí (có dấu :)\n"
                + "- BẮT BUỘC mỗi sản phẩm một dòng riêng (bắt đầu bằng -)\n"
                + "\n# ĐỊNH DẠNG JSON\n"
                + "Chỉ trả về đúng JSON: {\"answer\": string, \"comparedProductIds\": number[]}\n"
                + "Không thêm bất kỳ nội dung nào ngoài JSON.";

        // Build detailed product context
        StringBuilder productContext = new StringBuilder();
        for (Product p : products) {
            productContext.append("\n--- SẢN PHẨM ---\n");
            productContext.append("ProductID: ").append(p.getProductId()).append("\n");
            productContext.append("Tên: ").append(safe(p.getProductName())).append("\n");
            if (p.getBrand() != null) productContext.append("Hãng: ").append(safe(p.getBrand().getBrandName())).append("\n");
            
            // Price with variants
            if (p.getProductColors() != null && !p.getProductColors().isEmpty()) {
                productContext.append("Giá và biến thể:\n");
                for (var color : p.getProductColors()) {
                    if (color.getVariants() != null) {
                        for (var variant : color.getVariants()) {
                            productContext.append("  - Màu ").append(safe(color.getColorName()))
                                .append(", RAM ").append(variant.getRamGb() != null ? variant.getRamGb() : "?").append("GB")
                                .append(", Bộ nhớ ").append(variant.getStorageGb() != null ? variant.getStorageGb() : "?").append("GB")
                                .append(": ").append(variant.getFinalPrice() != null ? variant.getFinalPrice() : "0").append("đ\n");
                        }
                    }
                }
            }
            
            // Specs
            if (p.getProductSpecs() != null && !p.getProductSpecs().isEmpty()) {
                ProductSpec spec = p.getProductSpecs().iterator().next();
                productContext.append("Thông số:\n");
                if (spec.getChip() != null) productContext.append("  Chip: ").append(spec.getChip()).append("\n");
                if (spec.getScreen() != null) productContext.append("  Màn hình: ").append(spec.getScreen()).append("\n");
                if (spec.getRefreshRate() != null) productContext.append("  Tần số quét: ").append(spec.getRefreshRate()).append("\n");
                if (spec.getBattery() != null) productContext.append("  Pin: ").append(spec.getBattery()).append("\n");
                if (spec.getFastCharge() != null) productContext.append("  Sạc nhanh: ").append(spec.getFastCharge()).append("\n");
                if (spec.getCameraRear() != null) productContext.append("  Camera sau: ").append(spec.getCameraRear()).append("\n");
                if (spec.getCameraFront() != null) productContext.append("  Camera trước: ").append(spec.getCameraFront()).append("\n");
                if (spec.getOperatingSystem() != null) productContext.append("  Hệ điều hành: ").append(spec.getOperatingSystem()).append("\n");
                if (spec.getSupport5g() != null) productContext.append("  5G: ").append(spec.getSupport5g() ? "Có" : "Không").append("\n");
                if (spec.getNfc() != null) productContext.append("  NFC: ").append(spec.getNfc() ? "Có" : "Không").append("\n");
            }
        }

        String userPrompt = "# YÊU CẦU SO SÁNH\n"
                + (question != null && !question.isBlank() ? "Câu hỏi của khách hàng: " + question.trim() + "\n\n" : "")
                + "# DANH SÁCH SẢN PHẨM CẦN SO SÁNH\n"
                + productContext.toString()
                + "\n\n# NHIỆM VỤ CỦA BẠN\n"
                + "🎯 **Bước 1:** So sánh chi tiết từng tiêu chí (Giá, Hiệu năng & Chip, Camera, Pin & Sạc, Màn hình)\n"
                + "   - Liệt kê thông số thực tế của từng sản phẩm\n"
                + "   - Chấm điểm từ 0-10 cho mỗi sản phẩm ở mỗi tiêu chí\n"
                + "   - Kết luận 1 câu duy nhất về sản phẩm nào tốt hơn ở tiêu chí đó\n"
                + "\n🎯 **Bước 2:** Tính điểm tổng thể\n"
                + "   - Đánh giá điểm tổng thể của từng sản phẩm (VD: 🥇 9.82/10, 🥈 9.70/10, 🥉 9.55/10)\n"
                + "   - Nếu khách hàng có nêu nhu cầu cụ thể, ưu tiên tiêu chí liên quan khi tính điểm\n"
                + "\n🎯 **Bước 3:** Kết luận cuối cùng\n"
                + "   - BẮT BUỘC chọn DUY NHẤT MỘT sản phẩm đáng mua nhất\n"
                + "   - Format: 🏆 **Shop khuyến nghị:** [Tên SP](/product/ID)\n"
                + "   - Giải thích lý do và phù hợp với ai\n"
                + "   - KHÔNG ĐƯỢC trả lời mơ hồ như 'cả hai đều tốt', 'tùy nhu cầu'\n"
                + "\n# PHONG CÁCH TRẢ LỜI\n"
                + "💬 Câu trả lời trong 'answer' phải dưới 450 từ\n"
                + "💬 Mỗi tiêu chí chỉ 3-6 dòng\n"
                + "💬 Mỗi tiêu chí chỉ có MỘT câu kết luận\n"
                + "💬 Ngắn gọn, dễ hiểu, không lặp ý\n"
                + "💬 Luôn xưng hô: 'Shop' và 'bạn'\n"
                + "\n# BẮT BUỘC CHỈ TRẢ VỀ ĐỐI TƯỢNG JSON\n"
                + "{\"answer\": string, \"comparedProductIds\": number[]}\n"
                + "Sử dụng chuỗi '\\\\n\\\\n' để phân tách các phần và '\\\\n' để phân dòng.";

        String raw = aiChatService.chat(systemPrompt, userPrompt);
        Parsed parsed = parseJsonResponse(raw);

        List<Integer> compared = parsed.comparedProductIds == null ? ids : parsed.comparedProductIds.stream()
                .filter(Objects::nonNull)
                .filter(ids::contains)
                .distinct()
                .toList();

        String answer = parsed.answer == null || parsed.answer.isBlank() ? raw : parsed.answer;
        if (answer.contains("```json")) {
            int idx = answer.indexOf("```json");
            String preText = answer.substring(0, idx).trim();
            if (!preText.isBlank()) {
                answer = preText;
            } else {
                answer = tryExtractAnswerFromRaw(answer);
            }
        } else if (answer.contains("{\"answer\"") || answer.contains("{\n  \"answer\"")) {
            answer = tryExtractAnswerFromRaw(answer);
        }

        String cleanedAnswer = answer
                .replaceAll("(?i)\\(\\s*product\\s*id\\s*=\\s*\\d+\\s*\\)", "")
                .replaceAll("(?i)product\\s*id\\s*=\\s*\\d+", "")
                .replaceAll("[ \\t]{2,}", " ")
                .trim();

        return new AiResponse(
                cleanedAnswer,
                compared,
                compared,
                null  // Compare không cần session tracking
        );
    }

    // ============================================
    // HELPER METHODS
    // ============================================
    
    /**
     * Lấy hoặc tạo mới chat session
     */
    private ChatSession getOrCreateSession(Integer userId, String guestSessionId, Long sessionId) {
        // Nếu có sessionId, tìm session cũ
        if (sessionId != null) {
            if (userId != null) {
                return chatSessionRepository.findByIdAndUserId(sessionId, userId)
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Session không hợp lệ."));
            }
            return chatSessionRepository.findByIdAndGuestSessionId(sessionId, guestSessionId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Session không hợp lệ."));
        }
        
        // Tạo session mới
        ChatSession s = new ChatSession();
        s.setUserId(userId);
        s.setGuestSessionId(userId == null ? guestSessionId : null);
        s.setTitle("Tư vấn sản phẩm");
        s.setIsActive(true);
        s.setCreatedAt(Instant.now());
        s.setUpdatedAt(Instant.now());
        ChatSession saved = chatSessionRepository.save(s);
        System.out.println("✅ [AI Advisor] Created new session ID: " + saved.getId());
        return saved;
    }

    private String buildProductContext(List<Product> products) {
        return products.stream().map(p -> {
            List<String> parts = new ArrayList<>();
            parts.add("productId=" + p.getProductId());
            parts.add("name=" + safe(p.getProductName()));
            // Get min price from variants
            BigDecimal minPrice = null;
            if (p.getProductColors() != null) {
                minPrice = p.getProductColors().stream()
                        .flatMap(c -> c.getVariants() != null ? c.getVariants().stream() : java.util.stream.Stream.empty())
                        .map(v -> v.getFinalPrice())
                        .filter(price -> price != null)
                        .min(java.util.Comparator.naturalOrder())
                        .orElse(null);
            }
            if (minPrice != null) parts.add("price=" + minPrice);
            if (p.getCategory() != null && p.getCategory().getCategoryName() != null) parts.add("category=" + p.getCategory().getCategoryName());
            if (p.getProductSpecs() != null && !p.getProductSpecs().isEmpty()) {
                String specs = p.getProductSpecs().stream()
                        .map(spec -> {
                            List<String> specParts = new ArrayList<>();
                            if (spec.getVersion() != null) specParts.add("version=" + safe(spec.getVersion()));
                            if (spec.getChip() != null && !spec.getChip().isBlank()) specParts.add("chip=" + safe(spec.getChip()));
                            if (spec.getCameraFront() != null && !spec.getCameraFront().isBlank()) specParts.add("cameraFront=" + safe(spec.getCameraFront()));
                            if (spec.getCameraRear() != null && !spec.getCameraRear().isBlank()) specParts.add("cameraRear=" + safe(spec.getCameraRear()));
                            if (spec.getScreen() != null && !spec.getScreen().isBlank()) specParts.add("screen=" + safe(spec.getScreen()));
                            if (spec.getBattery() != null && !spec.getBattery().isBlank()) specParts.add("battery=" + safe(spec.getBattery()));
                            if (spec.getRefreshRate() != null && !spec.getRefreshRate().isBlank()) specParts.add("refreshRate=" + safe(spec.getRefreshRate()));
                            if (spec.getFastCharge() != null && !spec.getFastCharge().isBlank()) specParts.add("fastCharge=" + safe(spec.getFastCharge()));
                            if (spec.getSupport5g() != null) specParts.add("support5g=" + spec.getSupport5g());
                            if (spec.getNfc() != null) specParts.add("nfc=" + spec.getNfc());
                            if (spec.getOperatingSystem() != null && !spec.getOperatingSystem().isBlank()) specParts.add("os=" + safe(spec.getOperatingSystem()));
                            if (spec.getSize() != null && !spec.getSize().isBlank()) specParts.add("size=" + safe(spec.getSize()));
                            if (spec.getWeight() != null && !spec.getWeight().isBlank()) specParts.add("weight=" + safe(spec.getWeight()));
                            if (spec.getMaterial() != null && !spec.getMaterial().isBlank()) specParts.add("material=" + safe(spec.getMaterial()));
                            if (spec.getWaterResistance() != null && !spec.getWaterResistance().isBlank()) specParts.add("waterResistance=" + safe(spec.getWaterResistance()));
                            if (spec.getChargingPort() != null && !spec.getChargingPort().isBlank()) specParts.add("chargingPort=" + safe(spec.getChargingPort()));
                            if (spec.getSim() != null && !spec.getSim().isBlank()) specParts.add("sim=" + safe(spec.getSim()));
                            return specParts.isEmpty() ? "" : String.join("; ", specParts);
                        })
                        .filter(s -> !s.isBlank())
                        .collect(Collectors.joining(" | "));
                if (!specs.isBlank()) parts.add("specs=" + specs);
            }
            if (p.getProductColors() != null && !p.getProductColors().isEmpty()) {
                String variants = p.getProductColors().stream()
                        .map(c -> {
                            String color = c.getColorName() == null ? "" : safe(c.getColorName());
                            if (c.getVariants() == null || c.getVariants().isEmpty()) {
                                return color;
                            }
                            String vs = c.getVariants().stream()
                                    .map(v -> (v.getRamGb() == null ? "?" : v.getRamGb()) + "/" + (v.getStorageGb() == null ? "?" : v.getStorageGb()) + ":" + (v.getQuantity() == null ? 0 : v.getQuantity()))
                                    .collect(Collectors.joining("|"));
                            return color + "[" + vs + "]";
                        })
                        .collect(Collectors.joining("; "));
                if (!variants.isBlank()) parts.add("variants=" + variants);
            }
            return "- " + String.join(", ", parts);
        }).collect(Collectors.joining("\n"));
    }

    private String buildCompactProductContext(List<Product> products) {
        return products.stream().map(p -> {
            List<String> parts = new ArrayList<>();
            parts.add("productId=" + p.getProductId());
            parts.add("name=" + safe(p.getProductName()));

            BigDecimal minPrice = getMinPrice(p);
            if (minPrice != null) parts.add("price=" + minPrice);
            
            // Add stock status
            boolean inStock = hasSellableVariant(p);
            parts.add("status=" + (inStock ? "CÒN_HÀNG" : "HẾT_HÀNG"));
            
            if (p.getBrand() != null && p.getBrand().getBrandName() != null) parts.add("brand=" + safe(p.getBrand().getBrandName()));
            if (p.getCategory() != null && p.getCategory().getCategoryName() != null) parts.add("category=" + safe(p.getCategory().getCategoryName()));

            ProductSpec spec = null;
            if (p.getProductSpecs() != null && !p.getProductSpecs().isEmpty()) {
                spec = p.getProductSpecs().iterator().next();
            }
            if (spec != null) {
                if (spec.getChip() != null && !spec.getChip().isBlank()) parts.add("chip=" + safe(spec.getChip()));
                if (spec.getBattery() != null && !spec.getBattery().isBlank()) parts.add("battery=" + safe(spec.getBattery()));
                if (spec.getCameraRear() != null && !spec.getCameraRear().isBlank()) parts.add("cameraRear=" + safe(spec.getCameraRear()));
                if (spec.getScreen() != null && !spec.getScreen().isBlank()) parts.add("screen=" + safe(spec.getScreen()));
                if (spec.getOperatingSystem() != null && !spec.getOperatingSystem().isBlank()) parts.add("os=" + safe(spec.getOperatingSystem()));
                if (spec.getWaterResistance() != null && !spec.getWaterResistance().isBlank()) parts.add("waterProof=" + safe(spec.getWaterResistance()));
            }

            String mem = extractVariantMemorySummary(p);
            if (mem != null && !mem.isBlank()) parts.add("variants(RAM/ROM)=" + mem);

            if (p.getProductColors() != null && !p.getProductColors().isEmpty()) {
                String colors = p.getProductColors().stream()
                        .map(c -> safe(c.getColorName()))
                        .filter(c -> !c.isBlank())
                        .distinct()
                        .collect(Collectors.joining("|"));
                if (!colors.isBlank()) parts.add("colors=" + colors);
            }

            return "- " + String.join(", ", parts);
        }).collect(Collectors.joining("\n"));
    }

    private String extractVariantMemorySummary(Product p) {
        if (p.getProductColors() == null || p.getProductColors().isEmpty()) return null;
        Set<String> combos = new HashSet<>();
        p.getProductColors().forEach(c -> {
            if (c.getVariants() == null) return;
            c.getVariants().forEach(v -> {
                Integer ram = v.getRamGb();
                Integer sto = v.getStorageGb();
                if (ram == null && sto == null) return;
                combos.add((ram == null ? "?" : ram) + "/" + (sto == null ? "?" : sto));
            });
        });
        if (combos.isEmpty()) return null;
        return combos.stream().sorted().limit(6).collect(Collectors.joining("|"));
    }

    private BigDecimal getMinPrice(Product p) {
        if (p == null || p.getProductColors() == null) return null;
        return p.getProductColors().stream()
                .flatMap(c -> c.getVariants() != null ? c.getVariants().stream() : java.util.stream.Stream.empty())
                .map(v -> v.getFinalPrice())
                .filter(price -> price != null)
                .min(java.util.Comparator.naturalOrder())
                .orElse(null);
    }

    private List<Product> pickRelevantProducts(List<Product> products, String message, int limit) {
        if (products == null || products.isEmpty()) return List.of();
        int lim = Math.max(1, Math.min(limit, 80));

        String msg = message == null ? "" : message.toLowerCase();
        List<String> tokens = tokenize(msg);
        BigDecimal budget = extractBudgetVnd(msg);

        return products.stream()
                .sorted((a, b) -> Double.compare(scoreProduct(b, msg, tokens, budget), scoreProduct(a, msg, tokens, budget)))
                .limit(lim)
                .toList();
    }

    private double scoreProduct(Product p, String msg, List<String> tokens, BigDecimal budgetVnd) {
        if (p == null) return -1;
        double score = 0;

        String name = safe(p.getProductName()).toLowerCase();
        if (!name.isBlank()) {
            for (String t : tokens) {
                if (t.length() < 2) continue;
                if (name.contains(t)) score += 3;
            }
        }

        if (p.getBrand() != null && p.getBrand().getBrandName() != null) {
            String brand = safe(p.getBrand().getBrandName()).toLowerCase();
            if (!brand.isBlank() && msg.contains(brand)) score += 6;
        }

        if (p.getCategory() != null && p.getCategory().getCategoryName() != null) {
            String cat = safe(p.getCategory().getCategoryName()).toLowerCase();
            if (!cat.isBlank() && msg.contains(cat)) score += 4;
        }

        ProductSpec spec = null;
        if (p.getProductSpecs() != null && !p.getProductSpecs().isEmpty()) {
            spec = p.getProductSpecs().iterator().next();
        }
        
        boolean isGamingQuery = msg.contains("game") || msg.contains("chơi");
        
        if (spec != null) {
            // For gaming queries, exclude chip text from generic matching to avoid keyword bias
            // Only use chip generation scoring instead
            String specBlob = (
                    (isGamingQuery ? "" : safe(spec.getChip())) + " " +
                            safe(spec.getBattery()) + " " +
                            safe(spec.getCameraRear()) + " " +
                            safe(spec.getCameraFront()) + " " +
                            safe(spec.getScreen()) + " " +
                            safe(spec.getFastCharge()) + " " +
                            safe(spec.getRefreshRate()) + " " +
                            safe(spec.getOperatingSystem()) + " " +
                            safe(spec.getWaterResistance()) + " " +
                            safe(spec.getMaterial())
            ).toLowerCase();
            for (String t : tokens) {
                if (t.length() < 3) continue;
                if (specBlob.contains(t)) score += 1.5;
            }

            if (msg.contains("pin") || msg.contains("battery")) {
                if (!safe(spec.getBattery()).isBlank()) score += 1.5;
            }
            if (msg.contains("camera") || msg.contains("cam") || msg.contains("chụp")) {
                if (!safe(spec.getCameraRear()).isBlank() || !safe(spec.getCameraFront()).isBlank()) score += 1.5;
            }
            if (isGamingQuery) {
                // Gaming needs: good chip + high RAM
                if (!safe(spec.getChip()).isBlank()) {
                    String chipLower = safe(spec.getChip()).toLowerCase();
                    
                    // Extract chip generation number for smart comparison
                    int chipScore = 0;
                    boolean chipFound = false;
                    
                    // ✅ Apple A-series: Tự động trích xuất số (A10, A11, ..., A18, A19, A20, A21...)
                    Pattern applePattern = Pattern.compile("a(\\d+)");
                    Matcher appleMatcher = applePattern.matcher(chipLower);
                    if (appleMatcher.find()) {
                        try {
                            chipScore = Integer.parseInt(appleMatcher.group(1));
                            chipFound = true;
                        } catch (Exception ignored) {}
                    }
                    
                    // ✅ Snapdragon 8 Elite: Tự động
                    if (!chipFound && (chipLower.contains("8 elite") || chipLower.contains("8elite"))) {
                        chipScore = 18;
                        chipFound = true;
                    }
                    
                    // ✅ Snapdragon 8 Gen series: Tự động trích xuất số (8 Gen 1, 2, 3, 4, 5, 6...)
                    if (!chipFound) {
                        Pattern snapdragon8GenPattern = Pattern.compile("8\\s*gen\\s*(\\d+)");
                        Matcher snapdragonMatcher = snapdragon8GenPattern.matcher(chipLower);
                        if (snapdragonMatcher.find()) {
                            try {
                                int genNumber = Integer.parseInt(snapdragonMatcher.group(1));
                                // Map Gen number to score: Gen 3 = 17, Gen 4 = 18, Gen 5 = 19...
                                chipScore = 14 + genNumber;  // Gen 1 = 15, Gen 2 = 16, Gen 3 = 17...
                                chipFound = true;
                            } catch (Exception ignored) {}
                        }
                    }
                    
                    // ✅ Snapdragon 8+ Gen: Tự động (8+ Gen 1, 8+ Gen 2...)
                    if (!chipFound) {
                        Pattern snapdragon8PlusPattern = Pattern.compile("8\\+\\s*gen\\s*(\\d+)");
                        Matcher snapdragon8PlusMatcher = snapdragon8PlusPattern.matcher(chipLower);
                        if (snapdragon8PlusMatcher.find()) {
                            try {
                                int genNumber = Integer.parseInt(snapdragon8PlusMatcher.group(1));
                                chipScore = 15 + genNumber;  // 8+ Gen 1 = 16, 8+ Gen 2 = 17...
                                chipFound = true;
                            } catch (Exception ignored) {}
                        }
                    }
                    
                    // ✅ Snapdragon 8xx series: Tự động (888, 870, 865, 855...)
                    if (!chipFound) {
                        Pattern snapdragon8xxPattern = Pattern.compile("snapdragon\\s*8(\\d{2})");
                        Matcher snapdragon8xxMatcher = snapdragon8xxPattern.matcher(chipLower);
                        if (snapdragon8xxMatcher.find()) {
                            try {
                                String numberStr = snapdragon8xxMatcher.group(1);
                                int number = Integer.parseInt(numberStr);
                                // 888 = 14, 870 = 13, 865 = 13, 855 = 12
                                if (number >= 88) chipScore = 14;
                                else if (number >= 70) chipScore = 13;
                                else if (number >= 60) chipScore = 12;
                                else chipScore = 11;
                                chipFound = true;
                            } catch (Exception ignored) {}
                        }
                    }
                    
                    // ✅ Dimensity 9xxx series: Tự động (9000, 9200, 9300, 9400...)
                    if (!chipFound) {
                        Pattern dimensity9xxxPattern = Pattern.compile("dimensity\\s*9(\\d{3})");
                        Matcher dimensity9xxxMatcher = dimensity9xxxPattern.matcher(chipLower);
                        if (dimensity9xxxMatcher.find()) {
                            try {
                                String numberStr = dimensity9xxxMatcher.group(1);
                                int number = Integer.parseInt(numberStr);
                                // 9300 = 17, 9200 = 16, 9000 = 15
                                if (number >= 300) chipScore = 17;
                                else if (number >= 200) chipScore = 16;
                                else chipScore = 15;
                                chipFound = true;
                            } catch (Exception ignored) {}
                        }
                    }
                    
                    // ✅ Dimensity 8xxx series: Tự động (8000, 8100, 8200, 8300...)
                    if (!chipFound) {
                        Pattern dimensity8xxxPattern = Pattern.compile("dimensity\\s*8(\\d{3})");
                        Matcher dimensity8xxxMatcher = dimensity8xxxPattern.matcher(chipLower);
                        if (dimensity8xxxMatcher.find()) {
                            try {
                                String numberStr = dimensity8xxxMatcher.group(1);
                                int number = Integer.parseInt(numberStr);
                                // 8300 = 14, 8200 = 13, 8100 = 13, 8000 = 12
                                if (number >= 300) chipScore = 14;
                                else if (number >= 100) chipScore = 13;
                                else chipScore = 12;
                                chipFound = true;
                            } catch (Exception ignored) {}
                        }
                    }
                    
                    // ✅ Exynos: Tự động (Exynos 2400, 2200, 1480...)
                    if (!chipFound) {
                        Pattern exynosPattern = Pattern.compile("exynos\\s*(\\d{4})");
                        Matcher exynosMatcher = exynosPattern.matcher(chipLower);
                        if (exynosMatcher.find()) {
                            try {
                                int number = Integer.parseInt(exynosMatcher.group(1));
                                // 2400 = 16, 2200 = 15, 1480 = 12
                                if (number >= 2400) chipScore = 16;
                                else if (number >= 2200) chipScore = 15;
                                else if (number >= 2100) chipScore = 14;
                                else if (number >= 1480) chipScore = 12;
                                else chipScore = 10;
                                chipFound = true;
                            } catch (Exception ignored) {}
                        }
                    }
                    
                    // ✅ Score based on chip tier (linh hoạt cho tất cả chip hiện tại và tương lai)
                    if (chipScore >= 18) score += 10.0;      // Latest flagship 2024+ (A18+, SD 8 Elite, SD 8 Gen 4+)
                    else if (chipScore >= 16) score += 9.0;  // Flagship 2023-2024 (A16-A17, SD 8 Gen 2-3, Exynos 2400)
                    else if (chipScore >= 14) score += 7.0;  // Flagship 2021-2022 (A14-A15, SD 888, Dimensity 9000)
                    else if (chipScore >= 12) score += 4.0;  // Mid-range (A12-A13, Dimensity 8xxx, Exynos 1480)
                    else if (chipScore >= 10) score += 1.5;  // Old (A10-A11)
                    else if (chipFound) score += 0.5;        // Very old chip
                    else score += 0.2;                       // Unknown chip
                }
                
                // Check RAM from variants
                if (p.getProductColors() != null) {
                    int maxRam = p.getProductColors().stream()
                        .flatMap(c -> c.getVariants() != null ? c.getVariants().stream() : java.util.stream.Stream.empty())
                        .map(v -> v.getRamGb())
                        .filter(ram -> ram != null)
                        .max(Integer::compareTo)
                        .orElse(0);
                    if (maxRam >= 12) score += 3.0; // 12GB+ RAM excellent for gaming
                    else if (maxRam >= 8) score += 2.0; // 8GB+ RAM good for gaming
                }
            }
            if (msg.contains("nước") || msg.contains("water") || msg.contains("chống")) {
                if (!safe(spec.getWaterResistance()).isBlank()) score += 2;
            }
        }

        String memSummary = extractVariantMemorySummary(p);
        if (memSummary != null) {
            String memLower = memSummary.toLowerCase();
            if (msg.contains("ram") || msg.contains("rom") || msg.contains("bộ nhớ") || msg.contains("gb")) {
                for (String t : tokens) {
                    if (t.length() < 2) continue;
                    if (memLower.contains(t)) score += 4;
                }
            }
        }

        if (p.getProductColors() != null && !p.getProductColors().isEmpty()) {
            String colorBlob = p.getProductColors().stream()
                    .map(c -> safe(c.getColorName()).toLowerCase())
                    .collect(Collectors.joining(" "));
            if (msg.contains("màu") || msg.contains("color")) {
                for (String t : tokens) {
                    if (t.length() < 2) continue;
                    if (colorBlob.contains(t)) score += 5;
                }
            } else {
                for (String t : tokens) {
                    if (t.length() < 3) continue;
                    if (colorBlob.contains(t)) score += 1;
                }
            }
        }

        BigDecimal minPrice = getMinPrice(p);
        if (budgetVnd != null && minPrice != null) {
            BigDecimal diff = minPrice.subtract(budgetVnd).abs();
            BigDecimal ratio = diff.divide(budgetVnd.max(BigDecimal.ONE), 6, RoundingMode.HALF_UP);
            double closeness = 1.0 / (1.0 + ratio.doubleValue());
            score += 4.5 * closeness;

            if (minPrice.compareTo(budgetVnd) <= 0 && (msg.contains("dưới") || msg.contains("<=") || msg.contains("<"))) {
                score += 1.5;
            }
        }

        if (p.getProductId() != null) {
            score += 0.0001 * (100000 - p.getProductId());
        }
        return score;
    }

    private static final Pattern BUDGET_PATTERN = Pattern.compile("(\\d+(?:[\\.,]\\d+)?)\\s*(triệu|tr|m|k|nghìn|ngan)");

    private BigDecimal extractBudgetVnd(String msgLower) {
        if (msgLower == null || msgLower.isBlank()) return null;
        Matcher m = BUDGET_PATTERN.matcher(msgLower);
        BigDecimal best = null;
        while (m.find()) {
            String numRaw = m.group(1);
            String unit = m.group(2);
            if (numRaw == null || unit == null) continue;
            String normalized = numRaw.replace(",", ".");
            BigDecimal val;
            try {
                val = new BigDecimal(normalized);
            } catch (Exception e) {
                continue;
            }

            BigDecimal vnd;
            if (unit.equals("triệu") || unit.equals("tr") || unit.equals("m")) {
                vnd = val.multiply(BigDecimal.valueOf(1_000_000L));
            } else if (unit.equals("k") || unit.equals("nghìn") || unit.equals("ngan")) {
                vnd = val.multiply(BigDecimal.valueOf(1_000L));
            } else {
                continue;
            }

            if (best == null || vnd.compareTo(best) < 0) {
                best = vnd;
            }
        }
        return best;
    }

    private List<String> tokenize(String msgLower) {
        if (msgLower == null) return List.of();
        String cleaned = msgLower
                .replaceAll("[^\\p{L}\\p{N}\\s]", " ")
                .replaceAll("\\s+", " ")
                .trim();
        if (cleaned.isBlank()) return List.of();
        return List.of(cleaned.split(" ")).stream()
                .filter(s -> !s.isBlank())
                .limit(24)
                .toList();
    }

    private String normalizeUserMessage(String message) {
        if (message == null) return "";
        String trimmed = message.trim();
        int instructionIdx = trimmed.indexOf("(Yêu cầu:");
        if (instructionIdx > 0) {
            return trimmed.substring(0, instructionIdx).trim();
        }
        return trimmed;
    }
    
    /**
     * Phát hiện số lượng sản phẩm yêu cầu từ message
     * Ví dụ: "đưa ra 1 sản phẩm" -> 1, "cho tôi 3 máy" -> 3
     */
    private Integer detectProductCount(String message) {
        if (message == null || message.isBlank()) return null;
        
        String m = message.toLowerCase();
        
        // Pattern: "1 sản phẩm", "một sản phẩm", "chọn 1", "đưa ra 1"...
        String[] onePatterns = {
            "\\b1\\s+(sản phẩm|máy|điện thoại|cái|chiếc|sp)\\b",
            "\\bmột\\s+(sản phẩm|máy|điện thoại|cái|chiếc|sp)\\b",
            "\\bchọn\\s+(1|một)\\b",
            "\\bđưa\\s+ra\\s+(1|một)\\b",
            "\\bcho\\s+(1|một)\\b",
            "\\bgợi\\s+ý\\s+(1|một)\\b",
            "\\btốt\\s+nhất\\b",
            "\\bduy\\s+nhất\\b",
            "\\bchỉ\\s+(1|một)\\b",
            "\\bcụ\\s+thể\\s+nhất\\b"
        };
        
        for (String pattern : onePatterns) {
            if (m.matches(".*" + pattern + ".*")) {
                return 1;
            }
        }
        
        // Pattern: "2 sản phẩm", "hai máy"...
        String[] twoPatterns = {
            "\\b2\\s+(sản phẩm|máy|điện thoại|cái|chiếc|sp)\\b",
            "\\bhai\\s+(sản phẩm|máy|điện thoại|cái|chiếc|sp)\\b"
        };
        
        for (String pattern : twoPatterns) {
            if (m.matches(".*" + pattern + ".*")) {
                return 2;
            }
        }
        
        // Pattern: "3 sản phẩm", "ba máy"...
        String[] threePatterns = {
            "\\b3\\s+(sản phẩm|máy|điện thoại|cái|chiếc|sp)\\b",
            "\\bba\\s+(sản phẩm|máy|điện thoại|cái|chiếc|sp)\\b"
        };
        
        for (String pattern : threePatterns) {
            if (m.matches(".*" + pattern + ".*")) {
                return 3;
            }
        }
        
        // Pattern: "4 sản phẩm", "bốn máy", "tứ máy"...
        String[] fourPatterns = {
            "\\b4\\s+(sản phẩm|máy|điện thoại|cái|chiếc|sp)\\b",
            "\\bbốn\\s+(sản phẩm|máy|điện thoại|cái|chiếc|sp)\\b",
            "\\btư\\s+(sản phẩm|máy|điện thoại|cái|chiếc|sp)\\b"
        };
        
        for (String pattern : fourPatterns) {
            if (m.matches(".*" + pattern + ".*")) {
                return 4;
            }
        }
        
        // Pattern: "5 sản phẩm", "năm máy"...
        String[] fivePatterns = {
            "\\b5\\s+(sản phẩm|máy|điện thoại|cái|chiếc|sp)\\b",
            "\\bnăm\\s+(sản phẩm|máy|điện thoại|cái|chiếc|sp)\\b"
        };
        
        for (String pattern : fivePatterns) {
            if (m.matches(".*" + pattern + ".*")) {
                return 5;
            }
        }
        
        return null;
    }

    private List<Product> pickBestShopProducts(List<Product> products, int k) {
        if (products == null || products.isEmpty()) return List.of();
        int lim = Math.max(1, Math.min(k, 10));

        List<Product> inStock = products.stream().filter(this::hasSellableVariant).toList();
        List<Product> pool = inStock.isEmpty() ? products : inStock;

        List<Product> ranked = pool.stream()
                .sorted((a, b) -> Double.compare(scoreShopHighlight(b), scoreShopHighlight(a)))
                .limit(lim)
                .toList();

        if (ranked.size() >= lim) return ranked;

        Set<Integer> picked = ranked.stream().map(Product::getProductId).filter(Objects::nonNull).collect(Collectors.toSet());
        List<Product> extra = products.stream()
                .filter(p -> p.getProductId() != null && !picked.contains(p.getProductId()))
                .sorted((a, b) -> Double.compare(scoreShopHighlight(b), scoreShopHighlight(a)))
                .limit(lim - ranked.size())
                .toList();

        List<Product> merged = new ArrayList<>(ranked);
        merged.addAll(extra);
        return merged;
    }

    private boolean hasSellableVariant(Product p) {
        if (p == null || p.getProductColors() == null) return false;
        return p.getProductColors().stream()
                .flatMap(c -> c.getVariants() != null ? c.getVariants().stream() : java.util.stream.Stream.empty())
                .anyMatch(v -> {
                    // Use availableStock (totalStock - reservedStock) instead of deprecated quantity field
                    Integer available = v.getAvailableStock();
                    return available != null && available > 0;
                });
    }
    
    /**
     * Trích xuất số series từ tên sản phẩm (ví dụ: S25 = 25, iPhone 17 = 17)
     * Giúp ưu tiên model mới hơn khi so sánh
     */
    private double extractSeriesNumber(String productName) {
        if (productName == null) return 0;
        
        // Samsung Galaxy S-series: S25, S24, S23...
        Pattern samsungPattern = Pattern.compile("\\bs(\\d{2})\\b", Pattern.CASE_INSENSITIVE);
        Matcher samsungMatcher = samsungPattern.matcher(productName);
        if (samsungMatcher.find()) {
            try {
                return Double.parseDouble(samsungMatcher.group(1)); // S25 -> 25
            } catch (NumberFormatException e) {
                // ignore
            }
        }
        
        // iPhone: iPhone 17, iPhone 16, iPhone 15...
        Pattern iphonePattern = Pattern.compile("iphone\\s+(\\d{1,2})\\b", Pattern.CASE_INSENSITIVE);
        Matcher iphoneMatcher = iphonePattern.matcher(productName);
        if (iphoneMatcher.find()) {
            try {
                return Double.parseDouble(iphoneMatcher.group(1)); // iPhone 17 -> 17
            } catch (NumberFormatException e) {
                // ignore
            }
        }
        
        // Xiaomi: Xiaomi 14, Xiaomi 13...
        Pattern xiaomiPattern = Pattern.compile("xiaomi\\s+(\\d{1,2})\\b", Pattern.CASE_INSENSITIVE);
        Matcher xiaomiMatcher = xiaomiPattern.matcher(productName);
        if (xiaomiMatcher.find()) {
            try {
                return Double.parseDouble(xiaomiMatcher.group(1)); // Xiaomi 14 -> 14
            } catch (NumberFormatException e) {
                // ignore
            }
        }
        
        // Oppo/Vivo: Reno 12, V30...
        Pattern otherPattern = Pattern.compile("(reno|v|find|note)\\s+(\\d{1,2})\\b", Pattern.CASE_INSENSITIVE);
        Matcher otherMatcher = otherPattern.matcher(productName);
        if (otherMatcher.find()) {
            try {
                return Double.parseDouble(otherMatcher.group(2));
            } catch (NumberFormatException e) {
                // ignore
            }
        }
        
        return 0;
    }

    private double scoreShopHighlight(Product p) {
        if (p == null) return -1;
        double score = 0;

        String name = safe(p.getProductName()).toLowerCase();
        if (name.contains("iphone") || name.contains("galaxy s") || name.contains("ultra")
                || name.contains("pro max") || name.contains(" pro ")) {
            score += 10;
        }
        if (name.contains("plus") || name.contains("fold") || name.contains("flip")) {
            score += 4;
        }

        if (p.getBrand() != null && p.getBrand().getBrandName() != null) {
            String brand = safe(p.getBrand().getBrandName()).toLowerCase();
            if (brand.contains("apple") || brand.contains("samsung") || brand.contains("xiaomi")
                    || brand.contains("oppo") || brand.contains("vivo")) {
                score += 3;
            }
        }

        BigDecimal minPrice = getMinPrice(p);
        if (minPrice != null) {
            double trieu = minPrice.doubleValue() / 1_000_000.0;
            if (trieu >= 10 && trieu <= 45) score += 6;
            else if (trieu >= 5) score += 3;
        }

        if (hasSellableVariant(p)) score += 5;

        if (p.getProductId() != null) {
            score += p.getProductId() * 0.00001;
        }
        return score;
    }

    private boolean isClearlyOffTopic(String message) {
        String m = message == null ? "" : message.toLowerCase();
        if (m.isBlank()) return false;

        String[] offTopicKeywords = new String[]{
                "thời tiết", "weather", "dự báo mưa", "nhiệt độ hôm nay",
                "nấu ăn", "công thức nấu", "recipe", "làm bánh",
                "bài tập", "giải toán", "văn học", "hóa học", "vật lý", "lịch sử thế giới",
                "chính trị", "bầu cử", "quốc hội", "tổng thống", "thủ tướng",
                "bóng đá", "world cup", "ngoại hạng", "messi", "ronaldo", "euro",
                "bitcoin", "crypto", "coin", "chứng khoán", "forex",
                "bệnh", "thuốc", "triệu chứng", "đau đầu", "sức khỏe",
                "tình yêu", "tâm lý", "tarot", "tử vi", "cung hoàng đạo",
                "viết code", "python", "javascript", "java spring", "lập trình",
                "phim hay", "netflix", "phim ảnh", "review phim",
                "bài hát", "ca sĩ", "âm nhạc",
                "du lịch", "khách sạn", "vé máy bay", "resort",
                "xe máy", "ô tô", "xe hơi", "laptop", "macbook", "máy tính bảng",
                "thủ đô", "thủ đô của", "ai là ai", "ai đó là ai", "tổng thống mỹ",
                "tin tức", "thế giới hôm nay", "chiến tranh"
        };
        for (String kw : offTopicKeywords) {
            if (m.contains(kw)) return true;
        }
        return false;
    }

    private boolean hasStrongPhoneIntent(String message) {
        String m = message == null ? "" : message.toLowerCase();
        if (m.isBlank()) return false;
        String[] strongKeywords = new String[]{
                "điện thoại", "smartphone", "iphone", "ipad", "samsung", "xiaomi", "oppo", "vivo", "realme",
                "galaxy", "redmi", "poco", "pixel", "oneplus", "nokia",
                "mua máy", "mua phone", "tư vấn máy", "gợi ý máy", "chọn máy", "đổi máy"
        };
        for (String kw : strongKeywords) {
            if (m.contains(kw)) return true;
        }
        return false;
    }

    private boolean isPhoneRelated(String message) {
        String m = message == null ? "" : message.toLowerCase();
        if (m.isBlank()) return false;

        if (isClearlyOffTopic(m) && !hasStrongPhoneIntent(m)) {
            return false;
        }

        String[] keywords = new String[]{
                // Tên thiết bị và thương hiệu
                "điện thoại", "smartphone", "phone", "di động", "mobile", "máy", "thiết bị",
                "iphone", "ipad", "apple", "samsung", "galaxy", "xiaomi", "redmi", "poco",
                "oppo", "vivo", "realme", "oneplus", "nokia", "sony", "pixel", "google",
                "huawei", "honor", "asus", "rog phone", "lenovo", "motorola", "lg",
                
                // Thông số kỹ thuật
                "ram", "rom", "bộ nhớ", "storage", "gb", "tb", "dung lượng",
                "chip", "cpu", "gpu", "vi xử lý", "snapdragon", "mediatek", "exynos", "dimensity", "bionic", "apple silicon",
                "pin", "battery", "mah", "dung lượng pin", "thời lượng pin",
                "sạc", "charge", "sạc nhanh", "fast charge", "sạc không dây", "wireless charging",
                "màn", "screen", "display", "màn hình", "inch", "hz", "tần số quét", "refresh rate",
                "amoled", "oled", "lcd", "ips", "super amoled", "dynamic amoled", "retina",
                
                // Camera và chụp ảnh
                "camera", "cam", "chụp", "ảnh", "chụp ảnh", "chụp hình", "nhiếp ảnh",
                "quay", "video", "quay video", "quay phim", "record",
                "selfie", "tự sướng", "camera trước", "camera sau",
                "zoom", "tele", "telephoto", "góc rộng", "wide", "ultrawide", "macro",
                "chụp đêm", "night mode", "chân dung", "portrait", "xóa phông", "bokeh",
                "ois", "chống rung", "4k", "8k", "slow motion", "time lapse",
                "mp", "megapixel", "độ phân giải", "cảm biến",
                
                // Màu sắc
                "màu", "color", "đen", "trắng", "xanh", "đỏ", "vàng", "hồng", "tím", "xám",
                "black", "white", "blue", "red", "gold", "silver", "purple", "green",
                "titan", "titanium", "natural", "pro max",
                
                // Tính năng
                "5g", "4g", "lte", "wifi", "bluetooth", "nfc", "sim", "esim", "dual sim",
                "kháng nước", "chống nước", "waterproof", "ip68", "ip67", "ip69",
                "vân tay", "fingerprint", "face id", "mở khóa khuôn mặt", "bảo mật",
                "jack tai nghe", "headphone jack", "type-c", "lightning", "usb-c",
                "loa", "speaker", "stereo", "dolby atmos", "âm thanh",
                
                // Hệ điều hành và phần mềm
                "ios", "android", "hệ điều hành", "operating system", "one ui", "miui", "coloros",
                "ai", "trí tuệ nhân tạo", "artificial intelligence", "galaxy ai", "apple intelligence", "gemini",
                
                // Nhu cầu sử dụng
                "gaming", "game", "chơi game", "chiến game", "cày game",
                "làm việc", "work", "văn phòng", "office", "học tập", "học online",
                "giải trí", "entertainment", "xem phim", "nghe nhạc", "netflix", "youtube",
                "mạng xã hội", "facebook", "instagram", "tiktok", "zalo",
                "livestream", "stream", "phát trực tiếp",
                
                // Giá cả và mua sắm
                "giá", "price", "triệu", "tr", "nghìn", "k", "m", "vnđ", "đồng",
                "dưới", "trên", "tầm", "khoảng", "từ", "đến", "rẻ", "mềm", "bình dân",
                "cao cấp", "flagship", "tầm trung", "giá rẻ", "phổ thông",
                "khuyến mãi", "giảm giá", "sale", "ưu đãi", "trả góp",
                "mua", "mua máy", "mua phone", "đổi máy", "lên đời", "thay máy",
                
                // Đánh giá và so sánh
                "so sánh", "compare", "vs", "hay", "tốt hơn", "khác nhau", "giống nhau",
                "review", "đánh giá", "nhận xét", "ưu điểm", "nhược điểm",
                "tốt nhất", "best", "top", "xịn", "ngon", "chất lượng", "bền", "đẹp",
                "mới nhất", "latest", "new", "ra mắt", "launch",
                
                // Thương hiệu và cửa hàng
                "myphone", "my phone", "cửa hàng", "shop", "store",
                "tư vấn", "gợi ý", "đề xuất", "recommend", "suggest",
                "chọn", "lựa chọn", "pick", "select",
                
                // Thiết kế và vật liệu
                "thiết kế", "design", "đẹp", "sang", "xịn", "cao cấp", "premium",
                "khung", "frame", "viền", "bezel", "notch", "punch hole",
                "kính", "glass", "ceramic", "nhôm", "aluminum", "thép", "steel",
                "mỏng", "thin", "nhẹ", "light", "gọn", "compact",
                "to", "lớn", "big", "nhỏ", "small", "size", "kích thước",
                
                // Cấu hình
                "cấu hình", "config", "spec", "thông số", "specification",
                "mạnh", "yếu", "khỏe", "mượt", "lag", "giật", "nhanh", "chậm",
                "đa nhiệm", "multitasking", "hiệu năng", "performance"
        };
        for (String kw : keywords) {
            if (m.contains(kw)) return true;
        }
        return BUDGET_PATTERN.matcher(m).find();
    }

    private boolean wantsIphoneOnly(String message) {
        String m = message == null ? "" : message.toLowerCase();
        if (m.isBlank()) return false;
        return m.contains("iphone") || m.contains("i phone") || m.contains("apple");
    }

    private boolean isIphoneProduct(Product p) {
        if (p == null) return false;
        String name = safe(p.getProductName()).toLowerCase();
        if (name.contains("iphone") || name.contains("i phone")) return true;
        if (p.getBrand() != null && p.getBrand().getBrandName() != null) {
            String brand = safe(p.getBrand().getBrandName()).toLowerCase();
            if (brand.contains("apple") || brand.contains("iphone")) return true;
        }
        return false;
    }

    private String safe(String s) {
        if (s == null) return "";
        return s.replaceAll("\n+", " ").trim();
    }

    /**
     * Kiểm tra sản phẩm cụ thể có trong shop không
     */
    private ProductAvailabilityCheck checkProductAvailability(String message, List<Product> allProducts) {
        ProductAvailabilityCheck check = new ProductAvailabilityCheck();
        String msg = message.toLowerCase();

        // Phát hiện loại câu hỏi
        check.isComparisonQuery = msg.contains("so sánh") || msg.contains("vs") || msg.contains("versus") ||
                                   (msg.contains("hay") && (msg.contains("tốt hơn") || msg.contains("mạnh hơn") || 
                                    msg.contains("đẹp hơn") || msg.contains("ngon hơn") || msg.contains("nên chọn"))) ||
                                   msg.contains("cái nào");
        
        check.isPurchaseQuery = msg.contains("mua") || msg.contains("tư vấn") || msg.contains("gợi ý") || 
                               msg.contains("chọn") || msg.contains("giá") || msg.contains("bao nhiêu") ||
                               msg.contains("có không") || msg.contains("còn hàng") || msg.contains("tìm") ||
                               msg.contains("xem") || msg.contains("cho tôi");

        // ✅ Danh sách pattern MỞ RỘNG để phát hiện sản phẩm cụ thể
        List<Pattern> productPatterns = List.of(
            // iPhone patterns (bao gồm cả tên đầy đủ và viết tắt)
            Pattern.compile("iphone\\s*(\\d+)\\s*(pro\\s*max|pro\\s*plus|pro|plus|mini|se|air)?", Pattern.CASE_INSENSITIVE),
            
            // Samsung Galaxy S series
            Pattern.compile("samsung\\s*(?:galaxy\\s*)?(s)(\\d+)\\s*(ultra|plus|fe|\\+)?", Pattern.CASE_INSENSITIVE),
            
            // Samsung Galaxy Z series (Fold/Flip)
            Pattern.compile("samsung\\s*(?:galaxy\\s*)?(z)\\s*(fold|flip)\\s*(\\d+)", Pattern.CASE_INSENSITIVE),
            
            // Samsung Galaxy A series
            Pattern.compile("samsung\\s*(?:galaxy\\s*)?(a)(\\d+)\\s*(5g)?", Pattern.CASE_INSENSITIVE),
            
            // Xiaomi numbered series
            Pattern.compile("xiaomi\\s*(\\d+)\\s*(ultra|pro\\s*max|pro\\s*plus|pro|plus|t|lite)?", Pattern.CASE_INSENSITIVE),
            
            // Redmi series
            Pattern.compile("redmi\\s*(?:note\\s*)?(\\d+)\\s*(pro\\s*max|pro\\s*plus|pro|plus)?", Pattern.CASE_INSENSITIVE),
            
            // Oppo Find series
            Pattern.compile("oppo\\s*(?:find\\s*)?([xn])(\\d+)\\s*(ultra|pro)?", Pattern.CASE_INSENSITIVE),
            
            // Oppo Reno series
            Pattern.compile("oppo\\s*reno\\s*(\\d+)\\s*(pro\\s*plus|pro)?", Pattern.CASE_INSENSITIVE),
            
            // Oppo A series
            Pattern.compile("oppo\\s*a(\\d+)", Pattern.CASE_INSENSITIVE),
            
            // Vivo X series
            Pattern.compile("vivo\\s*x(\\d+)\\s*(pro\\s*plus|pro)?", Pattern.CASE_INSENSITIVE),
            
            // Vivo Y series
            Pattern.compile("vivo\\s*y(\\d+)", Pattern.CASE_INSENSITIVE),
            
            // Vivo V series
            Pattern.compile("vivo\\s*v(\\d+)\\s*(pro)?", Pattern.CASE_INSENSITIVE),
            
            // Realme GT series
            Pattern.compile("realme\\s*gt\\s*(?:neo\\s*)?(\\d+)\\s*(pro|explorer)?", Pattern.CASE_INSENSITIVE),
            
            // OnePlus series
            Pattern.compile("oneplus\\s*(\\d+)\\s*(pro|t|r)?", Pattern.CASE_INSENSITIVE),
            
            // Google Pixel
            Pattern.compile("(?:google\\s*)?pixel\\s*(\\d+)\\s*(pro|xl|a)?", Pattern.CASE_INSENSITIVE),
            
            // Nokia
            Pattern.compile("nokia\\s*([xg]?)(\\d+)\\s*(pro|plus)?", Pattern.CASE_INSENSITIVE),
            
            // Sony Xperia
            Pattern.compile("sony\\s*(?:xperia\\s*)?(\\d+)\\s*(pro|compact|ultra)?", Pattern.CASE_INSENSITIVE),
            
            // Asus ROG Phone
            Pattern.compile("asus\\s*(?:rog\\s*phone\\s*)?(\\d+)", Pattern.CASE_INSENSITIVE),
            
            // Huawei
            Pattern.compile("huawei\\s*(?:p|mate)?(\\d+)\\s*(pro|plus)?", Pattern.CASE_INSENSITIVE)
        );

        Set<String> detectedProducts = new HashSet<>();
        
        // Phát hiện tất cả sản phẩm trong câu hỏi
        for (Pattern pattern : productPatterns) {
            Matcher matcher = pattern.matcher(msg);
            while (matcher.find()) {
                String detectedProduct = matcher.group(0).trim();
                // Chuẩn hóa tên sản phẩm
                detectedProduct = normalizeProductName(detectedProduct);
                detectedProducts.add(detectedProduct);
            }
        }

        if (detectedProducts.isEmpty()) {
            return check; // Không phát hiện sản phẩm cụ thể
        }

        check.requestedProducts = new ArrayList<>(detectedProducts);

        // ✅ Kiểm tra từng sản phẩm phát hiện được có trong shop không
        for (String requestedProduct : detectedProducts) {
            boolean found = allProducts.stream().anyMatch(p -> {
                String productName = safe(p.getProductName()).toLowerCase();
                String brandName = p.getBrand() != null ? safe(p.getBrand().getBrandName()).toLowerCase() : "";
                String requested = requestedProduct.toLowerCase();
                
                // Kiểm tra nhiều cách
                return productName.contains(requested) || 
                       (brandName + " " + productName).contains(requested) ||
                       calculateSimilarity(productName, requested) > 0.7 ||
                       fuzzyMatch(productName, requested);
            });

            if (!found) {
                check.unavailableProducts.add(requestedProduct);
            }
        }

        return check;
    }

    /**
     * Chuẩn hóa tên sản phẩm
     */
    private String normalizeProductName(String name) {
        if (name == null) return "";
        
        // Chuẩn hóa khoảng trắng
        name = name.trim().replaceAll("\\s+", " ");
        
        // Chuẩn hóa một số từ viết tắt
        name = name.replace("promax", "pro max")
                   .replace("proplus", "pro plus")
                   .replace("ultra", " ultra")
                   .replace("fe", " fe");
        
        return name;
    }

    /**
     * Fuzzy matching nâng cao
     */
    private boolean fuzzyMatch(String productName, String searchTerm) {
        // Tách thành các từ
        String[] productWords = productName.toLowerCase().split("\\s+");
        String[] searchWords = searchTerm.toLowerCase().split("\\s+");
        
        // Đếm số từ khớp
        int matchCount = 0;
        for (String searchWord : searchWords) {
            for (String productWord : productWords) {
                if (productWord.contains(searchWord) || searchWord.contains(productWord)) {
                    matchCount++;
                    break;
                }
            }
        }
        
        // Nếu khớp >= 70% số từ → coi như match
        return (double) matchCount / searchWords.length >= 0.7;
    }

    /**
     * Tính độ tương đồng giữa 2 chuỗi (0.0 - 1.0)
     */
    private double calculateSimilarity(String s1, String s2) {
        String longer = s1.length() > s2.length() ? s1 : s2;
        String shorter = s1.length() > s2.length() ? s2 : s1;
        
        if (longer.length() == 0) return 1.0;
        
        int editDistance = computeLevenshteinDistance(longer, shorter);
        return (longer.length() - editDistance) / (double) longer.length();
    }

    /**
     * Tính Levenshtein distance
     */
    private int computeLevenshteinDistance(String s1, String s2) {
        int[][] dp = new int[s1.length() + 1][s2.length() + 1];

        for (int i = 0; i <= s1.length(); i++) {
            dp[i][0] = i;
        }
        for (int j = 0; j <= s2.length(); j++) {
            dp[0][j] = j;
        }

        for (int i = 1; i <= s1.length(); i++) {
            for (int j = 1; j <= s2.length(); j++) {
                int cost = s1.charAt(i - 1) == s2.charAt(j - 1) ? 0 : 1;
                dp[i][j] = Math.min(Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1), dp[i - 1][j - 1] + cost);
            }
        }

        return dp[s1.length()][s2.length()];
    }

    /**
     * Xử lý khi có sản phẩm không có trong shop
     */
    private AiResponse handleUnavailableProducts(ProductAvailabilityCheck check, List<Product> allProducts, 
                                                  int k, Long sessionId) {
        StringBuilder answer = new StringBuilder();
        
        // Format danh sách sản phẩm không có với số lượng linh hoạt
        String unavailableList;
        if (check.unavailableProducts.size() == 1) {
            unavailableList = "**" + capitalizeWords(check.unavailableProducts.get(0)) + "**";
        } else if (check.unavailableProducts.size() == 2) {
            unavailableList = "**" + capitalizeWords(check.unavailableProducts.get(0)) + "**" + 
                            " và **" + capitalizeWords(check.unavailableProducts.get(1)) + "**";
        } else {
            // 3+ sản phẩm
            List<String> formatted = check.unavailableProducts.stream()
                .map(p -> "**" + capitalizeWords(p) + "**")
                .toList();
            unavailableList = String.join(", ", formatted.subList(0, formatted.size() - 1)) + 
                            " và " + formatted.get(formatted.size() - 1);
        }

        if (check.isComparisonQuery) {
            // Trường hợp so sánh
            if (check.allProductsUnavailable()) {
                // Tất cả sản phẩm đều không có
                answer.append("Rất tiếc, ");
                if (check.requestedProducts.size() == 2) {
                    answer.append("cả 2 sản phẩm ");
                } else {
                    answer.append("các sản phẩm ");
                }
                answer.append(unavailableList)
                      .append(" hiện **không có trong shop** nên không thể so sánh được. 😔\n\n");
                answer.append("💡 Shop gợi ý các sản phẩm tương tự đang có sẵn để bạn so sánh:");
            } else {
                // Một số sản phẩm không có, một số có
                int availableCount = check.requestedProducts.size() - check.unavailableProducts.size();
                answer.append("Rất tiếc, ").append(unavailableList)
                      .append(" hiện **không có trong shop** nên không thể so sánh đầy đủ. 😔\n\n");
                
                if (availableCount == 1) {
                    // Có 1 sản phẩm trong shop
                    String availableProduct = check.requestedProducts.stream()
                        .filter(p -> !check.unavailableProducts.contains(p))
                        .findFirst()
                        .orElse("");
                    answer.append("💡 Shop có **").append(capitalizeWords(availableProduct))
                          .append("**. Bạn có thể xem các sản phẩm tương tự để so sánh:");
                } else {
                    answer.append("💡 Shop có các sản phẩm khác trong danh sách của bạn. Xem thêm gợi ý tương tự:");
                }
            }
        } else if (check.isPurchaseQuery) {
            // Trường hợp mua/tư vấn/hỏi giá/hỏi thông số
            boolean isPriceQuery = check.requestedProducts.stream()
                .anyMatch(p -> check.unavailableProducts.contains(p)) &&
                (check.isPurchaseQuery && 
                 (check.requestedProducts.get(0).toLowerCase().contains("giá") || 
                  check.requestedProducts.get(0).toLowerCase().contains("bao nhiêu")));
            
            answer.append("Rất tiếc, ").append(unavailableList)
                  .append(" hiện **không có trong shop**");
            
            if (check.unavailableProducts.size() == 1) {
                answer.append(" nên Shop không có thông tin về sản phẩm này. 😔\n\n");
            } else {
                answer.append(" nên Shop không có thông tin về các sản phẩm này. 😔\n\n");
            }
            
            answer.append("💡 Shop gợi ý các sản phẩm tương tự đang có sẵn:");
        } else {
            // Trường hợp khác (hỏi chung chung)
            answer.append("Rất tiếc, ").append(unavailableList)
                  .append(" hiện **không có trong shop**. 😔\n\n");
            answer.append("💡 Dưới đây là các sản phẩm nổi bật tại shop:");
        }

        // ✅ Lấy top sản phẩm - ưu tiên từ các thương hiệu được nhắc đến
        List<Integer> topProductIds = getSmartProductSuggestions(
            allProducts, 
            check.requestedProducts, 
            check.unavailableProducts,
            Math.max(k, 5)
        );

        return new AiResponse(answer.toString(), topProductIds, List.of(), sessionId);
    }

    /**
     * Gợi ý sản phẩm thông minh dựa trên sản phẩm khách yêu cầu
     */
    private List<Integer> getSmartProductSuggestions(List<Product> allProducts, 
                                                     List<String> requestedProducts,
                                                     List<String> unavailableProducts,
                                                     int k) {
        // Trích xuất thương hiệu từ sản phẩm yêu cầu
        Set<String> requestedBrands = extractBrandsFromProductNames(requestedProducts);
        
        List<Product> prioritizedProducts = new ArrayList<>();
        List<Product> otherProducts = new ArrayList<>();
        
        // Phân loại sản phẩm: ưu tiên thương hiệu được yêu cầu
        for (Product p : allProducts) {
            if (p.getBrand() == null || p.getBrand().getBrandName() == null) continue;
            
            String brandName = p.getBrand().getBrandName().toLowerCase();
            boolean isRequestedBrand = requestedBrands.stream()
                .anyMatch(rb -> brandName.contains(rb) || rb.contains(brandName));
            
            if (isRequestedBrand) {
                prioritizedProducts.add(p);
            } else {
                otherProducts.add(p);
            }
        }
        
        // Sắp xếp theo điểm
        prioritizedProducts.sort((a, b) -> Double.compare(
            scoreProductForListing(b), 
            scoreProductForListing(a)
        ));
        
        otherProducts.sort((a, b) -> Double.compare(
            scoreProductForListing(b), 
            scoreProductForListing(a)
        ));
        
        // Kết hợp: Lấy từ thương hiệu ưu tiên trước, sau đó đa dạng hóa
        List<Product> result = new ArrayList<>();
        
        // Lấy top từ thương hiệu ưu tiên (tối đa 60%)
        int priorityCount = Math.min(prioritizedProducts.size(), (int)(k * 0.6));
        result.addAll(prioritizedProducts.subList(0, Math.min(priorityCount, prioritizedProducts.size())));
        
        // Lấy thêm từ các thương hiệu khác (đa dạng hóa)
        if (result.size() < k) {
            List<Integer> otherProductIds = getTopProductsFromDifferentBrands(
                otherProducts, 
                k - result.size()
            );
            
            List<Product> additionalProducts = otherProducts.stream()
                .filter(p -> otherProductIds.contains(p.getProductId()))
                .toList();
            
            result.addAll(additionalProducts);
        }
        
        return result.stream()
            .map(Product::getProductId)
            .filter(Objects::nonNull)
            .distinct()
            .limit(k)
            .toList();
    }

    /**
     * Trích xuất tên thương hiệu từ tên sản phẩm
     */
    private Set<String> extractBrandsFromProductNames(List<String> productNames) {
        Set<String> brands = new HashSet<>();
        
        for (String productName : productNames) {
            String name = productName.toLowerCase();
            
            // Danh sách thương hiệu phổ biến
            String[] knownBrands = {
                "iphone", "apple", "samsung", "xiaomi", "redmi", 
                "oppo", "vivo", "realme", "oneplus", "nokia", 
                "sony", "google", "pixel", "huawei", "asus"
            };
            
            for (String brand : knownBrands) {
                if (name.contains(brand)) {
                    // Chuẩn hóa: iPhone/Apple → apple
                    if (brand.equals("iphone")) {
                        brands.add("apple");
                    } else {
                        brands.add(brand);
                    }
                }
            }
        }
        
        return brands;
    }

    /**
     * Lấy top sản phẩm từ các thương hiệu khác nhau
     */
    private List<Integer> getTopProductsFromDifferentBrands(List<Product> products, int k) {
        Map<String, List<Product>> productsByBrand = products.stream()
            .filter(p -> p.getBrand() != null && p.getBrand().getBrandName() != null)
            .collect(Collectors.groupingBy(p -> p.getBrand().getBrandName()));

        List<Product> result = new ArrayList<>();
        List<String> brands = new ArrayList<>(productsByBrand.keySet());
        
        // Lấy 1 sản phẩm từ mỗi thương hiệu xen kẽ
        int maxIterations = 10; // Tránh vòng lặp vô hạn
        int iteration = 0;
        
        while (result.size() < k && iteration < maxIterations) {
            for (String brand : brands) {
                if (result.size() >= k) break;
                
                List<Product> brandProducts = productsByBrand.get(brand);
                if (brandProducts != null && !brandProducts.isEmpty()) {
                    // Lấy sản phẩm tốt nhất chưa được chọn
                    Product best = brandProducts.stream()
                        .filter(p -> !result.contains(p))
                        .max((a, b) -> Double.compare(
                            scoreProductForListing(a), 
                            scoreProductForListing(b)
                        ))
                        .orElse(null);
                    
                    if (best != null) {
                        result.add(best);
                    }
                }
            }
            iteration++;
        }

        return result.stream()
            .map(Product::getProductId)
            .filter(Objects::nonNull)
            .limit(k)
            .toList();
    }

    /**
     * Chấm điểm sản phẩm cho mục đích listing
     */
    private double scoreProductForListing(Product p) {
        double score = 0;
        
        // Ưu tiên sản phẩm còn hàng
        if (hasSellableVariant(p)) score += 10.0;
        
        // Ưu tiên sản phẩm mới
        if (p.getProductType() != null) {
            switch (p.getProductType()) {
                case NEW -> score += 5.0;
                case BEST_SELLER -> score += 4.0;
                case SALE -> score += 3.0;
                default -> score += 0;
            }
        }
        
        // Ưu tiên sản phẩm có ID lớn (mới thêm vào)
        if (p.getProductId() != null) {
            score += p.getProductId() * 0.001;
        }
        
        return score;
    }

    /**
     * Viết hoa chữ cái đầu mỗi từ
     */
    private String capitalizeWords(String str) {
        if (str == null || str.isEmpty()) return str;
        
        String[] words = str.split("\\s+");
        StringBuilder result = new StringBuilder();
        
        for (String word : words) {
            if (!word.isEmpty()) {
                result.append(Character.toUpperCase(word.charAt(0)))
                      .append(word.substring(1).toLowerCase())
                      .append(" ");
            }
        }
        
        return result.toString().trim();
    }

    /**
     * Phát hiện câu hỏi so sánh giữa 2 hãng
     */
    private BrandComparisonQuery detectBrandComparison(String message) {
        if (message == null || message.isBlank()) return null;
        String msg = message.toLowerCase();

        // Kiểm tra có từ khóa so sánh không
        boolean hasComparisonKeyword = msg.contains("so sánh") || msg.contains("so sanh") 
                || msg.contains(" vs ") || msg.contains(" với ") || msg.contains("hay")
                || msg.contains("tốt hơn") || msg.contains("tot hon") || msg.contains("khác nhau")
                || msg.contains("nên chọn") || msg.contains("nên mua");
        
        if (!hasComparisonKeyword) return null;

        // Phát hiện các hãng được nhắc đến
        String brand1 = null;
        String brand2 = null;
        String aspect = null; // camera, pin, hiệu năng...

        // Map các hãng phổ biến
        String[][] brandPatterns = {
            {"samsung", "sam sung"},
            {"iphone", "apple", "i phone"},
            {"xiaomi"},
            {"oppo"},
            {"vivo"},
            {"realme"},
            {"oneplus", "one plus"},
            {"nokia"},
            {"sony"}
        };

        List<String> detectedBrands = new ArrayList<>();
        for (String[] patterns : brandPatterns) {
            boolean found = false;
            for (String pattern : patterns) {
                if (msg.contains(pattern)) {
                    found = true;
                    break;
                }
            }
            if (found) {
                detectedBrands.add(patterns[0]); // Lưu tên chuẩn hóa
            }
        }

        // Phải có đúng 2 hãng để so sánh
        if (detectedBrands.size() != 2) return null;

        brand1 = detectedBrands.get(0);
        brand2 = detectedBrands.get(1);

        // Phát hiện khía cạnh so sánh
        if (msg.contains("camera") || msg.contains("cam") || msg.contains("chụp") || msg.contains("ảnh")) {
            aspect = "camera";
        } else if (msg.contains("pin") || msg.contains("battery") || msg.contains("sạc")) {
            aspect = "pin";
        } else if (msg.contains("hiệu năng") || msg.contains("chip") || msg.contains("game") || msg.contains("mượt")) {
            aspect = "hiệu năng";
        } else if (msg.contains("màn hình") || msg.contains("screen") || msg.contains("display")) {
            aspect = "màn hình";
        } else if (msg.contains("giá") || msg.contains("rẻ") || msg.contains("tiết kiệm")) {
            aspect = "giá";
        }
        // Nếu không có khía cạnh cụ thể, so sánh tổng thể
        
        return new BrandComparisonQuery(brand1, brand2, aspect);
    }

    /**
     * Xử lý câu hỏi so sánh giữa 2 hãng
     */
    private AiResponse handleBrandComparison(BrandComparisonQuery query, List<Product> allProducts, String originalMessage) {
        // Lọc sản phẩm theo từng hãng
        List<Product> brand1Products = filterProductsByBrand(allProducts, query.brand1);
        List<Product> brand2Products = filterProductsByBrand(allProducts, query.brand2);

        if (brand1Products.isEmpty() || brand2Products.isEmpty()) {
            // Không đủ sản phẩm để so sánh, fallback về xử lý thông thường
            return null;
        }

        // Chọn sản phẩm tốt nhất của mỗi hãng dựa theo khía cạnh
        Product bestBrand1 = selectBestProductForComparison(brand1Products, query.aspect);
        Product bestBrand2 = selectBestProductForComparison(brand2Products, query.aspect);

        // Gọi compare() với 2 sản phẩm đại diện
        List<Integer> productIds = List.of(bestBrand1.getProductId(), bestBrand2.getProductId());
        
        return compare(productIds, originalMessage);
    }

    /**
     * Lọc sản phẩm theo hãng
     */
    private List<Product> filterProductsByBrand(List<Product> products, String brandKeyword) {
        return products.stream()
                .filter(p -> {
                    String productName = safe(p.getProductName()).toLowerCase();
                    String brandName = p.getBrand() != null ? safe(p.getBrand().getBrandName()).toLowerCase() : "";
                    
                    // Xử lý trường hợp đặc biệt cho iPhone/Apple
                    if (brandKeyword.equals("iphone") || brandKeyword.equals("apple")) {
                        return productName.contains("iphone") || brandName.contains("apple");
                    }
                    
                    return productName.contains(brandKeyword) || brandName.contains(brandKeyword);
                })
                .toList();
    }

    /**
     * Chọn sản phẩm tốt nhất để so sánh dựa theo khía cạnh
     */
    private Product selectBestProductForComparison(List<Product> products, String aspect) {
        if (products.isEmpty()) return null;
        if (products.size() == 1) return products.get(0);

        return products.stream()
                .max((a, b) -> Double.compare(
                    scoreProductForAspect(a, aspect),
                    scoreProductForAspect(b, aspect)
                ))
                .orElse(products.get(0));
    }

    /**
     * Chấm điểm sản phẩm theo khía cạnh cụ thể
     */
    private double scoreProductForAspect(Product p, String aspect) {
        double score = 0;
        
        // Điểm cơ bản: sản phẩm cao cấp (Pro, Max, Ultra)
        String name = safe(p.getProductName()).toLowerCase();
        if (name.contains("ultra")) score += 20;
        else if (name.contains("pro max")) score += 18;
        else if (name.contains(" pro ")) score += 15;
        else if (name.contains("plus")) score += 10;
        
        // Điểm cho số series (model mới hơn)
        score += extractSeriesNumber(name) * 0.5; // S25 = +12.5, S24 = +12, iPhone 17 = +8.5

        ProductSpec spec = null;
        if (p.getProductSpecs() != null && !p.getProductSpecs().isEmpty()) {
            spec = p.getProductSpecs().iterator().next();
        }

        if (spec == null) return score;

        // Chấm điểm theo khía cạnh
        if (aspect == null) {
            // So sánh tổng thể: ưu tiên flagship mới nhất
            score += scoreChipGeneration(spec.getChip()) * 2;
            score += scoreCameraQuality(spec.getCameraRear(), spec.getCameraFront());
            score += scoreBatteryCapacity(spec.getBattery());
        } else if (aspect.equals("camera")) {
            score += scoreCameraQuality(spec.getCameraRear(), spec.getCameraFront()) * 3;
        } else if (aspect.equals("hiệu năng")) {
            score += scoreChipGeneration(spec.getChip()) * 5;
        } else if (aspect.equals("pin")) {
            score += scoreBatteryCapacity(spec.getBattery()) * 4;
        } else if (aspect.equals("màn hình")) {
            score += scoreScreenQuality(spec.getScreen(), spec.getRefreshRate()) * 3;
        } else if (aspect.equals("giá")) {
            // Giá thấp hơn = điểm cao hơn
            BigDecimal price = getMinPrice(p);
            if (price != null) {
                score -= price.doubleValue() / 1_000_000; // Trừ điểm theo triệu
            }
        }

        // Ưu tiên nhẹ cho sản phẩm còn hàng như một tie-breaker
        if (hasSellableVariant(p)) {
            score += 0.5;
        }

        return score;
    }

    private double scoreChipGeneration(String chip) {
        if (chip == null) return 0;
        String chipLower = chip.toLowerCase();
        
        // Apple A-series
        if (chipLower.contains("a19")) return 19;
        if (chipLower.contains("a18")) return 18;
        if (chipLower.contains("a17")) return 17;
        if (chipLower.contains("a16")) return 16;
        if (chipLower.contains("a15")) return 15;
        if (chipLower.contains("a14")) return 14;
        
        // Snapdragon
        if (chipLower.contains("8 elite")) return 18;
        if (chipLower.contains("8 gen 3") || chipLower.contains("8 gen3")) return 17;
        if (chipLower.contains("8+ gen 2") || chipLower.contains("8+gen2")) return 16.5;
        if (chipLower.contains("8 gen 2") || chipLower.contains("8 gen2")) return 16;
        if (chipLower.contains("8+ gen 1") || chipLower.contains("8+gen1")) return 15.5;
        if (chipLower.contains("8 gen 1") || chipLower.contains("8 gen1")) return 15;
        if (chipLower.contains("888")) return 14;
        if (chipLower.contains("7+ gen 3")) return 13;
        if (chipLower.contains("7 gen 3")) return 12;
        
        // Dimensity
        if (chipLower.contains("9300+")) return 17.5;
        if (chipLower.contains("9300")) return 17;
        if (chipLower.contains("9200+")) return 16;
        if (chipLower.contains("9200")) return 15.5;
        if (chipLower.contains("9000")) return 15;
        if (chipLower.contains("8300")) return 13;
        if (chipLower.contains("8200")) return 12;
        
        return 5; // Có chip nhưng không xác định được
    }

    private double scoreCameraQuality(String cameraRear, String cameraFront) {
        double score = 0;
        
        if (cameraRear != null && !cameraRear.isBlank()) {
            String rear = cameraRear.toLowerCase();
            
            // Điểm theo MP camera chính
            if (rear.contains("200mp")) score += 20;
            else if (rear.contains("108mp")) score += 15;
            else if (rear.contains("64mp") || rear.contains("50mp")) score += 12;
            else if (rear.contains("48mp")) score += 10;
            else if (rear.contains("12mp")) score += 6;
            
            // Công nghệ camera
            if (rear.contains("ois")) score += 3;
            if (rear.contains("telephoto") || rear.contains("tele")) score += 3;
            if (rear.contains("zoom")) score += 2;
            if (rear.contains("ultra") || rear.contains("ultrawide")) score += 2;
        }
        
        if (cameraFront != null && !cameraFront.isBlank()) {
            String front = cameraFront.toLowerCase();
            if (front.contains("32mp") || front.contains("40mp")) score += 3;
            else if (front.contains("12mp") || front.contains("16mp")) score += 2;
        }
        
        return score;
    }

    private double scoreBatteryCapacity(String battery) {
        if (battery == null || battery.isBlank()) return 0;
        
        // Trích xuất số mAh
        Pattern pattern = Pattern.compile("(\\d+)\\s*mah", Pattern.CASE_INSENSITIVE);
        Matcher matcher = pattern.matcher(battery);
        
        if (matcher.find()) {
            try {
                int mah = Integer.parseInt(matcher.group(1));
                return mah / 100.0; // 5000mAh = 50 điểm
            } catch (NumberFormatException e) {
                return 0;
            }
        }
        
        return 0;
    }

    private double scoreScreenQuality(String screen, String refreshRate) {
        double score = 0;
        
        if (screen != null && !screen.isBlank()) {
            String s = screen.toLowerCase();
            
            // Kích thước màn hình (lớn hơn = tốt hơn)
            Pattern sizePattern = Pattern.compile("(\\d+\\.\\d+)\"");
            Matcher matcher = sizePattern.matcher(s);
            if (matcher.find()) {
                try {
                    double size = Double.parseDouble(matcher.group(1));
                    score += size * 2; // 6.7" = 13.4 điểm
                } catch (NumberFormatException e) {
                    // ignore
                }
            }
            
            // Công nghệ màn hình
            if (s.contains("amoled") || s.contains("oled")) score += 5;
            if (s.contains("super")) score += 2;
            if (s.contains("dynamic")) score += 2;
        }
        
        if (refreshRate != null && !refreshRate.isBlank()) {
            String r = refreshRate.toLowerCase();
            if (r.contains("120hz")) score += 6;
            else if (r.contains("90hz")) score += 4;
            else if (r.contains("60hz")) score += 2;
        }
        
        return score;
    }

    /**
     * Class để lưu thông tin so sánh hãng
     */
    private static class BrandComparisonQuery {
        final String brand1;
        final String brand2;
        final String aspect; // camera, pin, hiệu năng, null = tổng thể
        
        BrandComparisonQuery(String brand1, String brand2, String aspect) {
            this.brand1 = brand1;
            this.brand2 = brand2;
            this.aspect = aspect;
        }
    }

    private Parsed parseJsonResponse(String raw) {
        if (raw == null) {
            return new Parsed(null, null, null);
        }

        String trimmed = raw.trim();
        String json = extractFirstJsonObject(trimmed);
        if (json == null) {
            return tryRegexFallback(trimmed);
        }

        try {
            JsonNode node = localObjectMapper.readTree(json);
            String answer = node.path("answer").asText("").trim();
            answer = unescapeJsonString(answer);

            List<Integer> rec = readIntList(node.get("recommendedProductIds"));
            List<Integer> cmp = readIntList(node.get("comparedProductIds"));

            return new Parsed(answer, rec, cmp);
        } catch (Exception e) {
            // Fallback to regex on the extracted JSON first, if that fails, try regex on full raw
            Parsed p = tryRegexFallback(json);
            if (p.answer != null && !p.answer.isBlank() && !p.answer.equals(json)) {
                return p;
            }
            return tryRegexFallback(trimmed);
        }
    }

    private Parsed tryRegexFallback(String raw) {
        if (raw == null) {
            return new Parsed(null, null, null);
        }
        
        // Try to find the "answer" field with closed quotes first, allowing escaped quotes inside
        Pattern pattern = Pattern.compile("\"answer\"\\s*:\\s*\"((?:[^\"\\\\]|\\\\.)*)\"");
        Matcher matcher = pattern.matcher(raw);
        if (matcher.find()) {
            String answer = matcher.group(1);
            answer = unescapeJsonString(answer);
            return new Parsed(answer, extractIdsWithRegex(raw, "recommendedProductIds"), extractIdsWithRegex(raw, "comparedProductIds"));
        }
        
        // If not found with closed quotes, try to find unclosed quotes (e.g. truncated JSON)
        Pattern unclosedPattern = Pattern.compile("\"answer\"\\s*:\\s*\"(.*)", Pattern.DOTALL);
        Matcher unclosedMatcher = unclosedPattern.matcher(raw);
        if (unclosedMatcher.find()) {
            String answer = unclosedMatcher.group(1);
            int endQuoteIdx = findUnescapedQuoteIndex(answer);
            if (endQuoteIdx >= 0) {
                answer = answer.substring(0, endQuoteIdx);
            }
            answer = unescapeJsonString(answer);
            return new Parsed(answer, extractIdsWithRegex(raw, "recommendedProductIds"), extractIdsWithRegex(raw, "comparedProductIds"));
        }

        // If even regex fallback fails, clean up markdown wrapper if possible
        String cleaned = raw;
        if (cleaned.contains("```json")) {
            cleaned = cleaned.substring(cleaned.indexOf("```json") + 7).trim();
        } else if (cleaned.contains("```")) {
            cleaned = cleaned.substring(cleaned.indexOf("```") + 3).trim();
        }
        if (cleaned.startsWith("{")) {
            cleaned = cleaned.replaceAll("^\\{\\s*\"answer\"\\s*:\\s*\"", "");
            cleaned = cleaned.replaceAll("\"\\s*,?\\s*\"(recommended|compared)ProductIds.*$", "");
            cleaned = cleaned.replaceAll("\"\\s*\\}$", "");
        }
        cleaned = unescapeJsonString(cleaned);
        return new Parsed(cleaned, null, null);
    }

    private int findUnescapedQuoteIndex(String s) {
        for (int i = 0; i < s.length(); i++) {
            if (s.charAt(i) == '"') {
                int backslashes = 0;
                for (int j = i - 1; j >= 0; j--) {
                    if (s.charAt(j) == '\\') {
                        backslashes++;
                    } else {
                        break;
                    }
                }
                if (backslashes % 2 == 0) {
                    return i;
                }
            }
        }
        return -1;
    }

    private String unescapeJsonString(String s) {
        if (s == null) return null;
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if (c == '\\' && i + 1 < s.length()) {
                char next = s.charAt(i + 1);
                if (next == 'n') {
                    sb.append('\n');
                    i++;
                } else if (next == 't') {
                    sb.append('\t');
                    i++;
                } else if (next == 'r') {
                    sb.append('\r');
                    i++;
                } else if (next == '\"') {
                    sb.append('\"');
                    i++;
                } else if (next == '\\') {
                    sb.append('\\');
                    i++;
                } else {
                    sb.append(c);
                }
            } else {
                sb.append(c);
            }
        }
        return sb.toString();
    }

    private List<Integer> extractIdsWithRegex(String raw, String fieldName) {
        Pattern p = Pattern.compile("\"" + fieldName + "\"\\s*:\\s*\\[([^\\]]*)\\]");
        Matcher m = p.matcher(raw);
        if (m.find()) {
            String listContent = m.group(1);
            List<Integer> out = new ArrayList<>();
            Pattern numPat = Pattern.compile("\\d+");
            Matcher numMat = numPat.matcher(listContent);
            while (numMat.find()) {
                try {
                    out.add(Integer.parseInt(numMat.group()));
                } catch (NumberFormatException ignored) {}
            }
            return out;
        }
        return null;
    }

    private List<Integer> readIntList(JsonNode arrNode) {
        if (arrNode == null || !arrNode.isArray()) {
            return null;
        }
        List<Integer> out = new ArrayList<>();
        for (JsonNode n : arrNode) {
            if (n != null && n.isNumber()) {
                out.add(n.asInt());
            }
        }
        return out;
    }

    private String extractFirstJsonObject(String text) {
        int start = text.indexOf('{');
        if (start < 0) return null;

        int depth = 0;
        for (int i = start; i < text.length(); i++) {
            char c = text.charAt(i);
            if (c == '{') depth++;
            else if (c == '}') {
                depth--;
                if (depth == 0) {
                    return text.substring(start, i + 1);
                }
            }
        }
        return null;
    }

    private String tryExtractAnswerFromRaw(String text) {
        if (text == null) return "";
        Parsed p = tryRegexFallback(text);
        if (p.answer != null && !p.answer.isBlank() && !p.answer.equals(text)) {
            return p.answer;
        }
        
        // If it starts with markdown code block or JSON brackets but contains unparsed response
        String json = extractFirstJsonObject(text);
        if (json != null) {
            Parsed pj = tryRegexFallback(json);
            if (pj.answer != null && !pj.answer.isBlank() && !pj.answer.equals(json)) {
                return pj.answer;
            }
        }
        
        return text;
    }
    
    // ============================================
    // MÀU SẮC DETECTION
    // ============================================
    
    /**
     * Phát hiện màu sắc trong câu hỏi của khách hàng
     */
    private String detectColor(String message) {
        if (message == null || message.isBlank()) return null;
        
        String msg = message.toLowerCase().trim();
        
        // Map các từ khóa màu tiếng Việt sang tên màu chuẩn
        if (msg.contains("màu đỏ") || msg.contains("đỏ")) return "Đỏ";
        if (msg.contains("màu xanh dương") || msg.contains("xanh dương")) return "Xanh Dương";
        if (msg.contains("màu xanh lá") || msg.contains("xanh lá") || msg.contains("xanh lục")) return "Xanh Lá";
        if (msg.contains("màu vàng") || msg.contains("vàng")) return "Vàng";
        if (msg.contains("màu cam") || msg.contains("cam")) return "Cam";
        if (msg.contains("màu hồng") || msg.contains("hồng") || msg.contains("pink")) return "Hồng";
        if (msg.contains("màu tím") || msg.contains("tím") || msg.contains("purple")) return "Tím";
        if (msg.contains("màu đen") || msg.contains("đen") || msg.contains("black")) return "Đen";
        if (msg.contains("màu trắng") || msg.contains("trắng") || msg.contains("white")) return "Trắng";
        if (msg.contains("màu xám") || msg.contains("xám") || msg.contains("gray") || msg.contains("grey")) return "Xám";
        if (msg.contains("màu bạc") || msg.contains("bạc") || msg.contains("silver")) return "Bạc";
        if (msg.contains("màu vàng đồng") || msg.contains("vàng đồng") || msg.contains("gold")) return "Vàng Đồng";
        if (msg.contains("màu xanh lam") || msg.contains("xanh lam")) return "Xanh Lam";
        if (msg.contains("màu xanh ngọc") || msg.contains("xanh ngọc")) return "Xanh Ngọc";
        if (msg.contains("màu titan") || msg.contains("titan") || msg.contains("titanium")) return "Titan";
        
        return null;
    }
    
    /**
     * Kiểm tra sản phẩm có màu yêu cầu không
     */
    private boolean productHasColor(Product product, String requestedColor) {
        if (product == null || product.getProductColors() == null || requestedColor == null) {
            return false;
        }
        
        String normalized = requestedColor.toLowerCase().trim();
        
        return product.getProductColors().stream()
                .anyMatch(color -> {
                    String colorName = color.getColorName();
                    if (colorName == null) return false;
                    
                    String cn = colorName.toLowerCase().trim();
                    
                    // Exact match
                    if (cn.equals(normalized)) return true;
                    
                    // Contains match
                    if (cn.contains(normalized) || normalized.contains(cn)) return true;
                    
                    // Check for common variations
                    if (normalized.equals("cam") && (cn.contains("orange") || cn.contains("cam"))) return true;
                    if (normalized.equals("đỏ") && (cn.contains("red") || cn.contains("đỏ"))) return true;
                    if (normalized.equals("xanh dương") && (cn.contains("blue") || cn.contains("xanh"))) return true;
                    if (normalized.equals("xanh lá") && (cn.contains("green") || cn.contains("xanh"))) return true;
                    if (normalized.equals("vàng") && (cn.contains("yellow") || cn.contains("vàng"))) return true;
                    if (normalized.equals("hồng") && (cn.contains("pink") || cn.contains("hồng") || cn.contains("rose"))) return true;
                    if (normalized.equals("tím") && (cn.contains("purple") || cn.contains("tím") || cn.contains("violet"))) return true;
                    if (normalized.equals("đen") && (cn.contains("black") || cn.contains("đen"))) return true;
                    if (normalized.equals("trắng") && (cn.contains("white") || cn.contains("trắng"))) return true;
                    if (normalized.equals("xám") && (cn.contains("gray") || cn.contains("grey") || cn.contains("xám"))) return true;
                    if (normalized.equals("bạc") && (cn.contains("silver") || cn.contains("bạc"))) return true;
                    if (normalized.equals("vàng đồng") && (cn.contains("gold") || cn.contains("vàng đồng"))) return true;
                    if (normalized.equals("titan") && (cn.contains("titan") || cn.contains("titanium"))) return true;
                    
                    return false;
                });
    }
    
    // ============================================
    // INNER CLASS
    // ============================================
    
    private static class Parsed {
        final String answer;
        final List<Integer> recommendedProductIds;
        final List<Integer> comparedProductIds;

        private Parsed(String answer, List<Integer> recommendedProductIds, List<Integer> comparedProductIds) {
            this.answer = answer;
            this.recommendedProductIds = recommendedProductIds;
            this.comparedProductIds = comparedProductIds;
        }
    }
}
