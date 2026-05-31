package com.webbanhang.shop.Service.Orders;

import com.webbanhang.shop.DTO.Orders.EvaluateDetailDto;
import com.webbanhang.shop.DTO.Orders.EvaluateProductStatDto;

import java.util.List;

public interface EvaluateAdminService {
    List<EvaluateProductStatDto> getProductStats();

    List<EvaluateDetailDto> getByProductId(Integer productId);

    boolean softDelete(Integer evaluateId);

    boolean reply(Integer evaluateId, String reply);

    boolean deleteReply(Integer evaluateId);
}
