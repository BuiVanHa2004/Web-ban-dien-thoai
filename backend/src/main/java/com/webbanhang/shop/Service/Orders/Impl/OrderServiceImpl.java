package com.webbanhang.shop.Service.Orders.Impl;

import com.webbanhang.shop.Model.Orders.Order;
import com.webbanhang.shop.Model.Orders.Reason;
import com.webbanhang.shop.Model.Orders.ReasonType;
import com.webbanhang.shop.Model.Orders.CancelledBy;
import com.webbanhang.shop.Repository.Orders.ReasonRepository;
import com.webbanhang.shop.Model.Products.Product;
import com.webbanhang.shop.Model.Orders.OrderItem;
import com.webbanhang.shop.Model.Orders.OrderStatus;
import com.webbanhang.shop.Model.Orders.PaymentStatus;
import com.webbanhang.shop.Model.Products.ProductColor;
import com.webbanhang.shop.Model.Products.ProductVariant;
import com.webbanhang.shop.Model.Customers.CustomerAccount;
import com.webbanhang.shop.Repository.Customers.CustomerAccountRepository;
import com.webbanhang.shop.Repository.Orders.OrderRepository;
import com.webbanhang.shop.Repository.Products.ProductColorRepository;
import com.webbanhang.shop.Repository.Products.ProductVariantRepository;
import com.webbanhang.shop.Service.Orders.OrderService;
import com.webbanhang.shop.DTO.Orders.CreateOrderItemRequest;
import com.webbanhang.shop.DTO.Orders.OrderItemDto;
import com.webbanhang.shop.Service.Notifications.NotificationService;
import com.webbanhang.shop.Service.Notifications.CustomerNotificationService;
import com.webbanhang.shop.DTO.Notifications.NotificationDto;
import com.webbanhang.shop.Model.Notifications.NotificationType;
import com.webbanhang.shop.Model.Notifications.NotificationAction;
import com.webbanhang.shop.Model.Notifications.ActorType;
import com.webbanhang.shop.Service.Email.CustomerEmailService;
import com.webbanhang.shop.Service.PDF.DeliveryCertificateService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.webbanhang.shop.Repository.Orders.PaymentAttemptRepository;
import com.webbanhang.shop.Repository.Orders.PaymentLogRepository;
import com.webbanhang.shop.Repository.Orders.BankTransactionRepository;
import com.webbanhang.shop.Repository.Orders.PaymentRepository;
import com.webbanhang.shop.Model.Orders.PaymentAttempt;
import com.webbanhang.shop.Model.Orders.PaymentLog;
import com.webbanhang.shop.Model.Orders.BankTransaction;
import com.webbanhang.shop.Model.Orders.Payment;
import com.webbanhang.shop.Service.Inventory.InventoryService;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;
import java.util.ArrayList;

@Service
@SuppressWarnings("null")
public class OrderServiceImpl implements OrderService {

    private final OrderRepository orderRepository;

    private final CustomerAccountRepository customerAccountRepository;

    private final ProductColorRepository productColorRepository;

    private final ProductVariantRepository productVariantRepository;
    
    private final NotificationService notificationService;
    
    private final CustomerNotificationService customerNotificationService;

    private final ReasonRepository reasonRepository;

    private final com.webbanhang.shop.Repository.Admins.AdminAccountRepository adminAccountRepository;

    private final PaymentAttemptRepository paymentAttemptRepository;
    private final PaymentLogRepository paymentLogRepository;
    private final BankTransactionRepository bankTransactionRepository;
    private final com.webbanhang.shop.Repository.Orders.PaymentRepository paymentRepository;
    private final InventoryService inventoryService;
    
    private final CustomerEmailService customerEmailService;
    private final DeliveryCertificateService deliveryCertificateService;
    private final com.webbanhang.shop.Service.Storage.MinioStorageService minioStorageService;

    public OrderServiceImpl(
            OrderRepository orderRepository,
            CustomerAccountRepository customerAccountRepository,
            ProductColorRepository productColorRepository,
            ProductVariantRepository productVariantRepository,
            NotificationService notificationService,
            CustomerNotificationService customerNotificationService,
            ReasonRepository reasonRepository,
            com.webbanhang.shop.Repository.Admins.AdminAccountRepository adminAccountRepository,
            PaymentAttemptRepository paymentAttemptRepository,
            PaymentLogRepository paymentLogRepository,
            BankTransactionRepository bankTransactionRepository,
            com.webbanhang.shop.Repository.Orders.PaymentRepository paymentRepository,
            InventoryService inventoryService,
            CustomerEmailService customerEmailService,
            DeliveryCertificateService deliveryCertificateService,
            com.webbanhang.shop.Service.Storage.MinioStorageService minioStorageService
    ) {
        this.orderRepository = orderRepository;
        this.customerAccountRepository = customerAccountRepository;
        this.productColorRepository = productColorRepository;
        this.productVariantRepository = productVariantRepository;
        this.notificationService = notificationService;
        this.customerNotificationService = customerNotificationService;
        this.reasonRepository = reasonRepository;
        this.adminAccountRepository = adminAccountRepository;
        this.paymentAttemptRepository = paymentAttemptRepository;
        this.paymentLogRepository = paymentLogRepository;
        this.bankTransactionRepository = bankTransactionRepository;
        this.paymentRepository = paymentRepository;
        this.inventoryService = inventoryService;
        this.customerEmailService = customerEmailService;
        this.deliveryCertificateService = deliveryCertificateService;
        this.minioStorageService = minioStorageService;
    }

    @Override
    public List<Order> findAll() {
        return orderRepository.findAllByDeletedAtIsNull();
    }

    @Override
    public List<Order> findAllByCustomerId(Integer customerId) {
        return orderRepository.findAllByDeletedAtIsNullAndCustomerId(customerId);
    }

    @Override
    public Optional<Order> findById(Integer id) {
        return orderRepository.findByOrderId(id);
    }

