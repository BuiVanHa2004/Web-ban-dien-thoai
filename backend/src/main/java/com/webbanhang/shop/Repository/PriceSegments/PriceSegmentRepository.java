package com.webbanhang.shop.Repository.PriceSegments;

import com.webbanhang.shop.Model.PriceSegments.PriceSegment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

public interface PriceSegmentRepository extends JpaRepository<PriceSegment, Integer> {
    List<PriceSegment> findAllByDeletedAtIsNullOrderByPriceSegmentIdAsc();

    Optional<PriceSegment> findFirstByDeletedAtIsNullAndMinPriceAndMaxPrice(BigDecimal minPrice, BigDecimal maxPrice);
    
    Optional<PriceSegment> findBySegmentNameAndDeletedAtIsNull(String segmentName);
}
