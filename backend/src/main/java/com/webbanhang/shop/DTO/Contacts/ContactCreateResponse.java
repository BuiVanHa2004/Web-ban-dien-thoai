package com.webbanhang.shop.DTO.Contacts;

import java.time.Instant;
import java.util.List;

public record ContactCreateResponse(
        Integer contactId,
        String fullName,
        String email,
        String phone,
        String subject,
        String message,
        Instant createdAt,
        List<String> imageUrls
) {
}
