package com.webbanhang.shop.DTO.AI;

public record AiAdviceRequest(
        String message,
        Integer topK,
        Integer userId,           // ID khách hàng (nếu đã đăng nhập)
        String guestSessionId,    // Session ID từ frontend (nếu khách vãng lai)
        Long sessionId            // Session ID từ database (nếu chat tiếp theo)
) {
}
