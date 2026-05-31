package com.webbanhang.shop.Controller.Carts;

import com.webbanhang.shop.DTO.Carts.CartDto;
import com.webbanhang.shop.DTO.Carts.CartUpsertItemRequest;
import com.webbanhang.shop.Service.Carts.CartService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;

@RestController
@RequestMapping("/api/customer/cart")
public class CustomerCartController {

    private final CartService cartService;

    public CustomerCartController(CartService cartService) {
        this.cartService = cartService;
    }

    private Integer requireCustomerId(Authentication authentication) {
        if (authentication == null || authentication.getName() == null || authentication.getName().isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Thiếu token đăng nhập.");
        }
        String subject = authentication.getName();
        if (!subject.startsWith("customer:")) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Chỉ tài khoản khách hàng mới dùng được giỏ hàng.");
        }
        try {
            int id = Integer.parseInt(subject.substring("customer:".length()));
            if (id <= 0) throw new NumberFormatException();
            return id;
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token không hợp lệ.");
        }
    }

    @GetMapping
    public CartDto getMyCart(Authentication authentication) {
        Integer customerId = requireCustomerId(authentication);
        return cartService.getOrCreateCart(customerId);
    }

    @PostMapping("/items")
    public CartDto addItem(
            Authentication authentication,
            @Valid @RequestBody CartUpsertItemRequest req
    ) {
        Integer customerId = requireCustomerId(authentication);
        return cartService.addItem(
                customerId,
                req.productId(),
                req.productColorId(),
                req.productVariantId(),
                req.quantity()
        );
    }

    @PatchMapping("/items")
    public CartDto setQuantity(
            Authentication authentication,
            @Valid @RequestBody CartUpsertItemRequest req
    ) {
        Integer customerId = requireCustomerId(authentication);
        return cartService.setQuantity(
                customerId,
                req.productId(),
                req.productColorId(),
                req.productVariantId(),
                req.quantity()
        );
    }

    @DeleteMapping("/items")
    public CartDto removeItem(
            Authentication authentication,
            @Valid @RequestBody CartUpsertItemRequest req
    ) {
        Integer customerId = requireCustomerId(authentication);
        return cartService.removeItem(
                customerId,
                req.productId(),
                req.productColorId(),
                req.productVariantId()
        );
    }

    @DeleteMapping
    public CartDto clear(Authentication authentication) {
        Integer customerId = requireCustomerId(authentication);
        return cartService.clear(customerId);
    }
}
