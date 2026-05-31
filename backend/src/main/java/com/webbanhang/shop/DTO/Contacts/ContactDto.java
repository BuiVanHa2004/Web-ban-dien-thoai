package com.webbanhang.shop.DTO.Contacts;

import java.time.Instant;
import java.util.List;

public record ContactDto(
        Integer contactId,
        String fullName,
        String email,
        String phone,
        String subject,
        String message,
        Instant createdAt,
        Instant deletedAt,
        List<String> imageUrls,
        Integer customerId,
        String currentFullName,
        String currentEmail,
        String currentPhone
) {
}
