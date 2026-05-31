package com.webbanhang.shop.Service.Orders.Impl;

import com.webbanhang.shop.DTO.Orders.EvaluateDetailDto;
import com.webbanhang.shop.DTO.Orders.EvaluateProductStatDto;
import com.webbanhang.shop.Model.Orders.Evaluate;
import com.webbanhang.shop.Model.Orders.EvaluateImage;
import com.webbanhang.shop.Model.Orders.EvaluateReply;
import com.webbanhang.shop.Repository.Orders.EvaluateImageRepository;
import com.webbanhang.shop.Repository.Orders.EvaluateReplyRepository;
import com.webbanhang.shop.Repository.Orders.EvaluateRepository;
import com.webbanhang.shop.Repository.Orders.OrderItemRepository;
import com.webbanhang.shop.Service.Orders.EvaluateAdminService;
import com.webbanhang.shop.Service.Storage.MinioStorageService;
import com.webbanhang.shop.Service.Notifications.CustomerNotificationService;
import com.webbanhang.shop.DTO.Notifications.NotificationDto;
import com.webbanhang.shop.Model.Notifications.NotificationType;
import com.webbanhang.shop.Model.Notifications.NotificationAction;
import com.webbanhang.shop.Model.Notifications.ActorType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class EvaluateAdminServiceImpl implements EvaluateAdminService {

    private final EvaluateRepository evaluateRepository;
    private final EvaluateReplyRepository evaluateReplyRepository;
    private final OrderItemRepository orderItemRepository;
    private final EvaluateImageRepository evaluateImageRepository;
    private final MinioStorageService minioStorageService;
    private final CustomerNotificationService customerNotificationService;

    public EvaluateAdminServiceImpl(EvaluateRepository evaluateRepository,
                                    EvaluateReplyRepository evaluateReplyRepository,
                                    OrderItemRepository orderItemRepository,
                                    EvaluateImageRepository evaluateImageRepository,
                                    MinioStorageService minioStorageService,
                                    CustomerNotificationService customerNotificationService) {
        this.evaluateRepository = evaluateRepository;
        this.evaluateReplyRepository = evaluateReplyRepository;
        this.orderItemRepository = orderItemRepository;
        this.evaluateImageRepository = evaluateImageRepository;
        this.minioStorageService = minioStorageService;
        this.customerNotificationService = customerNotificationService;
    }

    @Override
    public List<EvaluateProductStatDto> getProductStats() {
        return evaluateRepository.aggregateEvaluateStatsByProduct().stream().map(row -> {
            Integer productId = (Integer) row[0];
            String productName = (String) row[1];
            Long reviewCount = (Long) row[2];
            Long totalStars = row[3] == null ? 0L : ((Number) row[3]).longValue();
            String productImageUrl = (String) row[4];
            return new EvaluateProductStatDto(productId, productName, reviewCount, totalStars, productImageUrl);
        }).toList();
    }

    @Override
    public List<EvaluateDetailDto> getByProductId(Integer productId) {
        List<Evaluate> evaluates = evaluateRepository.findAllByProductProductIdOrderByCreatedAtDesc(productId);

        // Fetch all replies for these evaluates
        List<Integer> evaluateIds = evaluates.stream()
                .map(Evaluate::getEvaluateId)
                .toList();

        Map<Integer, EvaluateReply> replyMap = evaluateReplyRepository
                .findAllByEvaluate_EvaluateIdIn(evaluateIds)
                .stream()
                .collect(Collectors.toMap(
                        reply -> reply.getEvaluate().getEvaluateId(),
                        reply -> reply,
                        (existing, replacement) -> existing
                ));

        // Fetch all order items for these evaluates
        List<Integer> orderItemIds = evaluates.stream()
                .map(Evaluate::getOrderItemId)
                .filter(id -> id != null)
                .toList();
        Map<Integer, com.webbanhang.shop.Model.Orders.OrderItem> orderItemMap = orderItemRepository.findAllByOrderItemIdIn(orderItemIds)
                .stream()
                .collect(Collectors.toMap(
                        oi -> oi.getOrderItemId(),
                        oi -> oi,
                        (existing, replacement) -> existing
                ));

        return evaluates.stream()
                .map(e -> EvaluateDetailDto.fromEntity(e, replyMap.get(e.getEvaluateId()), orderItemMap.get(e.getOrderItemId())))
                .toList();
    }

    @Override
    @Transactional
    public boolean softDelete(Integer evaluateId) {
        return evaluateRepository.findById(evaluateId).map(existing -> {
            // Delete associated images from MinIO and database
            List<EvaluateImage> images = evaluateImageRepository.findAllByEvaluateEvaluateIdOrderByCreatedAtDesc(evaluateId);
            for (EvaluateImage img : images) {
                if (img.getImageUrl() != null && !img.getImageUrl().isBlank()) {
                    minioStorageService.deleteByUrl(img.getImageUrl());
                }
            }
            evaluateImageRepository.deleteAllByEvaluateEvaluateId(evaluateId);

            // Delete associated replies
            evaluateReplyRepository.deleteAllByEvaluate_EvaluateId(evaluateId);

            // Delete the evaluate itself
            evaluateRepository.delete(existing);
            return true;
        }).orElse(false);
    }

    @Override
    @Transactional
    public boolean reply(Integer evaluateId, String reply) {
        Optional<Evaluate> evaluateOpt = evaluateRepository.findById(evaluateId);
        if (evaluateOpt.isEmpty()) {
            return false;
        }

        Evaluate evaluate = evaluateOpt.get();

        // Check if reply already exists for this evaluate
        Optional<EvaluateReply> existingReply = evaluateReplyRepository.findByEvaluate_EvaluateId(evaluateId);

        if (existingReply.isPresent()) {
            // Update existing reply
            EvaluateReply replyEntity = existingReply.get();
            replyEntity.setReplyContent(reply);
            evaluateReplyRepository.save(replyEntity);
        } else {
            // Create new reply
            EvaluateReply newReply = new EvaluateReply();
            newReply.setEvaluate(evaluate);
            newReply.setReplyContent(reply);
            evaluateReplyRepository.save(newReply);
        }

        // Notify customer
        if (evaluate.getCustomer() != null) {
            // Lookup orderId from orderItem
            Integer orderId = null;
            if (evaluate.getOrderItemId() != null) {
                orderId = orderItemRepository.findById(evaluate.getOrderItemId())
                        .map(oi -> oi.getOrder().getOrderId())
                        .orElse(null);
            }
            NotificationDto notif = NotificationDto.builder()
                    .adminId(evaluate.getCustomer().getCustomerId()) // customer ID
                    .type(NotificationType.EVALUATE)
                    .action(NotificationAction.REPLY)
                    .actorType(ActorType.ADMIN)
                    .evaluateId(evaluate.getEvaluateId())
                    .orderId(orderId)
                    .title("Phản hồi đánh giá")
                    .message("Shop đã phản hồi đánh giá của bạn cho sản phẩm " + evaluate.getProduct().getProductName())
                    .build();
            customerNotificationService.createNotification(notif);
        }

        return true;
    }

    @Override
    @Transactional
    public boolean deleteReply(Integer evaluateId) {
        long deleted = evaluateReplyRepository.deleteAllByEvaluate_EvaluateId(evaluateId);
        return deleted > 0;
    }
}