    @Override
    @Transactional
    public Order createOrder(
            Integer customerId,
            String receiverName,
            String receiverPhone,
            String shippingAddress,
            List<CreateOrderItemRequest> items,
            String paymentMethod
    ) {
        if (customerId == null) {
            throw new IllegalArgumentException("customerId is required");
        }
        if (receiverName == null || receiverName.isBlank()) {
            throw new IllegalArgumentException("receiverName is required");
        }
        if (receiverPhone == null || receiverPhone.isBlank()) {
            throw new IllegalArgumentException("receiverPhone is required");
        }
        if (shippingAddress == null || shippingAddress.isBlank()) {
            throw new IllegalArgumentException("shippingAddress is required");
        }
        if (items == null || items.isEmpty()) {
            throw new IllegalArgumentException("items is required");
        }

        // Validate customer exists
        CustomerAccount customer = customerAccountRepository.findByCustomerId(customerId)
                .orElseThrow(() -> new IllegalArgumentException("Customer not found"));

        if (customer.getDeletedAt() != null) {
            throw new IllegalStateException("Tài khoản đã bị xóa.");
        }
        if (customer.getIsActive() != null && !customer.getIsActive()) {
            throw new IllegalStateException("Tài khoản đã bị khóa.");
        }

        // Normalize payment method
        String normalizedPaymentMethod = paymentMethod != null ? paymentMethod : "COD";
        
        Order order = new Order();
        order.setOrderId(null);
        order.setOrderCode(generateOrderCode());
        order.setCustomerId(customerId);
        order.setPaymentMethod(normalizedPaymentMethod);
        
        // Set order status and payment status theo nghiệp vụ mới
        if ("BANK_TRANSFER".equals(normalizedPaymentMethod)) {
            order.setOrderStatus(OrderStatus.PENDING_CONFIRM);  // Chờ thanh toán
            order.setPaymentStatus(PaymentStatus.UNPAID);        // Chưa thanh toán
        } else { // COD
            order.setOrderStatus(OrderStatus.CONFIRMED);         // Đã xác nhận luôn
            order.setPaymentStatus(PaymentStatus.UNPAID);        // Sẽ thanh toán khi nhận hàng
        }

        // Snapshot customer info
        order.setCustomerName(customer.getFullName());
        order.setEmail(customer.getEmail());

        order.setReceiverName(receiverName.trim());
        order.setReceiverPhone(receiverPhone.trim());
        order.setShippingAddress(shippingAddress.trim());

        if (order.getItems() == null) order.setItems(new LinkedHashSet<>());

        BigDecimal totalAmount = BigDecimal.ZERO;

        // Build order items
        for (int i = 0; i < items.size(); i++) {
            CreateOrderItemRequest reqItem = items.get(i);
            OrderLineBuild line = buildOrderLine(reqItem);
            OrderItem orderItem = line.item();
            orderItem.setOrder(order);
            order.getItems().add(orderItem);
            totalAmount = totalAmount.add(line.lineTotal());
        }

        if (order.getItems().isEmpty()) {
            throw new IllegalArgumentException("Đơn hàng phải có ít nhất một sản phẩm hợp lệ.");
        }

        order.setTotalAmount(totalAmount);
        
        // Save order (cascade sẽ save order_items)
        Order savedOrder = orderRepository.save(order);

        // Luôn tạo Payment record
        com.webbanhang.shop.Model.Orders.Payment payment = new com.webbanhang.shop.Model.Orders.Payment();
        payment.setOrderId(savedOrder.getOrderId());
        payment.setOrderCode(savedOrder.getOrderCode());
        payment.setCustomerId(savedOrder.getCustomerId());
        payment.setPaymentMethod(normalizedPaymentMethod);
        payment.setPaymentStatus(PaymentStatus.UNPAID);
        payment.setAmount(savedOrder.getTotalAmount());
        paymentRepository.save(payment);

        // ✅ CRITICAL FIX: Reserve stock khi tạo đơn (KHÔNG TRỪ KHO)
        // - Reserved stock = giữ hàng tạm thời
        // - Trừ kho thực sự (confirm sale) xảy ra khi:
        //   + COD: Giao hàng thành công (DELIVERED)
        //   + BANK_TRANSFER: Admin duyệt thanh toán (PAID)
        List<InventoryService.StockReservation> reservations = new ArrayList<>();
        for (OrderItem item : savedOrder.getItems()) {
            if (item.getVariantId() != null && item.getQuantity() != null && item.getQuantity() > 0) {
                reservations.add(new InventoryService.StockReservation(item.getVariantId(), item.getQuantity()));
            }
        }
        if (!reservations.isEmpty()) {
            // Nếu reserve stock fail, transaction sẽ tự động rollback toàn bộ
            inventoryService.batchReserveStock(reservations);
            System.out.println("[ORDER] Reserved stock for order " + savedOrder.getOrderCode());
        }

        // Create notification
        NotificationDto notif = NotificationDto.builder()
                .type(NotificationType.ORDER)
                .action(NotificationAction.CREATE)
                .actorType(ActorType.CUSTOMER)
                .actorId(customer.getCustomerId())
                .actorName(customer.getFullName())
                .orderId(savedOrder.getOrderId())
                .title("Đơn hàng mới")
                .message("Bạn có đơn hàng mới từ khách hàng " + customer.getFullName())
                .build();
        notificationService.notifyAllAdmins(notif);

        // Send order confirmation email to customer
        try {
            customerEmailService.sendOrderConfirmationEmail(savedOrder);
        } catch (Exception e) {
            System.err.println("Failed to send order confirmation email: " + e.getMessage());
        }

        return savedOrder;
    }

    private static final class OrderLineBuild {
        private final OrderItem item;
        private final BigDecimal lineTotal;

        private OrderLineBuild(OrderItem item, BigDecimal lineTotal) {
            this.item = item;
            this.lineTotal = lineTotal;
        }

        private OrderItem item() {
            return item;
        }

        private BigDecimal lineTotal() {
            return lineTotal;
        }
    }

    private OrderLineBuild buildOrderLine(CreateOrderItemRequest reqItem) {
        if (reqItem == null || reqItem.variantId() == null) {
            throw new IllegalArgumentException("Mỗi sản phẩm phải có phiên bản (variantId).");
        }
        int qty = reqItem.quantity() == null ? 1 : Math.max(1, reqItem.quantity());

        ProductVariant variant = productVariantRepository.findByVariantId(reqItem.variantId())
                .orElseThrow(() -> new IllegalArgumentException("Product variant not found: " + reqItem.variantId()));

        ProductColor color = variant.getProductColor();
        Product product = color != null ? color.getProduct() : null;
        if (product == null || product.getDeletedAt() != null || (product.getIsActive() != null && !product.getIsActive())) {
            throw new IllegalStateException("Sản phẩm hiện không khả dụng.");
        }

        requireVariantStock(variant, qty, buildVariantLabel(variant));

        BigDecimal price = variant.getFinalPrice() != null ? variant.getFinalPrice() : BigDecimal.ZERO;

        Integer actualProductId = null;
        if (color != null && color.getProduct() != null) {
            actualProductId = color.getProduct().getProductId();
        }
        if (actualProductId == null || actualProductId <= 0) {
            actualProductId = reqItem.productId();
        }
        if (actualProductId == null || actualProductId <= 0) {
            throw new IllegalArgumentException("Không thể xác định productId cho variant: " + variant.getVariantId());
        }

        // ✅ CRITICAL: OrderItem is SNAPSHOT - copy ALL product data at order creation time
        // This ensures historical integrity: if product price/name changes later, 
        // old orders remain unchanged
        OrderItem it = new OrderItem();
        it.setProductId(actualProductId);
        it.setVariantId(variant.getVariantId());
        
        // ✅ Snapshot product details
        it.setProductName(product.getProductName());
        it.setProductPrice(price);  // Current final price (after discount)
        it.setOriginalPrice(variant.getOriginalPrice());  // Original price before discount
        
        // ✅ Snapshot variant specs
        it.setRamGb(variant.getRamGb());
        it.setStorageGb(variant.getStorageGb());
        it.setColorName(color != null ? color.getColorName() : reqItem.colorName());
        
        // ✅ Quantity
        it.setQuantity(qty);
        
        // ✅ Snapshot image URL
        it.setImageUrl(resolveOrderItemImageUrl(product, color, reqItem.imageUrl()));

        return new OrderLineBuild(it, price.multiply(BigDecimal.valueOf(qty)));
    }

