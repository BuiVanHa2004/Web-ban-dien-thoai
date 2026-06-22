package com.webbanhang.shop.Service.Email;

import com.webbanhang.shop.Model.Orders.Order;
import com.webbanhang.shop.Model.Orders.OrderItem;
import com.webbanhang.shop.Model.Orders.OrderStatus;
import com.webbanhang.shop.Model.Orders.PaymentStatus;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.text.NumberFormat;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

@Service
public class CustomerEmailService {

    private static final Logger log = LoggerFactory.getLogger(CustomerEmailService.class);

    private final GmailApiService gmailApiService;
    private final DateTimeFormatter dateFormatter = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss");
    private final NumberFormat currencyFormatter = NumberFormat.getCurrencyInstance(new Locale("vi", "VN"));

    public CustomerEmailService(GmailApiService gmailApiService) {
        this.gmailApiService = gmailApiService;
    }

    private void sendHtmlEmail(String to, String subject, String htmlContent) {
        if (to == null || to.isBlank()) {
            log.warn("Cannot send email - recipient address is empty");
            return;
        }
        try {
            gmailApiService.sendHtmlEmail(to, subject, htmlContent);
        } catch (Exception ex) {
            throw new RuntimeException("Failed to send email to " + to, ex);
        }
    }

    @Async
    public void sendOrderConfirmationEmail(Order order) {
        if (order.getEmail() == null || order.getEmail().isBlank()) {
            log.warn("Cannot send order confirmation email - no email address for order {}", order.getOrderCode());
            return;
        }

        try {
            String htmlContent = buildOrderConfirmationEmailHtml(order);
            sendHtmlEmail(
                    order.getEmail(),
                    "MyPhone Store - Đơn hàng " + order.getOrderCode() + " đã được tạo thành công",
                    htmlContent
            );
            log.info("Sent order confirmation email to {} for order {}", order.getEmail(), order.getOrderCode());
        } catch (Exception ex) {
            log.error("Failed to send order confirmation email to {} for order {}",
                    order.getEmail(), order.getOrderCode(), ex);
        }
    }

    @Async
    public void sendOrderStatusChangeEmail(Order order, OrderStatus oldStatus, OrderStatus newStatus) {
        if (order.getEmail() == null || order.getEmail().isBlank()) {
            log.warn("Cannot send order status change email - no email address for order {}", order.getOrderCode());
            return;
        }

        try {
            String htmlContent = buildOrderStatusChangeEmailHtml(order, oldStatus, newStatus);
            sendHtmlEmail(
                    order.getEmail(),
                    "MyPhone Store - Đơn hàng " + order.getOrderCode() + " đã cập nhật trạng thái",
                    htmlContent
            );
            log.info("Sent order status change email to {} for order {} ({} -> {})",
                    order.getEmail(), order.getOrderCode(), oldStatus, newStatus);
        } catch (Exception ex) {
            log.error("Failed to send order status change email to {} for order {}",
                    order.getEmail(), order.getOrderCode(), ex);
        }
    }

    @Async
    public void sendPaymentStatusChangeEmail(
            Order order,
            PaymentStatus oldStatus,
            PaymentStatus newStatus,
            String note
    ) {
        if (order.getEmail() == null || order.getEmail().isBlank()) {
            log.warn("Cannot send payment status change email - no email address for order {}", order.getOrderCode());
            return;
        }
        if (oldStatus == newStatus) {
            return;
        }

        try {
            String htmlContent = buildPaymentStatusChangeEmailHtml(order, oldStatus, newStatus, note);
            sendHtmlEmail(
                    order.getEmail(),
                    "MyPhone Store - Đơn hàng " + order.getOrderCode() + " cập nhật trạng thái thanh toán",
                    htmlContent
            );
            log.info("Sent payment status change email to {} for order {} ({} -> {})",
                    order.getEmail(), order.getOrderCode(), oldStatus, newStatus);
        } catch (Exception ex) {
            log.error("Failed to send payment status change email to {} for order {}",
                    order.getEmail(), order.getOrderCode(), ex);
        }
    }

