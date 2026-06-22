package com.webbanhang.shop.Service.Email;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.mail.Message;
import jakarta.mail.Session;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeBodyPart;
import jakarta.mail.internet.MimeMessage;
import jakarta.mail.internet.MimeMultipart;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Properties;

/**
 * Gửi email thông qua Gmail REST API (HTTPS port 443) thay vì SMTP.
 * Giải quyết vấn đề Render.com block outbound SMTP ports (587, 465, 25).
 */
@Service
public class GmailApiService {

    private static final Logger log = LoggerFactory.getLogger(GmailApiService.class);

    private static final String TOKEN_URL = "https://oauth2.googleapis.com/token";
    private static final String GMAIL_SEND_URL = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send";

    @Value("${gmail.client-id}")
    private String clientId;

    @Value("${gmail.client-secret}")
    private String clientSecret;

    @Value("${gmail.refresh-token}")
    private String refreshToken;

    @Value("${gmail.from:buivanha22032004@gmail.com}")
    private String fromEmail;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newHttpClient();

    /**
     * Lấy access token mới từ refresh token.
     */
    private String getAccessToken() throws Exception {
        String body = "client_id=" + URLEncoder.encode(clientId, StandardCharsets.UTF_8) +
                "&client_secret=" + URLEncoder.encode(clientSecret, StandardCharsets.UTF_8) +
                "&refresh_token=" + URLEncoder.encode(refreshToken, StandardCharsets.UTF_8) +
                "&grant_type=refresh_token";

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(TOKEN_URL))
                .header("Content-Type", "application/x-www-form-urlencoded")
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        JsonNode json = objectMapper.readTree(response.body());

        if (!json.has("access_token")) {
            throw new RuntimeException("Failed to get Gmail access token: " + response.body());
        }

        return json.get("access_token").asText();
    }

    /**
     * Gửi email HTML không có file đính kèm.
     */
    public void sendHtmlEmail(String to, String subject, String htmlContent) throws Exception {
        sendEmail(to, subject, htmlContent, null, null);
    }

    /**
     * Gửi email HTML có file đính kèm.
     */
    public void sendEmailWithAttachment(String to, String subject, String htmlContent,
                                        byte[] attachment, String attachmentName) throws Exception {
        sendEmail(to, subject, htmlContent, attachment, attachmentName);
    }

    private void sendEmail(String to, String subject, String htmlContent,
                           byte[] attachment, String attachmentName) throws Exception {

        String accessToken = getAccessToken();

        // Dùng jakarta.mail để build MIME message (không cần kết nối SMTP)
        Properties props = new Properties();
        Session session = Session.getInstance(props);

        MimeMessage message = new MimeMessage(session);
        message.setFrom(new InternetAddress(fromEmail, "MyPhone Store", "UTF-8"));
        message.addRecipient(Message.RecipientType.TO, new InternetAddress(to));
        message.setSubject(subject, "UTF-8");

        if (attachment != null && attachment.length > 0) {
            // Multipart: HTML + file đính kèm
            MimeMultipart multipart = new MimeMultipart();

            MimeBodyPart htmlPart = new MimeBodyPart();
            htmlPart.setContent(htmlContent, "text/html; charset=utf-8");
            multipart.addBodyPart(htmlPart);

            MimeBodyPart attachPart = new MimeBodyPart();
            attachPart.setContent(attachment, "application/pdf");
            attachPart.setFileName(MimeBodyPart.encodeWord(attachmentName, "UTF-8", "B"));
            multipart.addBodyPart(attachPart);

            message.setContent(multipart);
        } else {
            message.setContent(htmlContent, "text/html; charset=utf-8");
        }

        // Convert MIME message sang base64url
        ByteArrayOutputStream buffer = new ByteArrayOutputStream();
        message.writeTo(buffer);
        String rawEmail = Base64.getUrlEncoder().encodeToString(buffer.toByteArray());

        // Gửi qua Gmail API
        String requestBody = "{\"raw\":\"" + rawEmail + "\"}";

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(GMAIL_SEND_URL))
                .header("Authorization", "Bearer " + accessToken)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() != 200) {
            throw new RuntimeException("Gmail API error " + response.statusCode() + ": " + response.body());
        }

        log.info("Email sent via Gmail API to {}", to);
    }
}