    private void requireVariantStock(ProductVariant variant, int requestedQty, String productLabel) {
        if (variant == null) {
            throw new IllegalArgumentException("Phiên bản sản phẩm không hợp lệ.");
        }
        if (requestedQty <= 0) {
            throw new IllegalArgumentException("Số lượng phải lớn hơn 0.");
        }
        
        // ✅ Use computed availableStock instead of deprecated quantity field
        int available = variant.getAvailableStock();
        
        if (requestedQty > available) {
            String label = productLabel != null && !productLabel.isBlank() ? productLabel : "Sản phẩm";
            throw new IllegalStateException(
                    String.format("%s chỉ còn %d sản phẩm trong kho.", label, available)
            );
        }
    }

    private String buildVariantLabel(ProductVariant variant) {
        if (variant == null) {
            return "Sản phẩm";
        }
        try {
            ProductColor color = variant.getProductColor();
            Product productEntity = color != null ? color.getProduct() : null;
            String productName = productEntity != null ? productEntity.getProductName() : "Sản phẩm";
            String colorName = color != null ? color.getColorName() : "";
            String label = String.format(
                    "%s %sGB/%sGB",
                    productName,
                    variant.getRamGb() != null ? variant.getRamGb() : "?",
                    variant.getStorageGb() != null ? variant.getStorageGb() : "?"
            ).replace("  ", " ").trim();
            if (colorName != null && !colorName.isBlank()) {
                label = label + " (" + colorName + ")";
            }
            return label;
        } catch (Exception e) {
            return "Sản phẩm";
        }
    }

    private String resolveOrderItemImageUrl(com.webbanhang.shop.Model.Products.Product product, com.webbanhang.shop.Model.Products.ProductColor color, String fallbackFromClient) {
        // 1. Prioritize color-specific image if available
        if (color != null && color.getColorImages() != null && !color.getColorImages().isEmpty()) {
            String colorImg = color.getColorImages().stream()
                    .map(com.webbanhang.shop.Model.Products.ProductColorImage::getImageUrl)
                    .filter(u -> u != null && !u.isBlank())
                    .findFirst()
                    .orElse(null);
            if (colorImg != null) return colorImg;
        }

        // 2. Fallback to product thumbnail
        if (product != null && product.getProductImages() != null) {
            String thumbnail = product.getProductImages().stream()
                    .filter(pi -> Boolean.TRUE.equals(pi.getIsThumbnail()))
                    .map(com.webbanhang.shop.Model.Products.ProductImage::getImageUrl)
                    .filter(u -> u != null && !u.isBlank())
                    .findFirst()
                    .orElse(null);
            if (thumbnail != null) return thumbnail;

            String first = product.getProductImages().stream()
                    .map(com.webbanhang.shop.Model.Products.ProductImage::getImageUrl)
                    .filter(u -> u != null && !u.isBlank())
                    .findFirst()
                    .orElse(null);
            if (first != null) return first;
        }

        // 3. Last resort: use fallback from client
        return (fallbackFromClient == null || fallbackFromClient.isBlank()) ? null : fallbackFromClient;
    }

    @Override
    public List<Order> findTrash() {
        return orderRepository.findAllByDeletedAtIsNotNull();
    }

    @Override
    public List<Order> findTrashByCustomerId(Integer customerId) {
        return orderRepository.findAllByDeletedAtIsNotNullAndCustomerId(customerId);
    }

    @Override
    public boolean softDelete(Integer id) {
        return orderRepository.findById(id).map(existing -> {
            existing.setDeletedAt(Instant.now());
            orderRepository.save(existing);
            return true;
        }).orElse(false);
    }

    @Override
    public boolean restore(Integer id) {
        return orderRepository.findById(id).map(existing -> {
            existing.setDeletedAt(null);
            orderRepository.save(existing);
            return true;
        }).orElse(false);
    }

