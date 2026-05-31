package com.webbanhang.shop.DTO.Orders;

import lombok.Data;
import org.springframework.web.multipart.MultipartFile;

@Data
public class ConfirmPaymentRequest {
    private Integer orderId;
    private String transferNote;
    private MultipartFile billImage;
}
