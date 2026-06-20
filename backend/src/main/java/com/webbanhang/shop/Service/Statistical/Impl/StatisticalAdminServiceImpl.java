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
import java.time.LocalDate;
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
    public List<TopProductSoldDto> topProductsSold(int limit, Integer brandId, Integer categoryId, String paymentMethod, String startDate, String endDate) {
        int lim = Math.max(1, Math.min(limit, 20));
        Set<Integer> filteredProductIds = getFilteredProductIds(brandId, categoryId);
        boolean hasProdFilter = brandId != null || categoryId != null;
        
        Instant startInstant = parseDate(startDate);
        Instant endInstant = parseDate(endDate);

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
            // Date filter
            if (item.getOrder() != null && item.getOrder().getCreatedAt() != null) {
                if (!isInDateRange(item.getOrder().getCreatedAt(), startInstant, endInstant)) {
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
    public SummaryStatisticalDto getSummary(Integer brandId, Integer categoryId, String paymentMethod, String startDate, String endDate) {
        List<Order> filteredOrders = getFilteredOrders(brandId, categoryId, paymentMethod, startDate, endDate);
        Set<Integer> filteredProductIds = getFilteredProductIds(brandId, categoryId);
        boolean hasProdFilter = brandId != null || categoryId != null;

        long totalOrders = filteredOrders.size();
        
        // ✅ FIX: Revenue chỉ tính đơn ĐÃ GIAO HÀNG + ĐÃ THANH TOÁN + CHƯA BỊ HOÀN TIỀN
        BigDecimal totalRevenue = filteredOrders.stream()
                .filter(order -> 
                    order.getOrderStatus() == com.webbanhang.shop.Model.Orders.OrderStatus.DELIVERED &&
                    order.getPaymentStatus() == PaymentStatus.PAID
                    // Không tính các đơn đang hoàn tiền hoặc đã hoàn tiền
                )
                .map(order -> order.getTotalAmount() != null ? order.getTotalAmount() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        long totalCustomers = (hasProdFilter || paymentMethod != null || startDate != null || endDate != null)
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
    public List<MonthlyRevenueDto> getMonthlyRevenue(int months, Integer brandId, Integer categoryId, String paymentMethod, String startDate, String endDate) {
        Instant now = Instant.now();
        Instant monthsAgo = now.minus(months * 30L, ChronoUnit.DAYS);
        
        List<Order> orders = getFilteredOrders(brandId, categoryId, paymentMethod, startDate, endDate).stream()
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
            
            // ✅ FIX: Revenue chỉ tính đơn ĐÃ GIAO HÀNG + ĐÃ THANH TOÁN + CHƯA BỊ HOÀN TIỀN
            BigDecimal revenue = monthOrders.stream()
                    .filter(o -> 
                        o.getOrderStatus() == com.webbanhang.shop.Model.Orders.OrderStatus.DELIVERED &&
                        o.getPaymentStatus() == PaymentStatus.PAID
                        // Không tính các đơn đang hoàn tiền hoặc đã hoàn tiền
                    )
                    .map(o -> o.getTotalAmount() != null ? o.getTotalAmount() : BigDecimal.ZERO)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            
            result.add(new MonthlyRevenueDto(monthLabel, revenue, monthOrders.size()));
        }
        
        return result;
    }

    @Override
    public List<OrderStatusCountDto> getOrderStatusDistribution(Integer brandId, Integer categoryId, String paymentMethod, String startDate, String endDate) {
        return getFilteredOrders(brandId, categoryId, paymentMethod, startDate, endDate).stream()
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

    private List<Order> getFilteredOrders(Integer brandId, Integer categoryId, String paymentMethod, String startDate, String endDate) {
        Instant startInstant = parseDate(startDate);
        Instant endInstant = parseDate(endDate);
        
        List<Order> orders = orderRepository.findAll().stream()
                .filter(order -> {
                    if (paymentMethod != null && !paymentMethod.isEmpty()) {
                        if (!paymentMethod.equalsIgnoreCase(order.getPaymentMethod())) {
                            return false;
                        }
                    }
                    // Date range filter
                    if (order.getCreatedAt() != null) {
                        if (!isInDateRange(order.getCreatedAt(), startInstant, endInstant)) {
                            return false;
                        }
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
    
    private Instant parseDate(String dateStr) {
        if (dateStr == null || dateStr.isBlank()) {
            return null;
        }
        try {
            LocalDate localDate = LocalDate.parse(dateStr, DateTimeFormatter.ISO_LOCAL_DATE);
            return localDate.atStartOfDay(ZoneId.systemDefault()).toInstant();
        } catch (Exception e) {
            return null;
        }
    }
    
    private boolean isInDateRange(Instant instant, Instant start, Instant end) {
        if (start != null && instant.isBefore(start)) {
            return false;
        }
        if (end != null) {
            // Add 1 day to end date to include the entire end date
            Instant endPlusOneDay = end.plus(1, ChronoUnit.DAYS);
            if (instant.isAfter(endPlusOneDay)) {
                return false;
            }
        }
        return true;
    }
}