    @Async
    public void sendOrderDeliveredEmail(Order order, byte[] certificatePdf) {
        if (order.getEmail() == null || order.getEmail().isBlank()) {
            log.warn("Cannot send order delivered email - no email address for order {}", order.getOrderCode());
            return;
        }

        try {
            String htmlContent = buildOrderDeliveredEmailHtml(order);
            String subject = "MyPhone Store - Đơn hàng " + order.getOrderCode() + " đã giao thành công";

            if (certificatePdf != null && certificatePdf.length > 0) {
                gmailApiService.sendEmailWithAttachment(
                        order.getEmail(),
                        subject,
                        htmlContent,
                        certificatePdf,
                        "Chung-nhan-don-hang-" + order.getOrderCode() + ".pdf"
                );
            } else {
                gmailApiService.sendHtmlEmail(order.getEmail(), subject, htmlContent);
            }
            log.info("Sent order delivered email to {} for order {}", order.getEmail(), order.getOrderCode());
        } catch (Exception ex) {
            log.error("Failed to send order delivered email to {} for order {}",
                    order.getEmail(), order.getOrderCode(), ex);
        }
    }

    @Async
    public void sendContactReplyEmail(String customerEmail, String customerName, String subject, String replyContent) {
        if (customerEmail == null || customerEmail.isBlank()) {
            log.warn("Cannot send contact reply email - no email address");
            return;
        }

        try {
            String htmlContent = buildContactReplyEmailHtml(customerName, subject, replyContent);
            sendHtmlEmail(customerEmail, "MyPhone Store - Phản hồi liên hệ của bạn", htmlContent);
            log.info("Sent contact reply email to {}", customerEmail);
        } catch (Exception ex) {
            log.error("Failed to send contact reply email to {}", customerEmail, ex);
        }
    }

