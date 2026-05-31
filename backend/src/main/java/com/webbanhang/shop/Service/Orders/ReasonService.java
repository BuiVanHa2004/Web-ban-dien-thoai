package com.webbanhang.shop.Service.Orders;

import com.webbanhang.shop.DTO.Orders.ReasonDto;
import com.webbanhang.shop.Model.Orders.ReasonType;

import java.util.List;

public interface ReasonService {
    List<ReasonDto> getReasonsByType(ReasonType type);
}
