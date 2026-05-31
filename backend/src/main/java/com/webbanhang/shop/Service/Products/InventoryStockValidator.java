package com.webbanhang.shop.Service.Products;

import com.webbanhang.shop.Model.Products.ProductVariant;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class InventoryStockValidator {

    public int availableQuantity(ProductVariant variant) {
        if (variant == null) return 0;
        return Math.max(0, variant.getQuantity() == null ? 0 : variant.getQuantity());
    }

    public void requireStock(ProductVariant variant, int requestedQty, String productLabel) {
        if (variant == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Phiên bản sản phẩm không hợp lệ.");
        }
        if (requestedQty <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Số lượng phải lớn hơn 0.");
        }
        int available = availableQuantity(variant);
        if (requestedQty > available) {
            String label = productLabel != null && !productLabel.isBlank() ? productLabel : "Sản phẩm";
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    String.format("%s chỉ còn %d sản phẩm trong kho.", label, available)
            );
        }
    }

    public String buildVariantLabel(ProductVariant variant) {
        if (variant == null) return "Sản phẩm";
        try {
            var color = variant.getProductColor();
            var product = color != null ? color.getProduct() : null;
            String productName = product != null ? product.getProductName() : "Sản phẩm";
            String colorName = color != null ? color.getColorName() : "";
            return String.format(
                    "%s %sGB/%sGB",
                    productName,
                    variant.getRamGb() != null ? variant.getRamGb() : "?",
                    variant.getStorageGb() != null ? variant.getStorageGb() : "?"
            ).replace("  ", " ").trim()
                    + (colorName != null && !colorName.isBlank() ? " (" + colorName + ")" : "");
        } catch (Exception e) {
            return "Sản phẩm";
        }
    }
}