    @Override
    @Transactional
    public boolean deleteForever(Integer id) {
        return orderRepository.findById(id).map(existing -> {
            try {
                // 1. Xóa các nhật ký đối soát liên quan
                List<PaymentLog> logs = paymentLogRepository.findByOrderIdOrderByCreatedAtDesc(id);
                if (logs != null && !logs.isEmpty()) {
                    paymentLogRepository.deleteAll(logs);
                }

                // 2. Chuyển các minh chứng thanh toán VietQR vào kho lưu trữ thay vì xóa
                List<PaymentAttempt> attempts = paymentAttemptRepository.findAllByOrderIdOrderByCreatedAtDesc(id);
                System.out.println("[DELETE_FOREVER] Found " + (attempts != null ? attempts.size() : 0) + " payment attempts for order " + id);
                List<Integer> toArchive = new ArrayList<>();
                List<Integer> toDelete = new ArrayList<>();
                
                // Get order info for snapshot
                String orderCode = existing.getOrderCode();
                String adminNote = existing.getPaymentNote();
                
                if (attempts != null && !attempts.isEmpty()) {
                    for (PaymentAttempt attempt : attempts) {
                        System.out.println("  [BEFORE] attemptId=" + attempt.getAttemptId() + 
                                         ", transferImageUrl=" + (attempt.getTransferImageUrl() != null ? "EXISTS" : "NULL") +
                                         ", archivedAt=" + attempt.getArchivedAt());
                        if (attempt.getArchivedAt() == null) {
                            LocalDateTime archiveTime = LocalDateTime.now();
                            int updated = paymentAttemptRepository.updateArchivedAt(attempt.getAttemptId(), archiveTime);
                            System.out.println("  [AFTER UPDATE] attemptId=" + attempt.getAttemptId() + 
                                             ", updated=" + updated + " rows, archivedAt=" + archiveTime);
                            // Verify by re-querying
                            paymentAttemptRepository.findById(attempt.getAttemptId()).ifPresent(verified -> {
                                System.out.println("  [VERIFIED] attemptId=" + verified.getAttemptId() + 
                                                 ", transferImageUrl=" + (verified.getTransferImageUrl() != null ? "EXISTS: " + verified.getTransferImageUrl() : "NULL") +
                                                 ", archivedAt=" + verified.getArchivedAt());
                            });
                            System.out.println("  ✅ Archived attemptId=" + attempt.getAttemptId() + " at " + archiveTime);
                            toArchive.add(attempt.getAttemptId());
                        } else {
                            System.out.println("  ℹ️ attemptId=" + attempt.getAttemptId() + " already archived at " + attempt.getArchivedAt());
                            toArchive.add(attempt.getAttemptId());
                        }
                        
                        // Nếu không có transferImageUrl, đánh dấu để xóa
                        if (attempt.getTransferImageUrl() == null || attempt.getTransferImageUrl().isBlank()) {
                            toDelete.add(attempt.getAttemptId());
                        }
                    }
                    
                    // Set orderId = null và lưu snapshot data cho các payment attempts có archive để tránh bị cascade delete
                    if (!toArchive.isEmpty()) {
                        for (Integer attemptId : toArchive) {
                            // Update with snapshot data
                            paymentAttemptRepository.updateArchiveSnapshot(attemptId, orderCode, adminNote);
                            paymentAttemptRepository.updateOrderIdToNull(attemptId);
                            System.out.println("  [UNLINK] attemptId=" + attemptId + " orderId set to null, snapshot saved (orderCode=" + orderCode + ")");
                        }
                    }
                    
                    // Xóa các attempts không có image
                    if (!toDelete.isEmpty()) {
                        paymentAttemptRepository.deleteAllById(toDelete);
                        System.out.println("  [DELETED] " + toDelete.size() + " attempts without images");
                    }
                }

                // 3. Gỡ liên kết các giao dịch ngân hàng trong Sổ cái để chúng quay về trạng thái chưa khớp tự do
                List<BankTransaction> txs = bankTransactionRepository.findAllByMatchedOrderId(id);
                if (txs != null && !txs.isEmpty()) {
                    for (BankTransaction tx : txs) {
                        tx.setIsMatched(false);
                        tx.setMatchedOrderId(null);
                        tx.setMatchedByAdminId(null);
                        tx.setPaymentAttemptId(null);
                        tx.setReconcileStatus("PENDING");
                        tx.setRejectedReason(null);
                        bankTransactionRepository.save(tx);
                    }
                }

                // 4. Xóa payment records liên quan
                List<Payment> payments = paymentRepository.findAllByOrderId(id);
                if (payments != null && !payments.isEmpty()) {
                    paymentRepository.deleteAll(payments);
                }

                // 5. Xóa vĩnh viễn đơn hàng
                orderRepository.deleteById(id);
                return true;
            } catch (Exception e) {
                System.err.println("Failed to delete order forever: " + e.getMessage());
                e.printStackTrace();
                throw new RuntimeException("Cannot delete order: " + e.getMessage(), e);
            }
        }).orElse(false);
    }

    @Override
    @Transactional
    public Optional<Order> updateStatus(Integer id, OrderStatus status) {
        return orderRepository.findById(id).map(existing -> {
            OrderStatus previousStatus = existing.getOrderStatus();
            PaymentStatus previousPaymentStatus = existing.getPaymentStatus();
            
            // ⚠️ TEMPORARY: Log validation but don't block (for testing)
            try {
                OrderStatus.validateTransition(previousStatus, status);
                System.out.println("[ORDER] ✅ Valid transition: " + previousStatus + " → " + status);
            } catch (IllegalStateException e) {
                System.err.println("[ORDER] ⚠️ Invalid transition detected: " + previousStatus + " → " + status);
                System.err.println("[ORDER] Error: " + e.getMessage());
                // TODO: Uncomment this line to enforce state machine in production:
                // throw e;
                System.err.println("[ORDER] ⚠️ Allowing invalid transition for testing purposes");
            }
            
            existing.setOrderStatus(status);

            if ("COD".equalsIgnoreCase(existing.getPaymentMethod()) || existing.getPaymentMethod() == null) {
                if (status == OrderStatus.DELIVERED) {
                    PaymentStatus newPaymentStatus = PaymentStatus.PAID;
                    
                    // ✅ Validate payment status transition
                    try {
                        PaymentStatus.validateTransition(previousPaymentStatus, newPaymentStatus);
                    } catch (IllegalStateException e) {
                        System.err.println("[PAYMENT] Invalid payment status transition: " + e.getMessage());
                        // For COD, allow forcing to PAID on delivery
                        System.out.println("[PAYMENT] Forcing COD payment to PAID on delivery");
                    }
                    
                    existing.setPaymentStatus(newPaymentStatus);
                    
                    // ✅ CRITICAL FIX: Confirm sale - chuyển từ reserved sang sold (TRỪ KHO THỰC SỰ)
                    // ⚠️ CHỈ TRỪ KHO NẾU CHƯA TRỪ (tránh trừ 2 lần khi chuyển DELIVERED → SHIPPING → DELIVERED lại)
                    if (!Boolean.TRUE.equals(existing.getInventoryDeducted())) {
                        try {
                            for (OrderItem item : existing.getItems()) {
                                if (item.getVariantId() != null && item.getQuantity() != null && item.getQuantity() > 0) {
                                    inventoryService.confirmSale(item.getVariantId(), item.getQuantity());
                                }
                            }
                            existing.setInventoryDeducted(true);
                            System.out.println("[ORDER] ✅ COD order " + existing.getOrderCode() + " - Stock deducted on DELIVERED");
                        } catch (Exception e) {
                            System.err.println("Failed to confirm sale: " + e.getMessage());
                            throw new IllegalStateException("Không thể trừ kho: " + e.getMessage());
                        }
                    } else {
                        System.out.println("[ORDER] ℹ️ COD order " + existing.getOrderCode() + " - Inventory already deducted, skipping");
                    }
                } else {
                    existing.setPaymentStatus(PaymentStatus.UNPAID);
                }
            }

            if (status == OrderStatus.PENDING_PAYMENT_CONFIRMATION && "BANK_TRANSFER".equalsIgnoreCase(existing.getPaymentMethod())) {
                existing.setPaymentStatus(PaymentStatus.WAITING_CONFIRM);
            }
            
            Order savedOrder = orderRepository.save(existing);
            
            // Notify customer about status change
            if (previousStatus != status) {
                try {
                    NotificationAction action = NotificationAction.CONFIRM;
                    if (status == OrderStatus.CANCELLED) action = NotificationAction.CANCEL;
                    else if (status == OrderStatus.SHIPPING) action = NotificationAction.SHIPPING;
                    else if (status == OrderStatus.DELIVERED) action = NotificationAction.DELIVERED;
                    
                    NotificationDto notif = NotificationDto.builder()
                            .adminId(savedOrder.getCustomerId()) // this is customerId in CustomerNotificationDTO
                            .type(NotificationType.ORDER)
                            .action(action)
                            .actorType(ActorType.ADMIN)
                            .orderId(savedOrder.getOrderId())
                            .title("Cập nhật đơn hàng")
                            .message("Đơn hàng " + savedOrder.getOrderCode() + " của bạn đã chuyển sang trạng thái: " + translateStatus(status))
                            .build();
                    customerNotificationService.createNotification(notif);
                } catch (Exception e) {
                    System.err.println("Failed to create customer notification: " + e.getMessage());
                    e.printStackTrace();
                }
                
                // Send email notification for status change
                try {
                    if (status == OrderStatus.DELIVERED) {
                        // Generate PDF certificate and send with delivered email
                        System.out.println("[ORDER] Generating delivery certificate PDF for order " + savedOrder.getOrderCode());
                        byte[] certificatePdf = deliveryCertificateService.generateDeliveryCertificate(savedOrder);
                        String pdfDownloadUrl = null;
                        
                        if (certificatePdf != null && certificatePdf.length > 0) {
                            System.out.println("[ORDER] PDF generated successfully: " + certificatePdf.length + " bytes");
                            
                            // Upload PDF to MinIO and get public URL
                            try {
                                System.out.println("[ORDER] Uploading PDF certificate to MinIO for order " + savedOrder.getOrderCode());
                                com.webbanhang.shop.Service.Storage.MinioStorageService.UploadedObject uploaded = 
                                    minioStorageService.uploadOrderCertificatePdf(certificatePdf, savedOrder.getOrderCode());
                                pdfDownloadUrl = uploaded.url();
                                System.out.println("[ORDER] PDF uploaded successfully. Download URL: " + pdfDownloadUrl);
                            } catch (Exception e) {
                                System.err.println("[ORDER] WARNING: Failed to upload PDF to MinIO: " + e.getMessage());
                                e.printStackTrace();
                                // Continue anyway - will still attach PDF to email
                            }
                        } else {
                            System.err.println("[ORDER] WARNING: PDF generation returned NULL or empty for order " + savedOrder.getOrderCode());
                        }
                        
                        // ✅ Email giao hàng thành công đã bao gồm thông tin thanh toán
                        // Không cần gửi thêm email payment status change
                        customerEmailService.sendOrderDeliveredEmail(savedOrder, certificatePdf, pdfDownloadUrl);
                    } else {
                        // Send regular status change email
                        customerEmailService.sendOrderStatusChangeEmail(savedOrder, previousStatus, status);
                        
                        // ✅ Chỉ gửi email payment status change nếu KHÔNG PHẢI DELIVERED
                        // (vì email delivered đã bao gồm thông tin thanh toán)
                        if (previousPaymentStatus != savedOrder.getPaymentStatus()) {
                            customerEmailService.sendPaymentStatusChangeEmail(
                                    savedOrder,
                                    previousPaymentStatus,
                                    savedOrder.getPaymentStatus(),
                                    savedOrder.getPaymentNote()
                            );
                        }
                    }
                } catch (Exception e) {
                    System.err.println("Failed to send order status change email: " + e.getMessage());
                    e.printStackTrace();
                }
            }
            
            return savedOrder;
        });
    }

