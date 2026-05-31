package com.webbanhang.shop.Service.Auth;

import com.webbanhang.shop.Exception.BadRequestException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@Service
public class GoogleTokenVerifier {
    private final RestTemplate restTemplate = new RestTemplate();
    private final String expectedClientId;

    public GoogleTokenVerifier(@Value("${google.client-id:}") String expectedClientId) {
        this.expectedClientId = expectedClientId;
    }

    public GoogleProfile verifyIdToken(String idToken) {
        if (idToken == null || idToken.isBlank()) {
            throw new BadRequestException("Thiếu Google id token.");
        }

        String url = "https://oauth2.googleapis.com/tokeninfo?id_token=" + idToken;
        Map<?, ?> data;
        try {
            data = restTemplate.getForObject(url, Map.class);
        } catch (Exception ex) {
            throw new BadRequestException("Google token không hợp lệ.");
        }
        if (data == null) {
            throw new BadRequestException("Không thể xác thực Google token.");
        }

        String aud = asString(data.get("aud"));
        String sub = asString(data.get("sub"));
        String email = asString(data.get("email"));
        String name = asString(data.get("name"));
        String verified = asString(data.get("email_verified"));

        if (sub == null || sub.isBlank() || email == null || email.isBlank()) {
            throw new BadRequestException("Google token thiếu thông tin tài khoản.");
        }
        if (!expectedClientId.isBlank() && !expectedClientId.equals(aud)) {
            throw new BadRequestException("Google token không đúng ứng dụng.");
        }
        if ("false".equalsIgnoreCase(verified)) {
            throw new BadRequestException("Email Google chưa được xác minh.");
        }

        return new GoogleProfile(sub, email.toLowerCase(), name == null ? "" : name);
    }

    private static String asString(Object v) {
        return v == null ? null : String.valueOf(v);
    }

    public record GoogleProfile(String googleId, String email, String fullName) {
    }
}
