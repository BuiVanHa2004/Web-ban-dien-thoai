package com.webbanhang.shop.Service.AI;

import com.webbanhang.shop.DTO.AI.AiQuotaDto;

public class AiGuardBlockedException extends RuntimeException {
    private final int statusCode;
    private final String code;
    private final AiQuotaDto quota;

    public AiGuardBlockedException(int statusCode, String code, String message, AiQuotaDto quota) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.quota = quota;
    }

    public int getStatusCode() {
        return statusCode;
    }

    public String getCode() {
        return code;
    }

    public AiQuotaDto getQuota() {
        return quota;
    }
}
