package com.webbanhang.shop.DTO.Orders;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentQRResponse {
    private String qrUrl;
    private String orderCode;
    private BigDecimal amount;
    private String accountName;
    private String accountNumber;
    private String bankBin;
}
