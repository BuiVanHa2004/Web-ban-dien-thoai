package com.webbanhang.shop.Service.PriceSegments;

import com.webbanhang.shop.Model.PriceSegments.PriceSegment;

import java.util.List;
import java.util.Optional;

public interface PriceSegmentService {
    List<PriceSegment> findAllActive();

    Optional<PriceSegment> findById(Integer id);

    PriceSegment create(PriceSegment segment);
}
