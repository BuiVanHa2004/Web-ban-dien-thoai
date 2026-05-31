package com.webbanhang.shop.DTO.Orders;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ReasonDto {
    private Integer reasonId;
    private String reasonName;
    private Boolean allowInput;
}
