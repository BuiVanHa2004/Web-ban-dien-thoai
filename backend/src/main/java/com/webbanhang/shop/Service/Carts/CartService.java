package com.webbanhang.shop.Service.Carts;

import com.webbanhang.shop.DTO.Carts.CartDto;
import com.webbanhang.shop.DTO.Carts.CartItemDto;
import com.webbanhang.shop.Model.Carts.Cart;
import com.webbanhang.shop.Model.Carts.CartItem;
import com.webbanhang.shop.Model.Products.Product;
import com.webbanhang.shop.Model.Products.ProductColor;
import com.webbanhang.shop.Model.Products.ProductVariant;
import com.webbanhang.shop.Repository.Carts.CartItemRepository;
import com.webbanhang.shop.Repository.Carts.CartRepository;
import com.webbanhang.shop.Repository.Customers.CustomerAccountRepository;
import com.webbanhang.shop.Repository.Products.ProductColorRepository;
import com.webbanhang.shop.Repository.Products.ProductRepository;
import com.webbanhang.shop.Repository.Products.ProductVariantRepository;
import com.webbanhang.shop.Service.Products.InventoryStockValidator;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Service
public class CartService {

    @PersistenceContext
    private EntityManager entityManager;

    private final CartRepository cartRepository;
    private final CartItemRepository cartItemRepository;
    private final ProductRepository productRepository;
    private final ProductColorRepository productColorRepository;
    private final ProductVariantRepository productVariantRepository;
    private final CustomerAccountRepository customerAccountRepository;
    private final InventoryStockValidator inventoryStockValidator;

    public CartService(
            CartRepository cartRepository,
            CartItemRepository cartItemRepository,
            ProductRepository productRepository,
            ProductColorRepository productColorRepository,
            ProductVariantRepository productVariantRepository,
            CustomerAccountRepository customerAccountRepository,
            InventoryStockValidator inventoryStockValidator
    ) {
        this.cartRepository = cartRepository;
        this.cartItemRepository = cartItemRepository;
        this.productRepository = productRepository;
        this.productColorRepository = productColorRepository;
        this.productVariantRepository = productVariantRepository;
        this.customerAccountRepository = customerAccountRepository;
        this.inventoryStockValidator = inventoryStockValidator;
    }