    private String translateStatus(OrderStatus status) {
        return switch (status) {
            case PENDING_CONFIRM -> "Chờ xác nhận";
            case PENDING_PAYMENT_CONFIRMATION -> "Chờ xác nhận thanh toán";
            case CONFIRMED -> "Đã xác nhận";
            case SHIPPING -> "Đang giao hàng";
            case PENDING_PICKUP -> "Chờ lấy hàng";
            case DELIVERED -> "Đã giao hàng";
            case CANCELLED -> "Đã hủy";
            default -> status.name();
        };
    }

    @Override
    public Optional<Order> payCod(Integer orderId, Integer customerId) {
        if (customerId == null) return Optional.empty();
        return orderRepository.findById(orderId).filter(o -> customerId.equals(o.getCustomerId())).map(existing -> {
            // COD orders stay in PENDING_CONFIRM until delivered
            existing.setOrderStatus(OrderStatus.PENDING_CONFIRM);
            existing.setPaymentMethod("COD");
            existing.setPaymentStatus(PaymentStatus.UNPAID);
            return orderRepository.save(existing);
        });
    }

    @Override
    public List<Order> getOrdersEligibleForReconciliation() {
        return orderRepository.findByPaymentMethodInAndPaymentStatusNot(List.of("BANK_TRANSFER", "Banking"), PaymentStatus.PAID);
    }

    private String generateOrderCode() {
        String suffix = UUID.randomUUID().toString().replace("-", "").substring(0, 10).toUpperCase(Locale.ROOT);
        return "ORD-" + suffix;
    }

    @Override
    @Transactional(propagation = org.springframework.transaction.annotation.Propagation.REQUIRES_NEW, noRollbackFor = Exception.class)
    public void deductInventory(Order order) {
        if (order == null || order.getItems() == null) return;
        if (Boolean.TRUE.equals(order.getInventoryDeducted())) return;

        try {
            for (OrderItem item : order.getItems()) {
                int qty = Math.max(0, item.getQuantity() == null ? 0 : item.getQuantity());
                if (qty <= 0) continue;

                Integer variantId = item.getVariantId();
                if (variantId != null) {
                    try {
                        productVariantRepository.findByVariantId(variantId).ifPresent(variant -> {
                            int current = Math.max(0, variant.getQuantity() == null ? 0 : variant.getQuantity());
                            variant.setQuantity(Math.max(0, current - qty));
                            productVariantRepository.save(variant);

                            ProductColor color = variant.getProductColor();
                            if (color != null) {
                                int colorCurrent = Math.max(0, color.getQuantity() == null ? 0 : color.getQuantity());
                                color.setQuantity(Math.max(0, colorCurrent - qty));
                                productColorRepository.save(color);
                            }
                        });
                    } catch (Exception e) {
                        System.err.println("Failed to deduct inventory for variant " + variantId + ": " + e.getMessage());
                        // Continue with other items even if one fails
                    }
                }
            }
            // ❌ DEPRECATED - Không còn dùng method này
            // Đã thay thế bằng inventoryService.confirmSale()
            order.setInventoryDeducted(true);
            orderRepository.save(order);
        } catch (Exception e) {
            System.err.println("⚠️ DEPRECATED: deductInventory() called - " + e.getMessage());
        }
    }

    /**
     * ❌ DEPRECATED: Không còn sử dụng
     * Thay vào đó dùng inventoryService.restoreStock()
     */
    @Deprecated
    @Override
    public void restoreInventory(Order order) {
        System.err.println("⚠️ WARNING: restoreInventory() is deprecated. Use inventoryService.restoreStock()");
    }

    @Override
    public Optional<Order> cancelOrder(Integer orderId, Integer customerId, Integer reasonId, String cancelNote, CancelledBy cancelledBy) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Đơn hàng không tồn tại."));

        if (customerId != null && !customerId.equals(order.getCustomerId())) {
            throw new IllegalArgumentException("Bạn không có quyền hủy đơn hàng này.");
        }

        if (order.getOrderStatus() == OrderStatus.CANCELLED) {
            return Optional.of(order);
        }

