package com.webbanhang.shop.Service.AI;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.webbanhang.shop.DTO.AI.AiResponse;
import com.webbanhang.shop.Model.Products.Product;
import com.webbanhang.shop.Model.Products.ProductSpec;
import com.webbanhang.shop.Repository.Products.ProductRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class AiAdvisorService {

    private final ProductRepository productRepository;
    private final AiChatService aiChatService;
    private final ObjectMapper objectMapper;
    private final ObjectMapper localObjectMapper;

    public AiAdvisorService(
            ProductRepository productRepository,
            AiChatService aiChatService,
            ObjectMapper objectMapper
    ) {
        this.productRepository = productRepository;
        this.aiChatService = aiChatService;
        this.objectMapper = objectMapper;
        this.localObjectMapper = objectMapper.copy()
                .configure(com.fasterxml.jackson.core.JsonParser.Feature.ALLOW_UNQUOTED_CONTROL_CHARS, true);
    }

    private static final String OFF_TOPIC_REDIRECT_ANSWER =
            "Shop chỉ hỗ trợ tư vấn mua bán điện thoại, nên Shop không trả lời câu hỏi ngoài chủ đề này. "
                    + "Bạn cho Shop biết nhu cầu (tầm giá, hãng, pin, camera, chơi game...) để Shop gợi ý máy phù hợp nhé!\n\n"
                    + "Dưới đây là 5 sản phẩm nổi bật tại MyPhone Store:";

    public AiResponse advise(String message, Integer topK) {
        int k = (topK == null || topK <= 0) ? 5 : Math.min(topK, 10);
        if (message == null || message.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Vui lòng nhập nhu cầu (message).");
        }

        String userMessage = normalizeUserMessage(message);

        if (!isPhoneRelated(userMessage)) {
            List<Product> allProducts = productRepository.findAllVisibleWithGraph();
            List<Integer> topProductIds = pickBestShopProducts(allProducts, k).stream()
                    .map(Product::getProductId)
                    .filter(Objects::nonNull)
                    .distinct()
                    .limit(k)
                    .toList();
            return new AiResponse(OFF_TOPIC_REDIRECT_ANSWER, topProductIds, List.of());
        }

        List<Product> products = productRepository.findAllVisibleWithGraph();

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

        List<Product> sample = pickRelevantProducts(products, userMessage, 40);

        String systemPrompt = "Bạn là trợ lý tư vấn mua điện thoại chuyên nghiệp của MyPhone Store với kiến thức chuyên sâu về phần cứng. "
                + "CHỈ TƯ VẤN điện thoại có trong danh sách cung cấp. "
                + "KHÔNG trả lời câu hỏi ngoài lề (thời tiết, bóng đá, chính trị, sức khỏe, phim nhạc, lập trình, v.v.). "
                + "Nếu câu hỏi không liên quan điện thoại trong shop, từ chối lịch sự và hướng về tư vấn điện thoại. "
                + (wantsIphone ? "Người dùng YÊU CẦU iPhone/Apple → CHỈ gợi ý iPhone/Apple, KHÔNG đề xuất hãng khác. " : "")
                + "CHỈ dùng sản phẩm trong danh sách. KHÔNG bịa thông tin hay productId. "
                + "Mỗi sản phẩm có status (CÒN_HÀNG/HẾT_HÀNG). Ưu tiên CÒN_HÀNG. Nếu gợi ý HẾT_HÀNG phải nói rõ 'tạm hết hàng'. "
                + "BẮT BUỘC: Khi nhắc tên sản phẩm, PHẢI dùng markdown link: [Tên sản phẩm](/product/productId). "
                + "Ví dụ: [iPhone 14 Pro Max](/product/123) thay vì chỉ iPhone 14 Pro Max. "
                + "\n\n### KIẾN THỨC CHUYÊN MÔN - PHÂN TÍCH CHIP (Gaming/Hiệu năng):"
                + "\n\n### XỬ LÝ CÂU HỎI SO SÁNH:"
                + "\nNếu user hỏi SO SÁNH (ví dụ: 'so sánh camera Samsung vs iPhone', 'iPhone hay Samsung tốt hơn'):"
                + "\n1. Chọn sản phẩm ĐẠI DIỆN tốt nhất của mỗi hãng"
                + "\n2. So sánh ngắn gọn khía cạnh user quan tâm (camera, hiệu năng, pin, hoặc chung)"
                + "\n3. KẾT LUẬN RÕ RÀNG: Sản phẩm nào tốt hơn và tại sao"
                + "\n4. Format cực kỳ ngắn gọn, dễ đọc với emoji và bullet points"
                + "\n\nVí dụ câu trả lời SO SÁNH TỐT:"
                + "\n📸 **So sánh camera:**"
                + "\n• [Samsung Galaxy S25 Ultra](/product/X): 200MP, zoom 100x 🔭"
                + "\n• [iPhone 17 Pro Max](/product/Y): 48MP, xử lý đêm tốt 🌙"
                + "\n✅ Chọn Samsung để zoom xa, chọn iPhone để chụp đêm đẹp tự nhiên."
                + "\n\nBẮT BUỘC CHỈ PHẢN HỒI JSON: Bạn CHỈ ĐƯỢC PHÉP trả về một đối tượng JSON hợp lệ duy nhất, tuyệt đối không viết thêm lời dẫn, không bọc trong ký tự markdown như ```json. "
                + "Đối tượng JSON có cấu trúc chính xác như sau:\n"
                + "{\n"
                + "  \"answer\": \"Nội dung câu trả lời tư vấn bằng tiếng Việt ở đây. Câu trả lời phải cực kỳ NGẮN GỌN và cô đọng (dưới 60 từ cho câu thường, dưới 100 từ cho câu so sánh). Sử dụng emoji và markdown bold/link phù hợp. BẮT BUỘC: Nếu cần xuống dòng trong câu trả lời, hãy sử dụng chuỗi '\\\\n' (hai ký tự là dấu gạch chéo ngược và chữ n) thay vì ký tự xuống dòng thực tế để tránh làm hỏng định dạng JSON.\",\n"
                + "  \"recommendedProductIds\": [id_sản_phẩm_được_gợi_ý]\n"
                + "}";

        String userPrompt = "Nhu cầu: " + userMessage + "\n\n"
                + "Sản phẩm trong Shop (CHỈ dùng productId này, CHÚ Ý status):\n"
                + buildCompactProductContext(sample)
                + "\n\n🎯 NHIỆM VỤ CỦA BẠN:"
                + "\n1. ĐỌC KỸ thông số THỰC TẾ của từng sản phẩm"
                + "\n2. Chọn " + k + " sản phẩm PHÙ HỢP NHẤT"
                + "\n3. GIẢI THÍCH cực kỳ ngắn gọn (1 câu ngắn cho mỗi sản phẩm) tại sao phù hợp:"
                + "\n   - Nêu THÔNG SỐ THỰC TẾ ngắn gọn"
                + "\n   - Ưu tiên sản phẩm CÒN_HÀNG"
                + "\n   - Nếu gợi ý sản phẩm HẾT_HÀNG phải nói rõ 'tạm hết hàng'"
                + "\n\n💬 PHONG CÁCH TRẢ LỜI:"
                + "\n- Thân thiện, tự nhiên nhưng Cực kỳ ngắn gọn và súc tích (dưới 60 từ cho câu thường, dưới 100 từ cho so sánh)"
                + "\n- Dùng emoji phù hợp (🔥💪⚡🎮📸💰)"
                + "\n- CHỈ nhắc TÊN sản phẩm với link [Tên](/product/ID), KHÔNG nhắc productId"
                + "\n\nBẮT BUỘC CHỈ TRẢ VỀ ĐỐI TƯỢNG JSON theo schema sau (không thêm bất kỳ văn bản nào khác ngoài JSON):\n"
                + "{\n"
                + "  \"answer\": \"Nội dung câu trả lời cực kỳ NGẮN GỌN (dưới 60 từ cho câu thường, dưới 100 từ cho so sánh), thân thiện, có emoji và markdown link. Sử dụng chuỗi '\\\\n' để xuống dòng.\",\n"
                + "  \"recommendedProductIds\": [id_sản_phẩm_được_gợi_ý]\n"
                + "}";

        String raw = aiChatService.chat(systemPrompt, userPrompt);
        Parsed parsed = parseJsonResponse(raw);

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
                List.of()
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
        
        String systemPrompt = "Bạn là chuyên gia so sánh điện thoại của MyPhone Store với kiến thức chuyên sâu về phần cứng. "
                + "Hãy SO SÁNH " + productCount + " sản phẩm theo đúng cấu trúc 5 khía cạnh với KẾT LUẬN ngắn gọn sau mỗi mục. "
                + "CHỈ dùng dữ liệu được cung cấp. KHÔNG tự bịa thông tin. "
                + "\n\n### FORMAT BẮT BUỘC (NGẮN GỌN, DỄ ĐỌC):"
                + "\n\n💰 **Giá bán & Biến thể**"
                + "\n- **[Tên SP1](/product/ID1)**: Giá X VNĐ (RAM/ROM)."
                + "\n- **[Tên SP2](/product/ID2)**: Giá Y VNĐ (RAM/ROM)."
                + "\n➡️ *Kết luận:* [1 câu ngắn về giá]"
                + "\n\n🎮 **Hiệu năng & Chip**"
                + "\n- **[Tên SP1](/product/ID1)**: Chip A, đặc điểm."
                + "\n- **[Tên SP2](/product/ID2)**: Chip B, đặc điểm."
                + "\n➡️ *Kết luận:* [1 câu ngắn về hiệu năng]"
                + "\n\n📸 **Camera**"
                + "\n- **[Tên SP1](/product/ID1)**: Camera sau X, trước Y."
                + "\n- **[Tên SP2](/product/ID2)**: Camera sau A, trước B."
                + "\n➡️ *Kết luận:* [1 câu ngắn về camera]"
                + "\n\n🔋 **Pin & Sạc**"
                + "\n- **[Tên SP1](/product/ID1)**: X mAh, sạc Y W."
                + "\n- **[Tên SP2](/product/ID2)**: A mAh, sạc B W."
                + "\n➡️ *Kết luận:* [1 câu ngắn về pin]"
                + "\n\n📱 **Màn hình**"
                + "\n- **[Tên SP1](/product/ID1)**: X inch, tấm nền Y."
                + "\n- **[Tên SP2](/product/ID2)**: A inch, tấm nền B."
                + "\n➡️ *Kết luận:* [1 câu ngắn về màn hình]"
                + "\n\n🏆 **Tổng kết**"
                + "\nChọn **[Tên SP](/product/ID)** nếu [lý do]. Chọn **[Tên SP](/product/ID)** nếu [lý do]."
                + "\n\n⚠️ QUY TẮC NGHIÊM NGẶT:"
                + "\n- NGẮN GỌN TỐI ĐA: Mỗi mục chỉ liệt kê thông số chính, kết luận 1 câu duy nhất."
                + "\n- BẮT BUỘC: Mỗi khía cạnh có KẾT LUẬN 1 câu (không dài dòng, đi thẳng vào điểm mạnh/yếu)."
                + "\n- Chỉ nêu thông số QUAN TRỌNG nhất, bỏ qua chi tiết không cần thiết."
                + "\n- TỔNG SỐ TỪ: Dưới 300 từ để súc tích, dễ đọc nhanh."
                + "\n- Format: '\\\\n\\\\n' phân tách phần, '\\\\n' xuống dòng."
                + "\n- CHỈ TRẢ VỀ JSON: {\"answer\": string, \"comparedProductIds\": number[]}";

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

        String userPrompt = (question != null && !question.isBlank() ? "Câu hỏi: " + question.trim() + "\n\n" : "")
                + "Sản phẩm so sánh:"
                + productContext.toString()
                + "\n\nHãy so sánh chi tiết các sản phẩm trên theo đúng cấu trúc 5 khía cạnh với KẾT LUẬN sau mỗi mục. Trình bày chi tiết thông số thực tế của từng sản phẩm. "
                + "BẮT BUỘC: Mỗi khía cạnh (Giá, Hiệu năng, Camera, Pin, Màn hình) phải có dòng kết luận ngắn gọn (➡️ *Kết luận:*) về sản phẩm nào tốt hơn. "
                + "Câu trả lời trong 'answer' phải dưới 400 từ.\n"
                + "BẮT BUỘC CHỈ TRẢ VỀ ĐỐI TƯỢNG JSON: {\"answer\": string, \"comparedProductIds\": number[]}. Sử dụng chuỗi '\\\\n\\\\n' để phân tách các phần và '\\\\n' để phân dòng.";

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
                compared
        );
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
                    
                    // Apple A-series (higher number = newer/better)
                    if (chipLower.contains("a19")) chipScore = 19;
                    else if (chipLower.contains("a18")) chipScore = 18;
                    else if (chipLower.contains("a17")) chipScore = 17;
                    else if (chipLower.contains("a16")) chipScore = 16;
                    else if (chipLower.contains("a15")) chipScore = 15;
                    else if (chipLower.contains("a14")) chipScore = 14;
                    
                    // Snapdragon (8 Gen series)
                    else if (chipLower.contains("8 gen 3") || chipLower.contains("8 gen3")) chipScore = 17;
                    else if (chipLower.contains("8 gen 2") || chipLower.contains("8 gen2")) chipScore = 16;
                    else if (chipLower.contains("8 gen 1") || chipLower.contains("8 gen1")) chipScore = 15;
                    else if (chipLower.contains("8+ gen 1") || chipLower.contains("8+")) chipScore = 16;
                    else if (chipLower.contains("snapdragon 888")) chipScore = 14;
                    else if (chipLower.contains("snapdragon 8 elite")) chipScore = 18;
                    
                    // Dimensity
                    else if (chipLower.contains("dimensity 9300")) chipScore = 17;
                    else if (chipLower.contains("dimensity 9200")) chipScore = 16;
                    else if (chipLower.contains("dimensity 9000")) chipScore = 15;
                    else if (chipLower.contains("dimensity 8")) chipScore = 13;
                    
                    // Score based on chip tier
                    if (chipScore >= 17) score += 10.0; // Latest flagship (A17+, SD 8 Gen 3, Dimensity 9300)
                    else if (chipScore >= 15) score += 7.0; // Previous flagship
                    else if (chipScore >= 13) score += 4.0; // High-end
                    else score += 2.0; // Has chip info
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
                "điện thoại", "smartphone", "phone", "iphone", "ipad", "samsung", "xiaomi", "oppo", "vivo", "realme", "oneplus",
                "galaxy", "redmi", "poco", "pixel", "nokia", "sony",
                "ram", "rom", "bộ nhớ", "storage", "gb", "camera", "cam", "pin", "battery", "sạc", "charge", "màn", "screen", "màu", "color",
                "chip", "snapdragon", "mediatek", "exynos", "dimensity", "ios", "android", "kháng nước", "chống nước", "waterproof",
                "giá", "triệu", "dưới", "tầm", "so sánh", "review", "cấu hình", "gaming", "game", "chơi game",
                "myphone", "cửa hàng", "mua máy", "đổi máy", "tư vấn điện thoại", "tư vấn máy"
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
        
        // If everything fails, strip JSON curly braces and quotes to be safe
        String cleaned = text.replaceAll("\\{[\\s\\S]*?\\}", "").trim();
        if (cleaned.isBlank()) {
            return text.replace("```json", "").replace("```", "").replace("{", "").replace("}", "").trim();
        }
        return cleaned;
    }

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
