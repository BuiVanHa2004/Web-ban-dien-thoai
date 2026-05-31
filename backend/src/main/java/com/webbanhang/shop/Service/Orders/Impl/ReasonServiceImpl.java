package com.webbanhang.shop.Service.Orders.Impl;

import com.webbanhang.shop.DTO.Orders.ReasonDto;
import com.webbanhang.shop.Model.Orders.Reason;
import com.webbanhang.shop.Model.Orders.ReasonType;
import com.webbanhang.shop.Repository.Orders.ReasonRepository;
import com.webbanhang.shop.Service.Orders.ReasonService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ReasonServiceImpl implements ReasonService {

    private final ReasonRepository reasonRepository;

    @Override
    public List<ReasonDto> getReasonsByType(ReasonType type) {
        List<Reason> reasons = reasonRepository.findByReasonTypeAndIsActiveTrue(type);
        System.out.println("Found " + (reasons != null ? reasons.size() : 0) + " reasons for type: " + type);
        if (reasons == null) return List.of();
        return reasons.stream().map(reason -> {
            ReasonDto dto = new ReasonDto();
            dto.setReasonId(reason.getReasonId());
            dto.setReasonName(reason.getReasonName());
            dto.setAllowInput(reason.getAllowInput());
            return dto;
        }).collect(Collectors.toList());
    }
}