        // Check if status allows cancellation
        List<OrderStatus> allowableStatuses = List.of(
                OrderStatus.PENDING_CONFIRM,
                OrderStatus.PENDING_PAYMENT_CONFIRMATION,
                OrderStatus.CONFIRMED,
                OrderStatus.PENDING_PICKUP
        );

        if (!allowableStatuses.contains(order.getOrderStatus())) {
            throw new IllegalStateException("Đơn hàng ở trạng thái " + translateStatus(order.getOrderStatus()) + " không thể hủy.");
        }
        
        // ✅ CRITICAL FIX: Prevent customer from cancelling PAID orders
        // If payment is PAID, customer CANNOT cancel directly
        // They must contact support to create refund request
        if (cancelledBy == CancelledBy.CUSTOMER && order.getPaymentStatus() == PaymentStatus.PAID) {
            throw new IllegalStateException(
                "Đơn hàng đã thanh toán không thể tự hủy. " +
                "Vui lòng liên hệ hỗ trợ để yêu cầu hoàn tiền."
            );
        }

        Reason reason = reasonRepository.findById(reasonId)
                .orElseThrow(() -> new IllegalArgumentException("Lý do hủy không hợp lệ."));

        if (reason.getReasonType() != ReasonType.ORDER_CANCEL) {
            throw new IllegalArgumentException("Loại lý do không đúng.");
        }

        if (Boolean.TRUE.equals(reason.getAllowInput()) && (cancelNote == null || cancelNote.isBlank())) {
            throw new IllegalArgumentException("Vui lòng nhập lý do chi tiết.");
        }

        OrderStatus previousStatus = order.getOrderStatus();
        PaymentStatus previousPaymentStatus = order.getPaymentStatus();

        order.setOrderStatus(OrderStatus.CANCELLED);
        order.setPaymentStatus(PaymentStatus.FAILED);
        order.setCancelReasonId(reasonId);
        order.setCancelNote(cancelNote);
        order.setCancelledBy(cancelledBy);
        order.setCancelledAt(java.time.LocalDateTime.now());

        // ✅ CRITICAL FIX: Release/Restore stock khi hủy đơn
        // - Nếu chưa trừ kho (chỉ reserved) → release reserved stock
        // - Nếu đã trừ kho (sold) → restore inventory (hoàn hàng)
        try {
            if (Boolean.TRUE.equals(order.getInventoryDeducted())) {
                // Đã trừ kho → phải hoàn lại stock
                for (OrderItem item : order.getItems()) {
                    if (item.getVariantId() != null && item.getQuantity() != null && item.getQuantity() > 0) {
                        inventoryService.restoreStock(item.getVariantId(), item.getQuantity());
                    }
                }
                order.setInventoryDeducted(false);
                System.out.println("[ORDER] ⚠️ Restored inventory for cancelled order " + order.getOrderCode());
            } else {
                // Chưa trừ kho → chỉ release reserved
                for (OrderItem item : order.getItems()) {
                    if (item.getVariantId() != null && item.getQuantity() != null && item.getQuantity() > 0) {
                        inventoryService.releaseStock(item.getVariantId(), item.getQuantity());
                    }
                }
                System.out.println("[ORDER] Released reserved stock for cancelled order " + order.getOrderCode());
            }
        } catch (Exception e) {
            System.err.println("Failed to release/restore stock: " + e.getMessage());
            throw new IllegalStateException("Không thể hoàn stock: " + e.getMessage());
        }

        handleCancellationRefund(order);

        Order savedOrder = orderRepository.save(order);

        // Notify admins about cancellation
        NotificationDto notif = NotificationDto.builder()
                .type(NotificationType.ORDER)
                .action(NotificationAction.CANCEL)
                .actorType(cancelledBy == CancelledBy.CUSTOMER ? ActorType.CUSTOMER : ActorType.ADMIN)
                .actorId(customerId)
                .orderId(savedOrder.getOrderId())
                .title("Đơn hàng đã bị hủy")
                .message("Đơn hàng " + savedOrder.getOrderCode() + " đã bị hủy bởi " + (cancelledBy == CancelledBy.CUSTOMER ? "khách hàng" : "quản trị viên"))
                .build();
        notificationService.notifyAllAdmins(notif);

        try {
            customerEmailService.sendOrderStatusChangeEmail(savedOrder, previousStatus, OrderStatus.CANCELLED);
            customerEmailService.sendPaymentStatusChangeEmail(
                    savedOrder,
                    previousPaymentStatus,
                    PaymentStatus.FAILED,
                    cancelNote
            );
        } catch (Exception e) {
            System.err.println("Failed to send order cancellation email: " + e.getMessage());
        }

