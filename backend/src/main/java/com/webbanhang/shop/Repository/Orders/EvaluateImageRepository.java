package com.webbanhang.shop.Repository.Orders;

import com.webbanhang.shop.Model.Orders.EvaluateImage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EvaluateImageRepository extends JpaRepository<EvaluateImage, Integer> {
    List<EvaluateImage> findAllByEvaluateEvaluateIdOrderByCreatedAtDesc(Integer evaluateId);

    void deleteAllByEvaluateEvaluateId(Integer evaluateId);
}
