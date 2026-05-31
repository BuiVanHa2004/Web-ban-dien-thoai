package com.webbanhang.shop.Service.Statistical.Impl;

import com.webbanhang.shop.DTO.Statistical.*;
import com.webbanhang.shop.Model.Orders.Order;
import com.webbanhang.shop.Model.Orders.OrderItem;
import com.webbanhang.shop.Repository.Customers.CustomerAccountRepository;
import com.webbanhang.shop.Repository.Orders.OrderRepository;
import com.webbanhang.shop.Repository.Orders.OrderItemRepository;
import com.webbanhang.shop.Model.Orders.PaymentStatus;
import com.webbanhang.shop.Repository.Products.ProductRepository;
import com.webbanhang.shop.Service.Statistical.StatisticalAdminService;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class StatisticalAdminServiceImpl implements StatisticalAdminService {

    private final OrderItemRepository orderItemRepository;
    private final OrderRepository orderRepository;
    private final CustomerAccountRepository customerAccountRepository;
    private final ProductRepository productRepository;

    public StatisticalAdminServiceImpl(OrderItemRepository orderItemRepository, 
                                       OrderRepository orderRepository, 
                                       CustomerAccountRepository customerAccountRepository, 
                                       ProductRepository productRepository) {
        this.orderItemRepository = orderItemRepository;
        this.orderRepository = orderRepository;
        this.customerAccountRepository = customerAccountRepository;
        this.productRepository = productRepository;
    }

    @Override
    public List<TopProductSoldDto> topProductsSold(int limit, Integer brandId, Integer categoryId, String paymentMethod) {
        int lim = Math.max(1, Math.min(limit, 20));
        Set<Integer> filteredProductIds = getFilteredProductIds(brandId, categoryId);
        boolean hasProdFilter = brandId != null || categoryId != null;

        Map<Integer, String> productNameMap = new HashMap<>();
        Map<Integer, Long> quantityMap = new HashMap<>();

        for (OrderItem item : orderItemRepository.findAll()) {
            if (item.getProductId() == null) {
                continue;
            }
            if (hasProdFilter && !filteredProductIds.contains(item.getProductId())) {
                continue;
            }
            if (paymentMethod != null && item.getOrder() != null) {
                if (!paymentMethod.equalsIgnoreCase(item.getOrder().getPaymentMethod())) {
                    continue;
                }
            }
            int productId = item.getProductId();
            long qty = item.getQuantity() == null ? 0L : item.getQuantity();
            quantityMap.put(productId, quantityMap.getOrDefault(productId, 0L) + qty);
            productNameMap.putIfAbsent(productId, item.getProductName());
        }

        return quantityMap.entrySet().stream()
                .sorted(Map.Entry.<Integer, Long>comparingByValue(Comparator.reverseOrder()))
                .limit(lim)
                .map(entry -> new TopProductSoldDto(
                        entry.getKey(),
                        productNameMap.getOrDefault(entry.getKey(), "N/A"),
                        entry.getValue()
                ))
                .toList();
    }

    @Override
    public SummaryStatisticalDto getSummary(Integer brandId, Integer categoryId, String paymentMethod) {
        List<Order> filteredOrders = getFilteredOrders(brandId, categoryId, paymentMethod);
        Set<Integer> filteredProductIds = getFilteredProductIds(brandId, categoryId);
        boolean hasProdFilter = brandId != null || categoryId != null;

        long totalOrders = filteredOrders.size();
        BigDecimal totalRevenue = filteredOrders.stream()
                .filter(order -> order.getPaymentStatus() == PaymentStatus.PAID)
                .map(order -> order.getTotalAmount() != null ? order.getTotalAmount() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        long totalCustomers = (hasProdFilter || paymentMethod != null)
                ? filteredOrders.stream()
                    .map(Order::getCustomerId)
                    .filter(customerId -> customerId != null)
                    .distinct()
                    .count()
                : customerAccountRepository.count();
        long totalProducts = hasProdFilter ? filteredProductIds.size() : productRepository.count();

        // Payment Status Distribution
        Map<String, Long> paymentStatusDist = filteredOrders.stream()
                .collect(Collectors.groupingBy(o -> o.getPaymentStatus() != null ? o.getPaymentStatus().name() : "UNKNOWN", Collectors.counting()));

        // Payment Method Distribution
        Map<String, Long> paymentMethodDist = filteredOrders.stream()
                .collect(Collectors.groupingBy(o -> o.getPaymentMethod() != null ? o.getPaymentMethod() : "UNKNOWN", Collectors.counting()));

        return new SummaryStatisticalDto(totalOrders, totalRevenue, totalCustomers, totalProducts, paymentStatusDist, paymentMethodDist);
    }

    @Override
    public List<MonthlyRevenueDto> getMonthlyRevenue(int months, Integer brandId, Integer categoryId, String paymentMethod) {
        Instant now = Instant.now();
        Instant monthsAgo = now.minus(months * 30L, ChronoUnit.DAYS);
        
        List<Order> orders = getFilteredOrders(brandId, categoryId, paymentMethod).stream()
                .filter(o -> o.getCreatedAt() != null && o.getCreatedAt().isAfter(monthsAgo))
                .toList();

        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("MM/yyyy").withZone(ZoneId.systemDefault());

        Map<String, List<Order>> grouped = orders.stream()
                .collect(Collectors.groupingBy(o -> formatter.format(o.getCreatedAt())));

        List<MonthlyRevenueDto> result = new ArrayList<>();
        for (int i = months - 1; i >= 0; i--) {
            Instant monthDate = now.minus(i * 30L, ChronoUnit.DAYS);
            String monthLabel = formatter.format(monthDate);
            List<Order> monthOrders = grouped.getOrDefault(monthLabel, new ArrayList<>());
            
            BigDecimal revenue = monthOrders.stream()
                    .filter(o -> o.getPaymentStatus() == PaymentStatus.PAID)
                    .map(o -> o.getTotalAmount() != null ? o.getTotalAmount() : BigDecimal.ZERO)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            
            result.add(new MonthlyRevenueDto(monthLabel, revenue, monthOrders.size()));
        }
        
        return result;
    }

    @Override
    public List<OrderStatusCountDto> getOrderStatusDistribution(Integer brandId, Integer categoryId, String paymentMethod) {
        return getFilteredOrders(brandId, categoryId, paymentMethod).stream()
                .filter(o -> o.getOrderStatus() != null)
                .collect(Collectors.groupingBy(o -> o.getOrderStatus().toString(), Collectors.counting()))
                .entrySet().stream()
                .map(entry -> new OrderStatusCountDto(entry.getKey(), entry.getValue()))
                .toList();
    }

    private Set<Integer> getFilteredProductIds(Integer brandId, Integer categoryId) {
        return productRepository.findAll().stream()
                .filter(product -> {
                    if (brandId != null) {
                        if (product.getBrand() == null || product.getBrand().getBrandId() == null) {
                            return false;
                        }
                        if (!brandId.equals(product.getBrand().getBrandId())) {
                            return false;
                        }
                    }
                    if (categoryId != null) {
                        if (product.getCategory() == null || product.getCategory().getCategoryId() == null) {
                            return false;
                        }
                        return categoryId.equals(product.getCategory().getCategoryId());
                    }
                    return true;
                })
                .map(product -> product.getProductId())
                .filter(productId -> productId != null)
                .collect(Collectors.toCollection(HashSet::new));
    }

    private List<Order> getFilteredOrders(Integer brandId, Integer categoryId, String paymentMethod) {
        List<Order> orders = orderRepository.findAll().stream()
                .filter(order -> {
                    if (paymentMethod != null && !paymentMethod.isEmpty()) {
                        return paymentMethod.equalsIgnoreCase(order.getPaymentMethod());
                    }
                    return true;
                })
                .toList();

        if (brandId == null && categoryId == null) {
            return orders;
        }

        Set<Integer> filteredProductIds = getFilteredProductIds(brandId, categoryId);
        if (filteredProductIds.isEmpty()) {
            return List.of();
        }

        return orders.stream()
                .filter(order -> order.getItems() != null && order.getItems().stream()
                        .map(OrderItem::getProductId)
                        .anyMatch(filteredProductIds::contains))
                .toList();
    }
}
