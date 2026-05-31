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

        String systemPrompt = "Bạn là trợ lý tư vấn mua điện thoại cho website bán hàng. "
                + "Chỉ trả lời nội dung liên quan mua bán/tư vấn điện thoại. "
                + "Tuyệt đối không trả lời câu hỏi ngoài lề (thời tiết, bóng đá, chính trị, sức khỏe, phim nhạc, lập trình...). "
                + "Nếu câu hỏi không liên quan điện thoại, chỉ từ chối ngắn và điều hướng về tư vấn mua điện thoại. "
                + (wantsIphone ? "Người dùng đang yêu cầu iPhone/Apple, vì vậy chỉ được gợi ý iPhone/Apple và không được đề xuất hãng khác. " : "")
                + "Chỉ được sử dụng danh sách sản phẩm được cung cấp. "
                + "Không bịa thông tin và không tạo productId không có trong danh sách. "
                + "Trong phần answer: tuyệt đối KHÔNG được nhắc tới productId hay ký hiệu kiểu (productId=123). "
                + "Tuyệt đối không được nhắc tới bất kỳ sản phẩm/nhãn hàng nào không có trong danh sách cung cấp. "
                + "Kết quả phải là JSON đúng chuẩn với schema: {\"answer\": string, \"recommendedProductIds\": number[]}";

        String userPrompt = "Nhu cầu người dùng: " + userMessage + "\n\n"
                + "Danh sách sản phẩm (chỉ dùng các productId này):\n"
                + buildCompactProductContext(sample)
                + "\n\nYêu cầu: chọn đúng " + k + " sản phẩm phù hợp nhất (hoặc ít hơn nếu không đủ). "
                + "Trong answer, hãy giải thích ngắn gọn theo tiêu chí người dùng (giá, pin, camera, hiệu năng, màn hình...). "
                + "Trong answer chỉ được nhắc TÊN sản phẩm, không được nhắc productId. "
                + "Trả lời ngắn gọn, dưới 80 từ.";

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

        List<Integer> ids = productIds.stream().filter(Objects::nonNull).distinct().limit(3).toList();
        List<Product> products = productRepository.findAllActiveByProductIdInWithGraph(ids);
        if (products.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy sản phẩm để so sánh.");
        }

        String systemPrompt = "Bạn là trợ lý so sánh điện thoại. "
                + "Chỉ dùng dữ liệu sản phẩm được cung cấp. Không bịa. "
                + "Tuyệt đối không được nhắc tới bất kỳ sản phẩm/nhãn hàng nào không có trong danh sách cung cấp. "
                + "Kết quả phải là JSON đúng chuẩn với schema: {\"answer\": string, \"comparedProductIds\": number[]}.";

        String userPrompt = "Câu hỏi so sánh (có thể trống): " + (question == null ? "" : question.trim()) + "\n\n"
                + "Dữ liệu sản phẩm để so sánh:\n"
                + buildProductContext(products)
                + "\n\nYêu cầu: So sánh theo bảng/nhóm tiêu chí (giá, hiệu năng, camera, pin/sạc, màn hình, bộ nhớ). "
                + "Cuối cùng kết luận nên chọn máy nào theo từng nhu cầu. "
                + "Trả về comparedProductIds đúng theo danh sách input.";

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
        if (spec != null) {
            String specBlob = (
                    safe(spec.getChip()) + " " +
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
            if (msg.contains("game") || msg.contains("chơi")) {
                if (!safe(spec.getChip()).isBlank()) score += 1.5;
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