    private String buildOrderConfirmationEmailHtml(Order order) {
        StringBuilder html = new StringBuilder();
        html.append("<!DOCTYPE html>");
        html.append("<html>");
        html.append("<head>");
        html.append("<meta charset='UTF-8'>");
        html.append("<style>");
        html.append("body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }");
        html.append(".container { max-width: 600px; margin: 0 auto; padding: 20px; }");
        html.append(".header { background-color: #007bff; color: white; padding: 20px; text-align: center; }");
        html.append(".content { padding: 20px; background-color: #f9f9f9; }");
        html.append(".order-info { background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; }");
        html.append(".product-table { width: 100%; border-collapse: collapse; margin: 15px 0; }");
        html.append(".product-table th, .product-table td { border: 1px solid #ddd; padding: 10px; text-align: left; }");
        html.append(".product-table th { background-color: #f2f2f2; }");
        html.append(".total { font-size: 18px; font-weight: bold; color: #007bff; }");
        html.append(".footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }");
        html.append("</style>");
        html.append("</head>");
        html.append("<body>");
        html.append("<div class='container'>");
        
        // Header
        html.append("<div class='header'>");
        html.append("<h1>MyPhone Store</h1>");
        html.append("<p>Cảm ơn bạn đã đặt hàng!</p>");
        html.append("</div>");
        
        // Content
        html.append("<div class='content'>");
        html.append("<h2>Xin chào ").append(escapeHtml(order.getCustomerName())).append(",</h2>");
        html.append("<p>Cảm ơn bạn đã đặt hàng tại MyPhone Store. Đơn hàng của bạn đã được tạo thành công.</p>");
        
        // Order info
        html.append("<div class='order-info'>");
        html.append("<h3>Thông tin đơn hàng</h3>");
        html.append("<p><strong>Mã đơn hàng:</strong> ").append(order.getOrderCode()).append("</p>");
        html.append("<p><strong>Ngày đặt:</strong> ").append(formatDateTime(order.getCreatedAt())).append("</p>");
        html.append("<p><strong>Trạng thái:</strong> ").append(translateStatus(order.getOrderStatus())).append("</p>");
        html.append("<p><strong>Trạng thái thanh toán:</strong> ").append(translatePaymentStatus(order.getPaymentStatus())).append("</p>");
        html.append("<p><strong>Phương thức thanh toán:</strong> ").append(translatePaymentMethod(order.getPaymentMethod())).append("</p>");
        html.append("</div>");
        
        // Delivery info
        html.append("<div class='order-info'>");
        html.append("<h3>Thông tin giao hàng</h3>");
        html.append("<p><strong>Người nhận:</strong> ").append(escapeHtml(order.getReceiverName())).append("</p>");
        html.append("<p><strong>Số điện thoại:</strong> ").append(escapeHtml(order.getReceiverPhone())).append("</p>");
        html.append("<p><strong>Địa chỉ:</strong> ").append(escapeHtml(order.getShippingAddress())).append("</p>");
        html.append("</div>");
        
        // Products
        html.append("<div class='order-info'>");
        html.append("<h3>Sản phẩm</h3>");
        html.append("<table class='product-table'>");
        html.append("<tr><th>Sản phẩm</th><th>Số lượng</th><th>Đơn giá</th><th>Thành tiền</th></tr>");
        
        for (OrderItem item : order.getItems()) {
            html.append("<tr>");
            html.append("<td>");
            html.append(escapeHtml(item.getProductName()));
            if (item.getRamGb() != null || item.getStorageGb() != null || item.getColorName() != null) {
                html.append("<br><small style='color: #666;'>");
                if (item.getRamGb() != null) html.append("RAM: ").append(item.getRamGb()).append("GB ");
                if (item.getStorageGb() != null) html.append("Bộ nhớ: ").append(item.getStorageGb()).append("GB ");
                if (item.getColorName() != null) html.append("Màu: ").append(escapeHtml(item.getColorName()));
                html.append("</small>");
            }
            html.append("</td>");
            html.append("<td>").append(item.getQuantity()).append("</td>");
            html.append("<td>").append(formatCurrency(item.getProductPrice())).append("</td>");
            BigDecimal lineTotal = item.getProductPrice().multiply(new BigDecimal(item.getQuantity()));
            html.append("<td>").append(formatCurrency(lineTotal)).append("</td>");
            html.append("</tr>");
        }
        
        html.append("<tr><td colspan='3' style='text-align: right;'><strong>Tổng cộng:</strong></td>");
        html.append("<td class='total'>").append(formatCurrency(order.getTotalAmount())).append("</td></tr>");
        html.append("</table>");
        html.append("</div>");
        
        html.append("<p>Chúng tôi sẽ thông báo cho bạn khi đơn hàng được cập nhật trạng thái.</p>");
        html.append("<p>Nếu có thắc mắc, vui lòng liên hệ với chúng tôi.</p>");
        html.append("</div>");
        
        // Footer
        html.append("<div class='footer'>");
        html.append("<p><strong>MyPhone Store</strong></p>");
        html.append("<p>Email: buivanha22032004@gmail.com | Hotline: 1900-xxxx</p>");
        html.append("<p>&copy; 2024 MyPhone Store. All rights reserved.</p>");
        html.append("</div>");
        
        html.append("</div>");
        html.append("</body>");
        html.append("</html>");
        
        return html.toString();
    }

