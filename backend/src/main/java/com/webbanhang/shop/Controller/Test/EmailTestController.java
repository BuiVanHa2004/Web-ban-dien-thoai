package com.webbanhang.shop.Controller.Test;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.web.bind.annotation.*;
import jakarta.mail.internet.MimeMessage;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/test")
public class EmailTestController {

    private static final Logger log = LoggerFactory.getLogger(EmailTestController.class);

    @Autowired
    private JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String mailUsername;

    @Value("${spring.mail.password}")
    private String mailPassword;

    @Value("${spring.mail.host}")
    private String mailHost;

    @Value("${spring.mail.port}")
    private int mailPort;

    @Value("${mail.from:}")
    private String mailFrom;

    /**
     * Test endpoint to check email configuration and send a test email
     * GET /api/test/email-config - Shows current email configuration (password masked)
     * POST /api/test/send-email?to=email@example.com - Sends a test email
     */
    @GetMapping("/email-config")
    public ResponseEntity<?> checkEmailConfig() {
        Map<String, Object> config = new HashMap<>();
        config.put("host", mailHost);
        config.put("port", mailPort);
        config.put("username", mailUsername);
        config.put("from", mailFrom);
        
        // Mask password for security
        String maskedPassword = mailPassword != null && mailPassword.length() > 4 
            ? mailPassword.substring(0, 2) + "****" + mailPassword.substring(mailPassword.length() - 2)
            : "****";
        config.put("password", maskedPassword);
        config.put("passwordLength", mailPassword != null ? mailPassword.length() : 0);
        
        log.info("Email config check - Host: {}, Port: {}, Username: {}, Password length: {}", 
            mailHost, mailPort, mailUsername, mailPassword != null ? mailPassword.length() : 0);
        
        return ResponseEntity.ok(config);
    }

    @RequestMapping(value = "/send-email", method = {RequestMethod.GET, RequestMethod.POST})
    public ResponseEntity<?> sendTestEmail(@RequestParam String to) {
        Map<String, Object> result = new HashMap<>();
        
        try {
            log.info("=== STARTING EMAIL TEST ===");
            log.info("Attempting to send test email to: {}", to);
            log.info("SMTP Config - Host: {}, Port: {}, Username: {}", mailHost, mailPort, mailUsername);
            
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            String fromAddress = mailFrom != null && !mailFrom.isBlank() ? mailFrom : mailUsername;
            log.info("Setting FROM address: {}", fromAddress);
            helper.setFrom(fromAddress, "MyPhone Store Test");
            
            log.info("Setting TO address: {}", to);
            helper.setTo(to);
            
            helper.setSubject("Test Email từ MyPhone Store");
            
            String htmlContent = buildTestEmailHtml();
            helper.setText(htmlContent, true);
            
            log.info("Sending email via JavaMailSender...");
            long startTime = System.currentTimeMillis();
            
            mailSender.send(message);
            
            long endTime = System.currentTimeMillis();
            long duration = endTime - startTime;
            
            log.info("✅ Email sent successfully in {}ms", duration);
            log.info("=== EMAIL TEST COMPLETED SUCCESSFULLY ===");
            
            result.put("success", true);
            result.put("message", "Email đã gửi thành công");
            result.put("to", to);
            result.put("from", fromAddress);
            result.put("duration", duration + "ms");
            
            return ResponseEntity.ok(result);
            
        } catch (Exception e) {
            log.error("❌ FAILED TO SEND EMAIL", e);
            log.error("=== EMAIL TEST FAILED ===");
            log.error("Error type: {}", e.getClass().getName());
            log.error("Error message: {}", e.getMessage());
            
            if (e.getCause() != null) {
                log.error("Cause: {}", e.getCause().getMessage());
            }
            
            // Log full stack trace for debugging
            e.printStackTrace();
            
            result.put("success", false);
            result.put("error", e.getClass().getName());
            result.put("message", e.getMessage());
            
            if (e.getCause() != null) {
                result.put("cause", e.getCause().getMessage());
            }
            
            // Detailed error analysis
            String errorAnalysis = analyzeError(e);
            result.put("analysis", errorAnalysis);
            
            return ResponseEntity.status(500).body(result);
        }
    }

    private String analyzeError(Exception e) {
        String message = e.getMessage();
        String errorType = e.getClass().getSimpleName();
        
        if (message != null) {
            if (message.contains("535") || message.contains("Username and Password not accepted")) {
                return "Lỗi xác thực Gmail: Username hoặc Password không đúng. " +
                       "Kiểm tra: 1) Xác thực 2 bước đã bật chưa, 2) App Password có đúng không (16 ký tự), " +
                       "3) Copy App Password có bị thừa khoảng trắng không";
            } else if (message.contains("530")) {
                return "Lỗi xác thực: SMTP server yêu cầu authentication nhưng thông tin không hợp lệ";
            } else if (message.contains("Connection timed out")) {
                return "Lỗi kết nối: Không thể kết nối đến SMTP server. Kiểm tra firewall hoặc network";
            } else if (message.contains("Unknown host")) {
                return "Lỗi DNS: Không tìm thấy SMTP host " + mailHost;
            } else if (message.contains("AuthenticationFailedException")) {
                return "Xác thực thất bại: Gmail App Password không hợp lệ hoặc đã hết hạn";
            }
        }
        
        return "Lỗi " + errorType + ": " + (message != null ? message : "Unknown error");
    }

    private String buildTestEmailHtml() {
        String currentTime = java.time.LocalDateTime.now().toString();
        
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
        html.append(".footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }");
        html.append("</style>");
        html.append("</head>");
        html.append("<body>");
        html.append("<div class='container'>");
        html.append("<div class='header'>");
        html.append("<h1>🧪 Email Test</h1>");
        html.append("<p>MyPhone Store</p>");
        html.append("</div>");
        html.append("<div class='content'>");
        html.append("<h2>Email đang hoạt động!</h2>");
        html.append("<p>Đây là email test từ hệ thống MyPhone Store.</p>");
        html.append("<p>Nếu bạn nhận được email này, nghĩa là cấu hình email đã thành công.</p>");
        html.append("<p><strong>Thời gian gửi:</strong> ").append(currentTime).append("</p>");
        html.append("</div>");
        html.append("<div class='footer'>");
        html.append("<p><strong>MyPhone Store</strong></p>");
        html.append("<p>&copy; 2024 MyPhone Store. All rights reserved.</p>");
        html.append("</div>");
        html.append("</div>");
        html.append("</body>");
        html.append("</html>");
        
        return html.toString();
    }
}