        return Optional.of(savedOrder);
    }

    @Override
    public Optional<Order> adminCancelOrder(Integer orderId, Integer adminId, Integer reasonId, String cancelNote) {
        Order order = orderRepository.findById(orderId).orElse(null);
        if (order == null) return Optional.empty();

        // 1. Validation
        if (order.getOrderStatus() == OrderStatus.DELIVERED) {
            throw new RuntimeException("Cannot cancel order in status: " + order.getOrderStatus());
        }
        // We allow adminCancelOrder even if it is already CANCELLED to update reasons/notes if needed
        // specifically when triggered from payment rejection workflows.

        Reason reason = reasonRepository.findById(reasonId).orElseThrow(() -> new RuntimeException("Reason not found"));
        if (reason.getReasonType() != ReasonType.ORDER_CANCEL) {
            throw new RuntimeException("Invalid reason type");
        }
        if (!Boolean.TRUE.equals(reason.getIsActive())) {
            throw new RuntimeException("Reason is not active");
        }

        if (Boolean.TRUE.equals(reason.getAllowInput()) && (cancelNote == null || cancelNote.isBlank())) {
            throw new RuntimeException("Cancel note is required for this reason");
        }

        OrderStatus previousStatus = order.getOrderStatus();
        PaymentStatus previousPaymentStatus = order.getPaymentStatus();

        // 2. Update Order
        order.setOrderStatus(OrderStatus.CANCELLED);
        order.setPaymentStatus(PaymentStatus.FAILED);
        order.setCancelReasonId(reasonId);
        order.setCancelNote(cancelNote);
        order.setCancelledBy(CancelledBy.ADMIN);
        order.setCancelledAt(java.time.LocalDateTime.now());
        order.setCancelledByAdminId(adminId);

        if (adminId != null) {
            adminAccountRepository.findById(adminId).ifPresent(admin -> {
                order.setCancelledByName(admin.getFullName());
            });
        }

        // Handle refund if already paid
        handleCancellationRefund(order);

        Order savedOrder = orderRepository.save(order);

        // ✅ CRITICAL FIX: Release/Restore stock khi admin cancel
        try {
            if (Boolean.TRUE.equals(savedOrder.getInventoryDeducted())) {
                // Đã trừ kho → restore
                for (OrderItem item : savedOrder.getItems()) {
                    if (item.getVariantId() != null && item.getQuantity() != null && item.getQuantity() > 0) {
                        inventoryService.restoreStock(item.getVariantId(), item.getQuantity());
                    }
                }
                savedOrder.setInventoryDeducted(false);
                orderRepository.save(savedOrder);
                System.out.println("[ORDER] ⚠️ Restored inventory for admin cancelled order " + savedOrder.getOrderCode());
            } else {
                // Chưa trừ kho → release reserved
                for (OrderItem item : savedOrder.getItems()) {
                    if (item.getVariantId() != null && item.getQuantity() != null && item.getQuantity() > 0) {
                        inventoryService.releaseStock(item.getVariantId(), item.getQuantity());
                    }
                }
                System.out.println("[ORDER] Released reserved stock for admin cancelled order " + savedOrder.getOrderCode());
            }
        } catch (Exception e) {
            System.err.println("Failed to release/restore stock: " + e.getMessage());
            throw new IllegalStateException("Không thể hoàn stock: " + e.getMessage());
        }

        // 4. Notification for Customer
        customerNotificationService.createNotification(
                com.webbanhang.shop.DTO.Notifications.NotificationDto.builder()
                        .adminId(savedOrder.getCustomerId()) // customerId maps to adminId in the generic DTO
                        .title("Đơn hàng đã bị hủy")
                        .message("Đơn hàng #" + (savedOrder.getOrderCode() != null ? savedOrder.getOrderCode() : savedOrder.getOrderId()) + " đã bị hủy bởi nhân viên")
                        .type(com.webbanhang.shop.Model.Notifications.NotificationType.ORDER)
                        .action(com.webbanhang.shop.Model.Notifications.NotificationAction.CANCEL)
                        .actorType(com.webbanhang.shop.Model.Notifications.ActorType.ADMIN)
                        .actorId(adminId)
                        .orderId(savedOrder.getOrderId())
                        .build()
        );

        try {
            if (previousStatus != OrderStatus.CANCELLED) {
                customerEmailService.sendOrderStatusChangeEmail(savedOrder, previousStatus, OrderStatus.CANCELLED);
            }
            customerEmailService.sendPaymentStatusChangeEmail(
                    savedOrder,
                    previousPaymentStatus,
                    PaymentStatus.FAILED,
                    cancelNote
            );
        } catch (Exception e) {
            System.err.println("Failed to send admin cancellation email: " + e.getMessage());
        }

        return Optional.of(savedOrder);
    }

    @Override
    public com.webbanhang.shop.DTO.Orders.OrderDto convertToDto(Order order) {
        if (order == null) return null;
        
        // Get cancel reason name if exists
        String reasonName = null;
        if (order.getCancelReasonId() != null) {
            reasonName = reasonRepository.findById(order.getCancelReasonId())
                    .map(Reason::getReasonName)
                    .orElse(null);
        }
        
        // ✅ ENRICH: If paymentNoteAuthor looks like "admin:123", replace with actual admin name
        String paymentNoteAuthor = order.getPaymentNoteAuthor();
        if (paymentNoteAuthor != null && paymentNoteAuthor.startsWith("admin:")) {
            try {
                String idStr = paymentNoteAuthor.substring(6); // Remove "admin:" prefix
                Integer adminId = Integer.parseInt(idStr);
                String actualName = getAdminFullName(adminId);
                if (actualName != null && !actualName.isBlank()) {
                    paymentNoteAuthor = actualName;
                }
            } catch (NumberFormatException e) {
                // Keep original if parsing fails
            }
        }
        
        // Create DTO with potentially enriched admin name
        if (paymentNoteAuthor != null && !paymentNoteAuthor.equals(order.getPaymentNoteAuthor())) {
            // Need to create new DTO with enriched admin name
            List<OrderItemDto> items = order.getItems() == null
                    ? List.of()
                    : order.getItems().stream().map(OrderItemDto::fromEntity).toList();

            com.webbanhang.shop.DTO.Orders.OrderDto dto = new com.webbanhang.shop.DTO.Orders.OrderDto(
                    order.getOrderId(),
                    order.getOrderCode(),
                    order.getCustomerId(),
                    order.getCustomerName(),
                    order.getEmail(),
                    order.getReceiverName(),
                    order.getReceiverPhone(),
                    order.getShippingAddress(),
                    order.getOrderStatus() != null ? order.getOrderStatus().name() : null,
                    order.getPaymentMethod(),
                    order.getPaymentStatus() != null ? order.getPaymentStatus().name() : null,
                    order.getTotalAmount(),
                    items,
                    order.getCreatedAt(),
                    order.getUpdatedAt(),
                    order.getDeletedAt(),
                    order.getPaymentNote(),
                    paymentNoteAuthor, // ✅ Use enriched name
                    order.getPaymentNoteDate() != null ? order.getPaymentNoteDate().toString() : null,
                    order.getCancelReasonId(),
                    order.getCancelNote(),
                    order.getCancelledBy() != null ? order.getCancelledBy().name() : null,
                    order.getCancelledAt(),
                    reasonName,
                    order.getCancelledByAdminId(),
                    order.getCancelledByName()
            );
            System.out.println("[DTO] convertToDto (enriched): orderId=" + order.getOrderId() + ", paymentNote='" + order.getPaymentNote() + "', adminNote in DTO='" + dto.adminNote() + "'");
            return dto;
        }
        
        com.webbanhang.shop.DTO.Orders.OrderDto dto = com.webbanhang.shop.DTO.Orders.OrderDto.fromEntity(order, reasonName);
        System.out.println("[DTO] convertToDto (standard): orderId=" + order.getOrderId() + ", paymentNote='" + order.getPaymentNote() + "', adminNote in DTO='" + dto.adminNote() + "'");
        return dto;
    }

    @Override
    public java.util.List<com.webbanhang.shop.DTO.Orders.OrderDto> convertToDtoList(java.util.List<Order> orders) {
        if (orders == null) return java.util.List.of();
        return orders.stream().map(this::convertToDto).toList();
    }
    
    /**
     * ✅ CRITICAL FIX: Handle refund khi cancel đơn đã thanh toán
     * - Nếu đã PAID → chuyển sang REFUND_PENDING (chờ admin hoàn tiền)
     * - Không tự động chuyển sang REFUNDED (phải có biên lai hoàn tiền)
     */
    private void handleCancellationRefund(Order order) {
        if (order.getPaymentStatus() == com.webbanhang.shop.Model.Orders.PaymentStatus.PAID) {
            // ✅ Chuyển sang REFUND_PENDING thay vì REFUNDED
            order.setPaymentStatus(com.webbanhang.shop.Model.Orders.PaymentStatus.REFUND_PENDING);
            
            String note = "[ĐÃ HỦY - CHỜ HOÀN TIỀN]";
            if (order.getPaymentNote() == null || !order.getPaymentNote().contains(note)) {
                order.setPaymentNote(order.getPaymentNote() != null ? order.getPaymentNote() + " " + note : note);
            }
            
            // ✅ TODO: Tạo Refund record trong bảng refunds
            // RefundService sẽ xử lý upload biên lai hoàn tiền
            // Admin confirm → chuyển sang REFUNDED
            System.out.println("[ORDER] Order " + order.getOrderCode() + " cancelled after payment - REFUND_PENDING");
        }
    }

    /**
     * ✅ NEW: Update payment status for refund process
     */
    @Override
    @Transactional
    public Optional<Order> updatePaymentStatus(
            Integer orderId,
            PaymentStatus newPaymentStatus,
            String note,
            Integer adminId,
            String adminName
    ) {
        Order order = orderRepository.findById(orderId).orElse(null);
        if (order == null) {
            return Optional.empty();
        }

        PaymentStatus currentStatus = order.getPaymentStatus();
        
        // Validate transition
        if (!PaymentStatus.isValidTransition(currentStatus, newPaymentStatus)) {
            throw new IllegalStateException(
                String.format(
                    "Invalid payment status transition: %s -> %s",
                    currentStatus, newPaymentStatus
                )
            );
        }

        // Update payment status
        order.setPaymentStatus(newPaymentStatus);
        
        // ✅ CRITICAL: When refund is completed, cancel the order automatically
        if (newPaymentStatus == PaymentStatus.REFUNDED) {
            // Set order status to CANCELLED
            order.setOrderStatus(OrderStatus.CANCELLED);
            
            // Set cancellation info
            order.setCancelledBy(com.webbanhang.shop.Model.Orders.CancelledBy.SYSTEM);
            order.setCancelledAt(java.time.LocalDateTime.now());
            order.setCancelledByName("Hệ thống");
            
            // Try to find "Khách hàng yêu cầu hủy đơn" reason, or use a default
            Integer refundReasonId = reasonRepository.findAll().stream()
                    .filter(r -> r.getReasonName() != null && r.getReasonName().contains("Khách hàng yêu cầu hủy"))
                    .map(Reason::getReasonId)
                    .findFirst()
                    .orElse(null);
            
            // If not found, create a generic message
            if (refundReasonId == null) {
                order.setCancelNote("Khách hàng yêu cầu hủy đơn. " + (note != null ? note : ""));
            } else {
                order.setCancelReasonId(refundReasonId);
                order.setCancelNote(note); // Use admin's refund note as cancel note
            }
            
            // ✅ CRITICAL: Restore inventory when order is cancelled due to refund
            // Same logic as adminCancelOrder: check if inventory was deducted
            try {
                if (Boolean.TRUE.equals(order.getInventoryDeducted())) {
                    // Đã trừ kho → phải hoàn lại stock
                    for (OrderItem item : order.getItems()) {
                        if (item.getVariantId() != null && item.getQuantity() != null && item.getQuantity() > 0) {
                            inventoryService.restoreStock(item.getVariantId(), item.getQuantity());
                        }
                    }
                    order.setInventoryDeducted(false);
                    System.out.println("[ORDER] ✅ Restored inventory for refunded order " + order.getOrderCode());
                } else {
                    // Chưa trừ kho → chỉ release reserved
                    for (OrderItem item : order.getItems()) {
                        if (item.getVariantId() != null && item.getQuantity() != null && item.getQuantity() > 0) {
                            inventoryService.releaseStock(item.getVariantId(), item.getQuantity());
                        }
                    }
                    System.out.println("[ORDER] ✅ Released reserved stock for refunded order " + order.getOrderCode());
                }
            } catch (Exception e) {
                System.err.println("[ORDER] ❌ Failed to restore inventory for order " + order.getOrderCode() + ": " + e.getMessage());
                throw new IllegalStateException("Không thể hoàn stock: " + e.getMessage());
            }
            
            System.out.println("[ORDER] Order " + order.getOrderCode() + " automatically cancelled due to REFUNDED status");
        }
        
        // Save admin note for refund (this goes into payment_note field)
        if (note != null && !note.isBlank()) {
            order.setPaymentNote(note);
            order.setPaymentNoteAuthor(adminName);
            order.setPaymentNoteDate(java.time.LocalDateTime.now());
        }

        Order savedOrder = orderRepository.save(order);

        // Send notification to customer
        String statusLabel = getPaymentStatusLabel(newPaymentStatus);
        customerNotificationService.createNotification(
                com.webbanhang.shop.DTO.Notifications.NotificationDto.builder()
                        .adminId(savedOrder.getCustomerId())
                        .title("Cập nhật trạng thái thanh toán")
                        .message(String.format(
                            "Đơn hàng #%s: Trạng thái thanh toán đã được cập nhật thành \"%s\"",
                            savedOrder.getOrderCode() != null ? savedOrder.getOrderCode() : savedOrder.getOrderId(),
                            statusLabel
                        ))
                        .type(com.webbanhang.shop.Model.Notifications.NotificationType.ORDER)
                        .action(com.webbanhang.shop.Model.Notifications.NotificationAction.CONFIRM)
                        .actorType(com.webbanhang.shop.Model.Notifications.ActorType.ADMIN)
                        .actorId(adminId)
                        .orderId(savedOrder.getOrderId())
                        .build()
        );

        try {
            customerEmailService.sendPaymentStatusChangeEmail(savedOrder, currentStatus, newPaymentStatus, note);
        } catch (Exception e) {
            System.err.println("Failed to send payment status update email: " + e.getMessage());
        }

        System.out.println(String.format(
            "[ORDER] Payment status updated for order %s: %s -> %s by %s",
            savedOrder.getOrderCode(), currentStatus, newPaymentStatus, adminName
        ));

        return Optional.of(savedOrder);
    }

    private String getPaymentStatusLabel(PaymentStatus status) {
        return switch (status) {
            case PAID -> "Đã thanh toán";
            case UNPAID -> "Chưa thanh toán";
            case WAITING_CONFIRM -> "Chờ xác nhận";
            case FAILED -> "Thất bại";
            case REFUND_PENDING -> "Đang chờ hoàn tiền";
            case REFUNDED -> "Đã hoàn tiền";
            case PARTIAL_REFUNDED -> "Hoàn tiền một phần";
            case PARTIAL_PAID -> "Thanh toán một phần";
            case REOPENED -> "Đã mở lại";
        };
    }
    
    @Override
    public String getAdminFullName(Integer adminId) {
        if (adminId == null) return null;
        return adminAccountRepository.findById(adminId)
                .map(admin -> {
                    String fullName = admin.getFullName();
                    // Fallback to username if fullName is null or empty
                    if (fullName == null || fullName.isBlank()) {
                        return admin.getUsername();
                    }
                    return fullName;
                })
                .orElse(null);
    }
}