    private String buildOrderStatusChangeEmailHtml(Order order, OrderStatus oldStatus, OrderStatus newStatus) {
        StringBuilder html = new StringBuilder();
        html.append("<!DOCTYPE html>");
        html.append("<html>");
        html.append("<head>");
        html.append("<meta charset='UTF-8'>");
        html.append("<style>");
        html.append("body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }");
        html.append(".container { max-width: 600px; margin: 0 auto; padding: 20px; }");
        html.append(".header { background-color: #007bff; color: white; padding: 20px; text-align: center; }");
        html.append(".content { padding: 20px; background-color: #f9f9f9; }");
        html.append(".status-box { background-color: white; padding: 20px; margin: 15px 0; border-radius: 5px; border-left: 4px solid #007bff; }");
        html.append(".order-info { background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; }");
        html.append(".footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }");
        html.append("</style>");
        html.append("</head>");
        html.append("<body>");
        html.append("<div class='container'>");
        
        // Header
        html.append("<div class='header'>");
        html.append("<h1>MyPhone Store</h1>");
        html.append("<p>Cập nhật trạng thái đơn hàng</p>");
        html.append("</div>");
        
        // Content
        html.append("<div class='content'>");
        html.append("<h2>Xin chào ").append(escapeHtml(order.getCustomerName())).append(",</h2>");
        html.append("<p>Đơn hàng <strong>").append(order.getOrderCode()).append("</strong> của bạn đã được cập nhật trạng thái.</p>");
        
        // Status change
        html.append("<div class='status-box'>");
        html.append("<h3 style='margin-top: 0;'>Trạng thái mới: <span style='color: #007bff;'>").append(translateStatus(newStatus)).append("</span></h3>");
        if (oldStatus != null) {
            html.append("<p><small>Trạng thái trước: ").append(translateStatus(oldStatus)).append("</small></p>");
        }
        html.append("<p>").append(getStatusDescription(newStatus)).append("</p>");
        html.append("</div>");
        
        // Order info
        html.append("<div class='order-info'>");
        html.append("<p><strong>Mã đơn hàng:</strong> ").append(order.getOrderCode()).append("</p>");
        html.append("<p><strong>Tổng tiền:</strong> ").append(formatCurrency(order.getTotalAmount())).append("</p>");
        html.append("<p><strong>Địa chỉ giao hàng:</strong> ").append(escapeHtml(order.getShippingAddress())).append("</p>");
        html.append("</div>");
        
        html.append("<p>Cảm ơn bạn đã tin tưởng MyPhone Store!</p>");
        html.append("</div>");
        
        // Footer
        html.append("<div class='footer'>");
        html.append("<p><strong>MyPhone Store</strong></p>");
        html.append("<p>Email: buivanha22032004@gmail.com | Hotline: 1900-xxxx</p>");
        html.append("<p>&copy; 2024 MyPhone Store. All rights reserved.</p>");
        html.append("</div>");
        
        html.append("</div>");
        html.append("</body>");
        html.append("</html>");
        
        return html.toString();
    }

