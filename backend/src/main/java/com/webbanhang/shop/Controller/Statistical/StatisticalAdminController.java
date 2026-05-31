package com.webbanhang.shop.Controller.Statistical;

import com.webbanhang.shop.DTO.Statistical.MonthlyRevenueDto;
import com.webbanhang.shop.DTO.Statistical.OrderStatusCountDto;
import com.webbanhang.shop.DTO.Statistical.SummaryStatisticalDto;
import com.webbanhang.shop.DTO.Statistical.TopProductSoldDto;
import com.webbanhang.shop.Service.Statistical.StatisticalAdminService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/admin/statistical")
public class StatisticalAdminController {

    private final StatisticalAdminService statisticalAdminService;

    public StatisticalAdminController(StatisticalAdminService statisticalAdminService) {
        this.statisticalAdminService = statisticalAdminService;
    }

    @GetMapping("/summary")
    public SummaryStatisticalDto summary(@RequestParam(value = "brandId", required = false) Integer brandId,
                                         @RequestParam(value = "categoryId", required = false) Integer categoryId,
                                         @RequestParam(value = "paymentMethod", required = false) String paymentMethod) {
        return statisticalAdminService.getSummary(brandId, categoryId, paymentMethod);
    }

    @GetMapping("/monthly-revenue")
    public List<MonthlyRevenueDto> monthlyRevenue(@RequestParam(value = "months", defaultValue = "6") int months,
                                                  @RequestParam(value = "brandId", required = false) Integer brandId,
                                                  @RequestParam(value = "categoryId", required = false) Integer categoryId,
                                                  @RequestParam(value = "paymentMethod", required = false) String paymentMethod) {
        return statisticalAdminService.getMonthlyRevenue(months, brandId, categoryId, paymentMethod);
    }

    @GetMapping("/status-distribution")
    public List<OrderStatusCountDto> statusDistribution(@RequestParam(value = "brandId", required = false) Integer brandId,
                                                        @RequestParam(value = "categoryId", required = false) Integer categoryId,
                                                        @RequestParam(value = "paymentMethod", required = false) String paymentMethod) {
        return statisticalAdminService.getOrderStatusDistribution(brandId, categoryId, paymentMethod);
    }

    @GetMapping("/top-products")
    public List<TopProductSoldDto> topProducts(@RequestParam(value = "limit", required = false, defaultValue = "5") int limit,
                                               @RequestParam(value = "brandId", required = false) Integer brandId,
                                               @RequestParam(value = "categoryId", required = false) Integer categoryId,
                                               @RequestParam(value = "paymentMethod", required = false) String paymentMethod) {
        return statisticalAdminService.topProductsSold(limit, brandId, categoryId, paymentMethod);
    }
}
