package com.webbanhang.shop.DTO.Refund;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class RefundUpdateRequest {

    @Size(max = 500, message = "Refund reason must not exceed 500 characters")
    private String refundReason;

    @Size(max = 100, message = "Bank name must not exceed 100 characters")
    private String customerBankName;

    @Size(max = 20, message = "Bank code must not exceed 20 characters")
    private String customerBankCode;

    @Pattern(regexp = "^[0-9]{8,20}$", message = "Account number must be 8-20 digits")
    private String customerAccountNumber;

    @Size(max = 255, message = "Account holder must not exceed 255 characters")
    private String customerAccountHolder;
}
