package com.webbanhang.shop;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;

@SpringBootTest
public class EmailTest {

    @Autowired
    private JavaMailSender mailSender;

    @Test
    public void testSendEmail() {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom("buivanha22032004@gmail.com");
            message.setTo("buivanha22032004@gmail.com");
            message.setSubject("Test OTP - MyPhone Store");
            message.setText("Đây là email test.\n\nMã OTP của bạn là: 123456\n\nEmail này để test cấu hình SMTP.");
            
            mailSender.send(message);
            
            System.out.println("✅ Email đã được gửi thành công!");
            System.out.println("Kiểm tra inbox và spam của buivanha22032004@gmail.com");
            
        } catch (Exception e) {
            System.err.println("❌ Lỗi khi gửi email:");
            e.printStackTrace();
        }
    }
}
