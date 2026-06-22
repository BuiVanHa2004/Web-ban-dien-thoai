package com.webbanhang.shop.Controller.Test;

import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/test")
public class EmailTestController {

    private final JavaMailSender mailSender;
    private final String mailFrom;

    public EmailTestController(
            JavaMailSender mailSender,
            @org.springframework.beans.factory.annotation.Value("${mail.from:}") String mailFrom,
            @org.springframework.beans.factory.annotation.Value("${spring.mail.username:}") String mailUsername
    ) {
        this.mailSender = mailSender;
        this.mailFrom = (mailFrom != null && !mailFrom.isBlank()) ? mailFrom : mailUsername;
    }

    @PostMapping("/send-email")
    public Map<String, String> testSendEmail(@RequestBody Map<String, String> request) {
        String toEmail = request.getOrDefault("email", mailFrom);
        
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(mailFrom);
            message.setTo(toEmail);
            message.setSubject("Test Email - MyPhone Store");
            message.setText(
                "Đây là email test từ MyPhone Store.\n\n" +
                "Mã OTP test: 123456\n\n" +
                "Nếu bạn nhận được email này, cấu hình SMTP đã hoạt động!"
            );
            
            mailSender.send(message);
            
            return Map.of(
                "status", "success",
                "message", "Email đã được gửi thành công tới " + toEmail,
                "note", "Kiểm tra cả inbox và spam!"
            );
            
        } catch (Exception e) {
            return Map.of(
                "status", "error",
                "message", "Không thể gửi email: " + e.getMessage(),
                "error", e.getClass().getName()
            );
        }
    }

    @GetMapping("/mail-config")
    public Map<String, Object> getMailConfig(
        @org.springframework.beans.factory.annotation.Value("${spring.mail.host}") String host,
        @org.springframework.beans.factory.annotation.Value("${spring.mail.port}") int port,
        @org.springframework.beans.factory.annotation.Value("${spring.mail.username}") String username,
        @org.springframework.beans.factory.annotation.Value("${spring.mail.password}") String password
    ) {
        return Map.of(
            "host", host,
            "port", port,
            "username", username,
            "passwordConfigured", password != null && !password.isEmpty(),
            "passwordLength", password != null ? password.length() : 0
        );
    }
}
