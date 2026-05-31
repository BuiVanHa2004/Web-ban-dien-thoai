package com.webbanhang.shop.Service.Orders;

import com.webbanhang.shop.DTO.Orders.CustomerEvaluateDto;
import com.webbanhang.shop.DTO.Orders.ProductEvaluateCommentDto;
import com.webbanhang.shop.DTO.Orders.ProductEvaluateWithImagesDto;

import java.util.List;
import java.util.Optional;

public interface CustomerEvaluateService {
    List<ProductEvaluateCommentDto> getByProductId(Integer productId);

    List<ProductEvaluateWithImagesDto> getByProductIdWithImages(Integer productId);

    List<CustomerEvaluateDto> getByCustomerId(Integer customerId);

    List<CustomerEvaluateDto> getByOrderItemIds(List<Integer> orderItemIds);

    Optional<CustomerEvaluateDto> createEvaluate(Integer customerId, Integer productId, Integer rating, String content, List<String> imageUrls);

    Optional<CustomerEvaluateDto> upsertByOrderItem(
            Integer orderItemId,
            Integer customerId,
            Integer productId,
            Integer rating,
            String content,
            List<String> imageUrls,
            List<String> existingImageUrls
    );

    boolean deleteEvaluate(Integer evaluateId, Integer customerId);

    boolean deleteByOrderItem(Integer orderItemId, Integer customerId);
}
