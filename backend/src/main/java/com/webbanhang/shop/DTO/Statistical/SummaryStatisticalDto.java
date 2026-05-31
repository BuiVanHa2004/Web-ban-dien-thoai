package com.webbanhang.shop.DTO.Statistical;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class SummaryStatisticalDto {
    private long totalOrders;
    private BigDecimal totalRevenue;
    private long totalCustomers;
    private long totalProducts;
    private java.util.Map<String, Long> paymentStatusDistribution;
    private java.util.Map<String, Long> paymentMethodDistribution;
}
