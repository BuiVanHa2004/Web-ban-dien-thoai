package com.webbanhang.shop.DTO.Refund;

import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class RefundActionRequest {

    @Size(max = 500, message = "Reason must not exceed 500 characters")
    private String reason;

    private String receiptImageKey;
}
