package com.webbanhang.shop.Service.Statistical;

import com.webbanhang.shop.DTO.Statistical.MonthlyRevenueDto;
import com.webbanhang.shop.DTO.Statistical.OrderStatusCountDto;
import com.webbanhang.shop.DTO.Statistical.SummaryStatisticalDto;
import com.webbanhang.shop.DTO.Statistical.TopProductSoldDto;

import java.util.List;

public interface StatisticalAdminService {
    List<TopProductSoldDto> topProductsSold(int limit, Integer brandId, Integer categoryId, String paymentMethod);
    SummaryStatisticalDto getSummary(Integer brandId, Integer categoryId, String paymentMethod);
    List<MonthlyRevenueDto> getMonthlyRevenue(int months, Integer brandId, Integer categoryId, String paymentMethod);
    List<OrderStatusCountDto> getOrderStatusDistribution(Integer brandId, Integer categoryId, String paymentMethod);
}