    private String buildOrderDeliveredEmailHtml(Order order) {
        StringBuilder html = new StringBuilder();
        html.append("<!DOCTYPE html>");
        html.append("<html>");
        html.append("<head>");
        html.append("<meta charset='UTF-8'>");
        html.append("<style>");
        html.append("body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }");
        html.append(".container { max-width: 600px; margin: 0 auto; padding: 20px; }");
        html.append(".header { background-color: #28a745; color: white; padding: 20px; text-align: center; }");
        html.append(".content { padding: 20px; background-color: #f9f9f9; }");
        html.append(".success-box { background-color: #d4edda; border: 1px solid #c3e6cb; color: #155724; padding: 20px; margin: 15px 0; border-radius: 5px; text-align: center; }");
        html.append(".order-info { background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; }");
        html.append(".footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }");
        html.append("</style>");
        html.append("</head>");
        html.append("<body>");
        html.append("<div class='container'>");
        
        // Header
        html.append("<div class='header'>");
        html.append("<h1>🎉 Giao hàng thành công! 🎉</h1>");
        html.append("<p>MyPhone Store</p>");
        html.append("</div>");
        
        // Content
        html.append("<div class='content'>");
        html.append("<h2>Xin chào ").append(escapeHtml(order.getCustomerName())).append(",</h2>");
        
        html.append("<div class='success-box'>");
        html.append("<h3 style='margin-top: 0;'>✓ Đơn hàng của bạn đã được giao thành công!</h3>");
        html.append("<p>Đơn hàng <strong>").append(order.getOrderCode()).append("</strong> đã được giao đến địa chỉ của bạn.</p>");
        html.append("</div>");
        
        // Order info
        html.append("<div class='order-info'>");
        html.append("<h3>Thông tin đơn hàng</h3>");
        html.append("<p><strong>Mã đơn hàng:</strong> ").append(order.getOrderCode()).append("</p>");
        html.append("<p><strong>Ngày giao:</strong> ").append(formatDateTime(order.getUpdatedAt())).append("</p>");
        html.append("<p><strong>Tổng tiền:</strong> ").append(formatCurrency(order.getTotalAmount())).append("</p>");
        html.append("<p><strong>Địa chỉ giao hàng:</strong> ").append(escapeHtml(order.getShippingAddress())).append("</p>");
        html.append("</div>");
        
        html.append("<p><strong>📎 Chứng nhận đơn hàng:</strong> Vui lòng xem file PDF đính kèm để có chứng nhận giao hàng đầy đủ.</p>");
        html.append("<p>Cảm ơn bạn đã mua sắm tại MyPhone Store! Chúng tôi hy vọng bạn hài lòng với sản phẩm.</p>");
        html.append("<p>Nếu có bất kỳ vấn đề gì, vui lòng liên hệ với chúng tôi ngay.</p>");
        html.append("</div>");
        
        // Footer
        html.append("<div class='footer'>");
        html.append("<p><strong>MyPhone Store</strong></p>");
        html.append("<p>Email: buivanha22032004@gmail.com | Hotline: 1900-xxxx</p>");
        html.append("<p>&copy; 2024 MyPhone Store. All rights reserved.</p>");
        html.append("</div>");
        
        html.append("</div>");
        html.append("</body>");
        html.append("</html>");
        
        return html.toString();
    }

    private String buildPaymentStatusChangeEmailHtml(
            Order order,
            PaymentStatus oldStatus,
            PaymentStatus newStatus,
            String note
    ) {
        StringBuilder html = new StringBuilder();
        html.append("<!DOCTYPE html>");
        html.append("<html>");
        html.append("<head>");
        html.append("<meta charset='UTF-8'>");
        html.append("<style>");
        html.append("body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }");
        html.append(".container { max-width: 600px; margin: 0 auto; padding: 20px; }");
        html.append(".header { background-color: #007bff; color: white; padding: 20px; text-align: center; }");
        html.append(".content { padding: 20px; background-color: #f9f9f9; }");
        html.append(".status-box { background-color: white; padding: 20px; margin: 15px 0; border-radius: 5px; border-left: 4px solid #007bff; }");
        html.append(".order-info { background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; }");
        html.append(".footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }");
        html.append("</style>");
        html.append("</head>");
        html.append("<body>");
        html.append("<div class='container'>");

        html.append("<div class='header'>");
        html.append("<h1>MyPhone Store</h1>");
        html.append("<p>Cập nhật trạng thái thanh toán</p>");
        html.append("</div>");

        html.append("<div class='content'>");
        html.append("<h2>Xin chào ").append(escapeHtml(order.getCustomerName())).append(",</h2>");
        html.append("<p>Đơn hàng <strong>").append(order.getOrderCode()).append("</strong> của bạn đã được cập nhật trạng thái thanh toán.</p>");

        html.append("<div class='status-box'>");
        html.append("<h3 style='margin-top: 0;'>Trạng thái thanh toán mới: <span style='color: #007bff;'>")
                .append(translatePaymentStatus(newStatus)).append("</span></h3>");
        if (oldStatus != null) {
            html.append("<p><small>Trạng thái trước: ").append(translatePaymentStatus(oldStatus)).append("</small></p>");
        }
        html.append("<p>").append(getPaymentStatusDescription(newStatus)).append("</p>");
        if (note != null && !note.isBlank()) {
            html.append("<p><strong>Ghi chú:</strong> ").append(escapeHtml(note)).append("</p>");
        }
        html.append("</div>");

        html.append("<div class='order-info'>");
        html.append("<p><strong>Mã đơn hàng:</strong> ").append(order.getOrderCode()).append("</p>");
        html.append("<p><strong>Trạng thái đơn hàng:</strong> ").append(translateStatus(order.getOrderStatus())).append("</p>");
        html.append("<p><strong>Tổng tiền:</strong> ").append(formatCurrency(order.getTotalAmount())).append("</p>");
        html.append("<p><strong>Phương thức thanh toán:</strong> ").append(translatePaymentMethod(order.getPaymentMethod())).append("</p>");
        html.append("</div>");

        html.append("<p>Cảm ơn bạn đã tin tưởng MyPhone Store!</p>");
        html.append("</div>");

        html.append("<div class='footer'>");
        html.append("<p><strong>MyPhone Store</strong></p>");
        html.append("<p>Email: buivanha22032004@gmail.com | Hotline: 1900-xxxx</p>");
        html.append("<p>&copy; 2024 MyPhone Store. All rights reserved.</p>");
        html.append("</div>");

        html.append("</div>");
        html.append("</body>");
        html.append("</html>");

        return html.toString();
    }

