package com.webbanhang.shop.DTO.Contacts;

import java.time.Instant;
import java.util.List;

public record ContactReplyCreateResponse(
        Integer replyId,
        Integer contactId,
        Integer adminId,
        String replyContent,
        Boolean isRead,
        Instant createdAt,
        Instant updatedAt,
        List<String> imageUrls
) {
}
