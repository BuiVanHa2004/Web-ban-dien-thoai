package com.webbanhang.shop.DTO.Statistical;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class OrderStatusCountDto {
    private String status;
    private long count;
}