    private void validateCustomerActive(Integer customerId) {
        if (customerId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Khách hàng không tồn tại.");
        }
        var customer = customerAccountRepository.findByCustomerId(customerId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Khách hàng không tồn tại."));
        if (customer.getDeletedAt() != null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Tài khoản đã bị xóa.");
        }
        if (customer.getIsActive() != null && !customer.getIsActive()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Tài khoản đã bị khóa.");
        }
    }

    private Product requireProductActive(Integer productId) {
        Product product = productRepository.findByProductId(productId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy sản phẩm."));
        if (product.getDeletedAt() != null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Sản phẩm hiện không khả dụng.");
        }
        if (product.getIsActive() != null && !product.getIsActive()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Sản phẩm hiện không khả dụng.");
        }
        return product;
    }

    @Transactional
    public CartDto getOrCreateCart(Integer customerId) {
        System.out.println("CartService.getOrCreateCart called - customerId=" + customerId);
        validateCustomerActive(customerId);
        Cart cart = cartRepository.findByCustomerId(customerId).orElseGet(() -> {
            Cart c = new Cart();
            c.setCustomerId(customerId);
            Cart saved = cartRepository.save(c);
            System.out.println("Created cart in getOrCreateCart - cartId=" + saved.getCartId());
            return saved;
        });
        System.out.println("Cart found/created - cartId=" + cart.getCartId());

        List<CartItem> lines = cartItemRepository.findAllByCartIdWithProduct(cart.getCartId());
        System.out.println("Cart items fetched: " + lines.size() + " items");
        for (CartItem item : lines) {
            System.out.println("  - CartItem id=" + item.getCartItemId() + ", productId=" + item.getProduct().getProductId() + ", qty=" + item.getQuantity());
        }
        
        List<CartItemDto> items = lines.stream().map(this::toDto).toList();
        int totalQty = items.stream().mapToInt(it -> Math.max(0, it.quantity() == null ? 0 : it.quantity())).sum();
        return new CartDto(customerId, items, totalQty);
    }

    @Transactional
    public CartDto addItem(Integer customerId, Integer productId, Integer productColorId, Integer productVariantId, Integer quantity) {
        System.out.println("CartService.addItem called - customerId=" + customerId + ", productId=" + productId + ", colorId=" + productColorId + ", variantId=" + productVariantId + ", qty=" + quantity);
        validateCustomerActive(customerId);
        if (productId == null || productId <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Thiếu productId.");
        }
        int qty = Math.max(1, Math.min(99, quantity == null ? 1 : quantity));

        Cart cart = cartRepository.findByCustomerId(customerId).orElseGet(() -> {
            Cart c = new Cart();
            c.setCustomerId(customerId);
            Cart saved = cartRepository.save(c);
            System.out.println("Created new cart - cartId=" + saved.getCartId() + ", customerId=" + saved.getCustomerId());
            return saved;
        });
        System.out.println("Working with cart - cartId=" + cart.getCartId() + ", customerId=" + cart.getCustomerId());

        Product product = requireProductActive(productId);

        // Validate variant and derive colorId if not provided
        if (productVariantId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Vui lòng chọn phiên bản sản phẩm (RAM/dung lượng).");
        }
        ProductVariant variant = productVariantRepository.findById(productVariantId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Phiên bản không hợp lệ."));
        if (!variant.getProductColor().getProduct().getProductId().equals(product.getProductId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Phiên bản không thuộc sản phẩm.");
        }
        
        // If colorId is not provided, derive it from the variant
        final Integer effectiveColorId;
        if (productColorId == null && variant.getProductColor() != null) {
            effectiveColorId = variant.getProductColor().getProductColorId();
            System.out.println("Derived colorId from variant: " + effectiveColorId);
        } else {
            effectiveColorId = productColorId;
        }

        // validate color if provided explicitly (for backward compatibility)
        if (productColorId != null) {
            ProductColor color = productColorRepository.findById(productColorId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Màu không hợp lệ."));
            if (!color.getProduct().getProductId().equals(product.getProductId())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Màu không thuộc sản phẩm.");
            }
        }

        Optional<CartItem> existing = cartItemRepository.findOneLine(cart.getCartId(), productId, effectiveColorId, productVariantId);
        System.out.println("Existing cart item found: " + existing.isPresent());
        CartItem line = existing.orElseGet(() -> {
            CartItem ci = new CartItem();
            ci.setCart(cart);
            ci.setProduct(product);
            ci.setProductColorId(effectiveColorId);
            ci.setProductVariantId(productVariantId);
            ci.setQuantity(0);
            System.out.println("Created new CartItem");
            return ci;
        });
        int nextQty = Math.min(99, Math.max(1, (line.getQuantity() == null ? 0 : line.getQuantity()) + qty));
        inventoryStockValidator.requireStock(variant, nextQty, inventoryStockValidator.buildVariantLabel(variant));
        line.setQuantity(nextQty);
        CartItem saved = cartItemRepository.save(line);
        entityManager.flush(); // Force flush to database before querying
        System.out.println("Saved CartItem - id=" + saved.getCartItemId() + ", cartId=" + saved.getCart().getCartId() + ", qty=" + saved.getQuantity());
        
        CartDto result = getOrCreateCart(customerId);
        System.out.println("Returning CartDto - customerId=" + result.customerId() + ", items.size=" + result.items().size() + ", totalQty=" + result.totalQuantity());
        return result;
    }

    @Transactional
    public CartDto setQuantity(Integer customerId, Integer productId, Integer productColorId, Integer productVariantId, Integer quantity) {
        validateCustomerActive(customerId);
        if (productId == null || productId <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Thiếu productId.");
        }

        // Block updating cart for inactive/deleted product as well
        requireProductActive(productId);

        Cart cart = cartRepository.findByCustomerId(customerId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Giỏ hàng không tồn tại."));
        CartItem line = cartItemRepository.findOneLine(cart.getCartId(), productId, productColorId, productVariantId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Sản phẩm không có trong giỏ."));
        int qty = Math.max(1, Math.min(99, quantity == null ? 1 : quantity));
        if (productVariantId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Vui lòng chọn phiên bản sản phẩm (RAM/dung lượng).");
        }
        ProductVariant variant = productVariantRepository.findById(productVariantId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Phiên bản không hợp lệ."));
        inventoryStockValidator.requireStock(variant, qty, inventoryStockValidator.buildVariantLabel(variant));
        line.setQuantity(qty);
        cartItemRepository.save(line);
        entityManager.flush(); // Force flush to database
        return getOrCreateCart(customerId);
    }

    @Transactional
    public CartDto removeItem(Integer customerId, Integer productId, Integer productColorId, Integer productVariantId) {
        validateCustomerActive(customerId);
        Cart cart = cartRepository.findByCustomerId(customerId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Giỏ hàng không tồn tại."));
        CartItem line = cartItemRepository.findOneLine(cart.getCartId(), productId, productColorId, productVariantId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Sản phẩm không có trong giỏ."));
        cartItemRepository.delete(line);
        return getOrCreateCart(customerId);
    }

    @Transactional
    public CartDto clear(Integer customerId) {
        validateCustomerActive(customerId);
        Cart cart = cartRepository.findByCustomerId(customerId)
                .orElseGet(() -> {
                    Cart c = new Cart();
                    c.setCustomerId(customerId);
                    return cartRepository.save(c);
                });
        List<CartItem> lines = cartItemRepository.findAllByCartIdWithProduct(cart.getCartId());
        cartItemRepository.deleteAll(lines);
        return getOrCreateCart(customerId);
    }

    private CartItemDto toDto(CartItem ci) {
        Product p = ci.getProduct();

        String colorName = null;
        String imageUrl = null;
        Integer ramGb = null;
        Integer storageGb = null;
        BigDecimal price = BigDecimal.ZERO;
        BigDecimal originalPrice = BigDecimal.ZERO;
        String discountType = "NONE";
        BigDecimal discountValue = BigDecimal.ZERO;

        if (ci.getProductColorId() != null) {
            try {
                Integer colorId = ci.getProductColorId();
                ProductColor color = productColorRepository.findById(colorId).orElse(null);
                if (color != null) {
                    colorName = color.getColorName();
                    // ưu tiên ảnh màu đầu tiên nếu có
                    String colorImg = color.getColorImages() != null && !color.getColorImages().isEmpty()
                            ? color.getColorImages().iterator().next().getImageUrl()
                            : null;
                    if (colorImg != null && !colorImg.isBlank()) imageUrl = colorImg;
                }
            } catch (Exception ignored) {
            }
        }

        if (ci.getProductVariantId() != null) {
            try {
                Integer variantId = ci.getProductVariantId();
                ProductVariant v = productVariantRepository.findById(variantId).orElse(null);
                if (v != null) {
                    ramGb = v.getRamGb();
                    storageGb = v.getStorageGb();
                    price = v.getFinalPrice() != null ? v.getFinalPrice() : BigDecimal.ZERO;
                    originalPrice = v.getOriginalPrice() != null ? v.getOriginalPrice() : price;
                    
                    // Lấy thông tin giảm giá
                    if (v.getDiscountType() != null) {
                        discountType = v.getDiscountType().name();
                        discountValue = v.getDiscountValue() != null ? v.getDiscountValue() : BigDecimal.ZERO;
                    }
                }
            } catch (Exception ignored) {
            }
        }

        return new CartItemDto(
                p != null ? p.getProductId() : null,
                p != null ? p.getProductName() : null,
                price,                  // Giá sau giảm
                originalPrice,          // Giá gốc
                discountType,           // Loại giảm giá
                discountValue,          // Giá trị giảm
                ci.getQuantity(),
                ci.getProductColorId(),
                ci.getProductVariantId(),
                ramGb,
                storageGb,
                colorName,
                imageUrl
        );
    }
}

