package com.webbanhang.shop.Repository.PriceSegments;

import com.webbanhang.shop.Model.PriceSegments.CategoryPriceSegment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CategoryPriceSegmentRepository extends JpaRepository<CategoryPriceSegment, Integer> {
    List<CategoryPriceSegment> findAllByCategoryCategoryId(Integer categoryId);
}
