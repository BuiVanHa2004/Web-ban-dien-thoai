package com.webbanhang.shop.Repository.PriceSegments;

import com.webbanhang.shop.Model.PriceSegments.CategoryPriceSegment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface CategoryPriceSegmentRepository extends JpaRepository<CategoryPriceSegment, Integer> {
    List<CategoryPriceSegment> findAllByCategoryCategoryId(Integer categoryId);
    
    @Modifying
    @Query("DELETE FROM CategoryPriceSegment cps WHERE cps.category.categoryId = :categoryId")
    void deleteByCategoryId(@Param("categoryId") Integer categoryId);
}