    private String buildContactReplyEmailHtml(String customerName, String subject, String replyContent) {
        StringBuilder html = new StringBuilder();
        html.append("<!DOCTYPE html>");
        html.append("<html>");
        html.append("<head>");
        html.append("<meta charset='UTF-8'>");
        html.append("<style>");
        html.append("body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }");
        html.append(".container { max-width: 600px; margin: 0 auto; padding: 20px; }");
        html.append(".header { background-color: #007bff; color: white; padding: 20px; text-align: center; }");
        html.append(".content { padding: 20px; background-color: #f9f9f9; }");
        html.append(".reply-box { background-color: white; padding: 20px; margin: 15px 0; border-radius: 5px; border-left: 4px solid #007bff; }");
        html.append(".footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }");
        html.append("</style>");
        html.append("</head>");
        html.append("<body>");
        html.append("<div class='container'>");
        
        // Header
        html.append("<div class='header'>");
        html.append("<h1>MyPhone Store</h1>");
        html.append("<p>Phản hồi liên hệ của bạn</p>");
        html.append("</div>");
        
        // Content
        html.append("<div class='content'>");
        html.append("<h2>Xin chào ").append(escapeHtml(customerName)).append(",</h2>");
        html.append("<p>Cảm ơn bạn đã liên hệ với MyPhone Store. Đội ngũ nhân viên của chúng tôi đã phản hồi liên hệ của bạn về: <strong>").append(escapeHtml(subject)).append("</strong></p>");
        
        // Reply content
        html.append("<div class='reply-box'>");
        html.append("<h3 style='margin-top: 0;'>Nội dung phản hồi:</h3>");
        html.append("<p>").append(escapeHtml(replyContent).replace("\n", "<br>")).append("</p>");
        html.append("</div>");
        
        html.append("<p>Nếu bạn có thêm câu hỏi, đừng ngần ngại liên hệ lại với chúng tôi.</p>");
        html.append("</div>");
        
        // Footer
        html.append("<div class='footer'>");
        html.append("<p><strong>MyPhone Store</strong></p>");
        html.append("<p>Email: buivanha22032004@gmail.com | Hotline: 1900-xxxx</p>");
        html.append("<p>&copy; 2024 MyPhone Store. All rights reserved.</p>");
        html.append("</div>");
        
        html.append("</div>");
        html.append("</body>");
        html.append("</html>");
        
        return html.toString();
    }

    private String formatDateTime(java.time.Instant instant) {
        if (instant == null) return "";
        LocalDateTime ldt = LocalDateTime.ofInstant(instant, ZoneId.of("Asia/Ho_Chi_Minh"));
        return dateFormatter.format(ldt);
    }

    private String formatCurrency(BigDecimal amount) {
        if (amount == null) return "0đ";
        return currencyFormatter.format(amount);
    }

