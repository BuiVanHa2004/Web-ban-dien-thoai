package com.webbanhang.shop.Service.PriceSegments.Impl;

import com.webbanhang.shop.Model.PriceSegments.PriceSegment;
import com.webbanhang.shop.Repository.PriceSegments.PriceSegmentRepository;
import com.webbanhang.shop.Service.PriceSegments.PriceSegmentService;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class PriceSegmentServiceImpl implements PriceSegmentService {

    private final PriceSegmentRepository priceSegmentRepository;

    public PriceSegmentServiceImpl(PriceSegmentRepository priceSegmentRepository) {
        this.priceSegmentRepository = priceSegmentRepository;
    }

    @Override
    public List<PriceSegment> findAllActive() {
        return priceSegmentRepository.findAllByDeletedAtIsNullOrderByPriceSegmentIdAsc();
    }

    @Override
    public Optional<PriceSegment> findById(Integer id) {
        return priceSegmentRepository.findById(id).filter(s -> s.getDeletedAt() == null);
    }

    @Override
    public PriceSegment create(PriceSegment segment) {
        segment.setPriceSegmentId(null);
        segment.setDeletedAt(null);
        return priceSegmentRepository.save(segment);
    }
}
