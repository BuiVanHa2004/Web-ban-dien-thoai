package com.webbanhang.shop.DTO.Orders;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CancelOrderRequest {
    private Integer customerId;
    private Integer reasonId;
    private String cancelNote;
}
