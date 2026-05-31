package com.webbanhang.shop.Security;

import java.time.Instant;

public record JwtTokenDetails(String token, Instant issuedAt, Instant expiresAt) {
}