    private String escapeHtml(String text) {
        if (text == null) return "";
        return text.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }

    private String translateStatus(OrderStatus status) {
        if (status == null) return "";
        if (status == OrderStatus.PENDING_CONFIRM) return "Chờ xác nhận";
        if (status == OrderStatus.CONFIRMED) return "Đã xác nhận";
        if (status == OrderStatus.PENDING_PAYMENT_CONFIRMATION) return "Chờ xác nhận thanh toán";
        if (status == OrderStatus.PENDING_PICKUP) return "Chờ lấy hàng";
        if (status == OrderStatus.PENDING_SHIPPING) return "Chờ giao hàng";
        if (status == OrderStatus.SHIPPING) return "Đang giao hàng";
        if (status == OrderStatus.DELIVERED) return "Đã giao hàng";
        if (status == OrderStatus.CANCELLED) return "Đã hủy";
        return status.name();
    }

    private String translatePaymentMethod(String method) {
        if (method == null) return "COD";
        return "COD".equalsIgnoreCase(method) ? "Thanh toán khi nhận hàng (COD)" : "Chuyển khoản ngân hàng";
    }

    private String translatePaymentStatus(PaymentStatus status) {
        if (status == null) return "";
        return switch (status) {
            case UNPAID -> "Chưa thanh toán";
            case WAITING_CONFIRM -> "Chờ xác nhận thanh toán";
            case PAID -> "Đã thanh toán";
            case FAILED -> "Thanh toán thất bại";
            case REOPENED -> "Đã mở lại";
            case REFUND_PENDING -> "Đang chờ hoàn tiền";
            case REFUNDED -> "Đã hoàn tiền";
            case PARTIAL_REFUNDED -> "Hoàn tiền một phần";
            case PARTIAL_PAID -> "Thanh toán một phần";
        };
    }

    private String getPaymentStatusDescription(PaymentStatus status) {
        if (status == null) return "";
        return switch (status) {
            case UNPAID -> "Đơn hàng chưa được thanh toán. Vui lòng hoàn tất thanh toán theo hướng dẫn.";
            case WAITING_CONFIRM -> "Chúng tôi đã nhận minh chứng thanh toán và đang xác nhận.";
            case PAID -> "Thanh toán đã được xác nhận thành công.";
            case FAILED -> "Thanh toán không thành công hoặc đã bị từ chối.";
            case REOPENED -> "Đơn hàng đã được mở lại để thanh toán lại.";
            case REFUND_PENDING -> "Yêu cầu hoàn tiền đang được xử lý.";
            case REFUNDED -> "Số tiền đã được hoàn trả.";
            case PARTIAL_REFUNDED -> "Một phần số tiền đã được hoàn trả.";
            case PARTIAL_PAID -> "Đơn hàng đã được thanh toán một phần.";
        };
    }

    private String getStatusDescription(OrderStatus status) {
        if (status == null) return "";
        if (status == OrderStatus.PENDING_CONFIRM) return "Đơn hàng của bạn đang chờ được xác nhận.";
        if (status == OrderStatus.CONFIRMED) return "Đơn hàng đã được xác nhận và sẽ sớm được chuẩn bị.";
        if (status == OrderStatus.PENDING_PAYMENT_CONFIRMATION) return "Vui lòng hoàn tất thanh toán. Chúng tôi đang chờ xác nhận thanh toán của bạn.";
        if (status == OrderStatus.PENDING_PICKUP) return "Chúng tôi đang chuẩn bị hàng và chờ lấy hàng.";
        if (status == OrderStatus.PENDING_SHIPPING) return "Đơn hàng đã sẵn sàng và chờ giao hàng.";
        if (status == OrderStatus.SHIPPING) return "Đơn hàng đang trên đường giao đến bạn.";
        if (status == OrderStatus.DELIVERED) return "Đơn hàng đã được giao thành công. Cảm ơn bạn!";
        if (status == OrderStatus.CANCELLED) return "Đơn hàng đã bị hủy.";
        return "";
    }
}