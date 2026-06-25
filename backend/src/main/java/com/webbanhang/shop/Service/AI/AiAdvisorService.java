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

    public AiAdvisorService(
            ProductRepository productRepository,
            AiChatService aiChatService,
            ObjectMapper objectMapper
    ) {
        this.productRepository = productRepository;
        this.aiChatService = aiChatService;
        this.objectMapper = objectMapper;
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
                + "\nRanking chip từ mạnh → yếu (năm 2024-2026):"
                + "\n**Flagship đỉnh cao:**"
                + "\n- Apple A19 Pro (2026) > A18 Pro (2024) > A17 Pro (2023) > A16 Bionic (2022) > A15 Bionic (2021) > A14 Bionic (2020)"
                + "\n- Snapdragon 8 Elite (2024) ≈ 8 Gen 3 (2023-2024) > 8+ Gen 2 (2023) > 8 Gen 2 (2022) > 8+ Gen 1 (2022) > 8 Gen 1 (2021) > 888 (2021)"
                + "\n- Dimensity 9300+ > 9300 > 9200+ > 9200 > 9000"
                + "\n**Tầm trung cao:**"
                + "\n- Snapdragon 7+ Gen 3, 7s Gen 3, 7 Gen 3"
                + "\n- Dimensity 8300, 8200, 8100"
                + "\n**Tầm trung:**"
                + "\n- Snapdragon 695, 680"
                + "\n- Dimensity 6000 series, Helio G series"
                + "\nQUY TẮC: Chip thế hệ mới hơn (số cao hơn) = hiệu năng mạnh hơn, KHÔNG dựa vào mô tả text."
                + "\n\n### KIẾN THỨC CHUYÊN MÔN - PHÂN TÍCH CAMERA (Chụp ảnh):"
                + "\nĐánh giá camera dựa trên:"
                + "\n1. **Cảm biến chính (MP cao + kích thước lớn):**"
                + "\n   - Xuất sắc: ≥ 50MP (Samsung GN2, Sony IMX989, IMX800)"
                + "\n   - Tốt: 48MP, 64MP"
                + "\n   - Trung bình: 12-16MP (trừ iPhone dùng cảm biến lớn)"
                + "\n2. **Camera phụ:** Ultra-wide (≥12MP), Telephoto/Zoom quang (≥2x), Macro"
                + "\n3. **Công nghệ:** OIS (chống rung quang học), Night mode, AI processing"
                + "\n4. **Camera trước:** ≥32MP tốt cho selfie, ≥12MP chấp nhận được"
                + "\nLƯU Ý: iPhone 14 Pro trở lên có camera 48MP với cảm biến lớn = xuất sắc dù MP không cao nhất."
                + "\n\n### CÁCH PHÂN TÍCH:"
                + "\n- Đọc thông số chip/camera từ data"
                + "\n- So sánh với bảng ranking trên"
                + "\n- Ưu tiên sản phẩm có chip/camera THỰC TẾ mạnh hơn"
                + "\n- KHÔNG chỉ tin vào text mô tả (vì có thể thiếu hoặc không chính xác)"
                + "\n\nPhong cách: Ngắn gọn (60-80 từ), tự nhiên, emoji phù hợp (🔥💪⚡🎮📸), tập trung vào điểm mạnh chính. "
                + "JSON schema: {\"answer\": string, \"recommendedProductIds\": number[]}";

        String userPrompt = "Nhu cầu: " + userMessage + "\n\n"
                + "Sản phẩm (CHỈ dùng productId này, CHÚ Ý status):\n"
                + buildCompactProductContext(sample)
                + "\n\nChọn " + k + " sản phẩm phù hợp nhất. Ưu tiên CÒN_HÀNG. "
                + "Giải thích NGẮN GỌN (1-2 câu/máy) tại sao phù hợp: chip, RAM, pin, camera... "
                + "CHỈ nhắc TÊN sản phẩm, KHÔNG nhắc productId. "
                + "60-80 từ, tự nhiên, emoji.";

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
        String cleanedAnswer = answer
                .replaceAll("(?i)\\(\\s*product\\s*id\\s*=\\s*\\d+\\s*\\)", "")
                .replaceAll("(?i)product\\s*id\\s*=\\s*\\d+", "")
                .replaceAll("\\s{2,}", " ")
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
                + "SO SÁNH chi tiết " + productCount + " sản phẩm theo ĐÚNG format dưới đây. "
                + "CHỈ dùng dữ liệu được cung cấp. KHÔNG bịa. KHÔNG nhắc sản phẩm/hãng NGOÀI danh sách. "
                + "\n\n### KIẾN THỨC CHUYÊN MÔN - PHÂN TÍCH CHIP:"
                + "\nRanking chip (mạnh → yếu):"
                + "\n- Apple: A19 Pro > A18 Pro > A17 Pro > A16 > A15 > A14"
                + "\n- Snapdragon: 8 Elite ≈ 8 Gen 3 > 8+ Gen 2 > 8 Gen 2 > 8+ Gen 1 > 8 Gen 1 > 888 > 7+ Gen 3 > 7 Gen 3"
                + "\n- Dimensity: 9300+ > 9300 > 9200+ > 9200 > 9000 > 8300 > 8200"
                + "\nQUY TẮC: Thế hệ cao hơn = mạnh hơn, KHÔNG chỉ dựa text mô tả."
                + "\n\n### KIẾN THỨC CHUYÊN MÔN - PHÂN TÍCH CAMERA:"
                + "\n- Xuất sắc: ≥50MP cảm biến lớn, có OIS, Telephoto, Ultra-wide"
                + "\n- Tốt: 48MP (đặc biệt iPhone 14 Pro+), 64MP"
                + "\n- Trung bình: 12-16MP (iPhone cũ vẫn tốt nhờ xử lý)"
                + "\nCamera trước: ≥32MP xuất sắc, ≥12MP tốt"
                + "\n\n### CÁCH PHÂN TÍCH MỖI MỤC:"
                + "\n- 🎮 Hiệu năng: Dùng bảng ranking chip, so sánh thế hệ"
                + "\n- 📸 Camera: Dựa MP + công nghệ (OIS, zoom), không chỉ số MP"
                + "\n- 💰 Giá: So sánh giá thấp nhất của từng máy"
                + "\n- 🔋 Pin: Dung lượng mAh + công suất sạc (W)"
                + "\n- 📱 Màn hình: Kích thước + tần số quét (Hz)"
                + "\n\nFORMAT BẮT BUỘC:"
                + "\n\n💰 Giá cả"
                + "\n- [Sản phẩm A](/product/ID): giá thấp nhất - cao nhất"
                + "\n- [Sản phẩm B](/product/ID): giá thấp nhất - cao nhất"
                + "\n(liệt kê hết " + productCount + " sản phẩm)"
                + "\nTốt nhất mục này: [Tên rẻ nhất](/product/ID) - rẻ nhất."
                + "\n\n📸 Camera"
                + "\n- [Sản phẩm A](/product/ID): Camera sau XXX, trước YYY"
                + "\n- [Sản phẩm B](/product/ID): Camera sau XXX, trước YYY"
                + "\n(liệt kê hết " + productCount + " sản phẩm)"
                + "\nTốt nhất mục này: [Tên tốt nhất](/product/ID) - lý do (dựa kiến thức camera)."
                + "\n\n🎮 Hiệu năng"
                + "\n- [Sản phẩm A](/product/ID): Chip XXX, RAM YYY"
                + "\n- [Sản phẩm B](/product/ID): Chip XXX, RAM YYY"
                + "\n(liệt kê hết " + productCount + " sản phẩm)"
                + "\nTốt nhất mục này: [Tên mạnh nhất](/product/ID) - lý do (dựa ranking chip)."
                + "\n\n🔋 Pin & Sạc"
                + "\n- [Sản phẩm A](/product/ID): Pin XXXmAh, sạc YYW"
                + "\n- [Sản phẩm B](/product/ID): Pin XXXmAh, sạc YYW"
                + "\n(liệt kê hết " + productCount + " sản phẩm)"
                + "\nTốt nhất mục này: [Tên trâu nhất](/product/ID) - lý do."
                + "\n\n📱 Màn hình"
                + "\n- [Sản phẩm A](/product/ID): Kích thước, tần số quét"
                + "\n- [Sản phẩm B](/product/ID): Kích thước, tần số quét"
                + "\n(liệt kê hết " + productCount + " sản phẩm)"
                + "\nTốt nhất mục này: [Tên đẹp nhất](/product/ID) - lý do."
                + "\n\n🏆 Kết luận"
                + "\nSản phẩm tốt nhất tổng thể: [Tên](/product/ID) - lý do tổng hợp."
                + "\n\nQUY TẮC:"
                + "\n- PHẢI liệt kê ĐẦY ĐỦ " + productCount + " sản phẩm ở MỖI mục (💰📸🎮🔋📱)"
                + "\n- PHẢI dùng markdown link [Tên](/product/ID) cho mọi sản phẩm"
                + "\n- Mỗi mục PHẢI có dòng 'Tốt nhất mục này:' với lý do DỰA TRÊN KIẾN THỨC CHUYÊN MÔN"
                + "\n- Format: Dùng emoji, bullet (-), xuống dòng rõ ràng"
                + "\n- Chi tiết đủ nhưng không dài dòng (150-250 từ toàn bộ)"
                + "\n\nJSON schema: {\"answer\": string, \"comparedProductIds\": number[]}";

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
                + "\n\nSo sánh theo mục:\n"
                + "1) 💰 Giá (thấp→cao)\n"
                + "2) 📸 Camera (sau+trước)\n"
                + "3) 🎮 Hiệu năng (chip+RAM)\n"
                + "4) 🔋 Pin (dung lượng+sạc)\n"
                + "5) 📱 Màn hình (size+Hz)\n"
                + "6) 🏆 Kết luận (chọn 1 tốt nhất)\n\n"
                + "Mỗi mục: 2-3 câu ngắn + chọn tốt nhất. NGẮN GỌN, 150-200 từ TOÀN BỘ.";

        String raw = aiChatService.chat(systemPrompt, userPrompt);
        Parsed parsed = parseJsonResponse(raw);

        List<Integer> compared = parsed.comparedProductIds == null ? ids : parsed.comparedProductIds.stream()
                .filter(Objects::nonNull)
                .filter(ids::contains)
                .distinct()
                .toList();

        return new AiResponse(
                parsed.answer == null || parsed.answer.isBlank() ? raw : parsed.answer,
                List.of(),
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
                .anyMatch(v -> v.getQuantity() != null && v.getQuantity() > 0);
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

    private Parsed parseJsonResponse(String raw) {
        if (raw == null) {
            return new Parsed(null, null, null);
        }

        String trimmed = raw.trim();
        String json = extractFirstJsonObject(trimmed);
        if (json == null) {
            return new Parsed(trimmed, null, null);
        }

        try {
            JsonNode node = objectMapper.readTree(json);
            String answer = node.path("answer").asText("").trim();

            List<Integer> rec = readIntList(node.get("recommendedProductIds"));
            List<Integer> cmp = readIntList(node.get("comparedProductIds"));

            return new Parsed(answer, rec, cmp);
        } catch (Exception e) {
            return new Parsed(trimmed, null, null);
        }
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
