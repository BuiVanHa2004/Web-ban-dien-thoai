package com.webbanhang.shop.Service.Orders.Impl;

import com.webbanhang.shop.DTO.Orders.CustomerEvaluateDto;
import com.webbanhang.shop.DTO.Orders.ProductEvaluateCommentDto;
import com.webbanhang.shop.DTO.Orders.ProductEvaluateWithImagesDto;
import com.webbanhang.shop.Model.Customers.CustomerAccount;
import com.webbanhang.shop.Model.Orders.Evaluate;
import com.webbanhang.shop.Model.Orders.EvaluateImage;
import com.webbanhang.shop.Model.Orders.EvaluateReply;
import com.webbanhang.shop.Model.Products.Product;
import com.webbanhang.shop.Repository.Customers.CustomerAccountRepository;
import com.webbanhang.shop.Repository.Orders.EvaluateImageRepository;
import com.webbanhang.shop.Repository.Orders.EvaluateReplyRepository;
import com.webbanhang.shop.Repository.Orders.EvaluateRepository;
import com.webbanhang.shop.Repository.Orders.OrderItemRepository;
import com.webbanhang.shop.Repository.Products.ProductRepository;
import com.webbanhang.shop.Service.Orders.CustomerEvaluateService;
import com.webbanhang.shop.Service.Storage.MinioStorageService;
import com.webbanhang.shop.Service.Notifications.NotificationService;
import com.webbanhang.shop.DTO.Notifications.NotificationDto;
import com.webbanhang.shop.Model.Notifications.NotificationType;
import com.webbanhang.shop.Model.Notifications.NotificationAction;
import com.webbanhang.shop.Model.Notifications.ActorType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class CustomerEvaluateServiceImpl implements CustomerEvaluateService {
    private final EvaluateRepository evaluateRepository;
    private final EvaluateImageRepository evaluateImageRepository;
    private final EvaluateReplyRepository evaluateReplyRepository;
    private final OrderItemRepository orderItemRepository;
    private final CustomerAccountRepository customerAccountRepository;
    private final ProductRepository productRepository;
    private final MinioStorageService minioStorageService;
    private final NotificationService notificationService;

    public CustomerEvaluateServiceImpl(
            EvaluateRepository evaluateRepository,
            EvaluateImageRepository evaluateImageRepository,
            EvaluateReplyRepository evaluateReplyRepository,
            OrderItemRepository orderItemRepository,
            CustomerAccountRepository customerAccountRepository,
            ProductRepository productRepository,
            MinioStorageService minioStorageService,
            NotificationService notificationService
    ) {
        this.evaluateRepository = evaluateRepository;
        this.evaluateImageRepository = evaluateImageRepository;
        this.evaluateReplyRepository = evaluateReplyRepository;
        this.orderItemRepository = orderItemRepository;
        this.customerAccountRepository = customerAccountRepository;
        this.productRepository = productRepository;
        this.minioStorageService = minioStorageService;
        this.notificationService = notificationService;
    }

    @Override
    public List<ProductEvaluateCommentDto> getByProductId(Integer productId) {
        if (productId == null) return List.of();
        List<Evaluate> evaluates = evaluateRepository.findAllByProductProductIdOrderByCreatedAtDesc(productId);
        
        // Fetch all replies for these evaluates
        List<Integer> evaluateIds = evaluates.stream()
                .map(Evaluate::getEvaluateId)
                .toList();
        Map<Integer, EvaluateReply> replyMap = evaluateReplyRepository.findAllByEvaluate_EvaluateIdIn(evaluateIds)
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
                .map(evaluate -> {
                    List<EvaluateImage> images = evaluateImageRepository.findAllByEvaluateEvaluateIdOrderByCreatedAtDesc(evaluate.getEvaluateId());
                    EvaluateReply reply = replyMap.get(evaluate.getEvaluateId());
                    com.webbanhang.shop.Model.Orders.OrderItem orderItem = evaluate.getOrderItemId() != null ? orderItemMap.get(evaluate.getOrderItemId()) : null;
                    return ProductEvaluateCommentDto.fromEntity(evaluate, images, reply, orderItem);
                })
                .toList();
    }

    @Override
    public List<ProductEvaluateWithImagesDto> getByProductIdWithImages(Integer productId) {
        if (productId == null) return List.of();
        List<Evaluate> evaluates = evaluateRepository.findAllByProductProductIdOrderByCreatedAtDesc(productId);
        
        // Fetch all replies for these evaluates
        List<Integer> evaluateIds = evaluates.stream()
                .map(Evaluate::getEvaluateId)
                .toList();
        Map<Integer, EvaluateReply> replyMap = evaluateReplyRepository.findAllByEvaluate_EvaluateIdIn(evaluateIds)
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
                .map(evaluate -> {
                    List<EvaluateImage> images = evaluateImageRepository.findAllByEvaluateEvaluateIdOrderByCreatedAtDesc(evaluate.getEvaluateId());
                    EvaluateReply reply = replyMap.get(evaluate.getEvaluateId());
                    com.webbanhang.shop.Model.Orders.OrderItem orderItem = evaluate.getOrderItemId() != null ? orderItemMap.get(evaluate.getOrderItemId()) : null;
                    return ProductEvaluateWithImagesDto.fromEntity(evaluate, images, reply, orderItem);
                })
                .toList();
    }

    @Override
    public List<CustomerEvaluateDto> getByCustomerId(Integer customerId) {
        if (customerId == null) return List.of();
        return evaluateRepository.findAllByCustomerCustomerIdOrderByCreatedAtDesc(customerId)
                .stream()
                .map(CustomerEvaluateDto::fromEntity)
                .toList();
    }

    @Override
    @Transactional
    public Optional<CustomerEvaluateDto> createEvaluate(Integer customerId, Integer productId, Integer rating, String content, List<String> imageUrls) {
        if (!isValidRating(rating)) return Optional.empty();

        Optional<CustomerAccount> maybeCustomer = customerAccountRepository.findByCustomerId(customerId);
        Optional<Product> maybeProduct = productRepository.findById(productId);
        if (maybeCustomer.isEmpty() || maybeProduct.isEmpty()) return Optional.empty();

        Optional<Evaluate> existingOpt = evaluateRepository.findByCustomerCustomerIdAndProductProductId(customerId, productId);
        Evaluate evaluate;
        boolean isCreate = false;
        if (existingOpt.isPresent()) {
            evaluate = existingOpt.get();
            evaluate.setRating(rating);
            evaluate.setContent(normalizeContent(content));

            // Replace images (if any) to keep createEvaluate idempotent
            List<EvaluateImage> oldImages = evaluateImageRepository
                    .findAllByEvaluateEvaluateIdOrderByCreatedAtDesc(evaluate.getEvaluateId());
            for (EvaluateImage img : oldImages) {
                if (img.getImageUrl() != null && !img.getImageUrl().isBlank()) {
                    minioStorageService.deleteByUrl(img.getImageUrl());
                }
            }
            evaluateImageRepository.deleteAllByEvaluateEvaluateId(evaluate.getEvaluateId());
        } else {
            isCreate = true;
            evaluate = new Evaluate();
            evaluate.setCustomer(maybeCustomer.get());
            evaluate.setProduct(maybeProduct.get());
            evaluate.setRating(rating);
            evaluate.setContent(normalizeContent(content));
        }

        Evaluate saved = evaluateRepository.save(evaluate);

        List<EvaluateImage> savedImages = new ArrayList<>();
        if (imageUrls != null && !imageUrls.isEmpty()) {
            for (String url : imageUrls) {
                if (url == null || url.isBlank()) continue;
                EvaluateImage image = new EvaluateImage();
                image.setEvaluate(saved);
                image.setImageUrl(url);
                savedImages.add(evaluateImageRepository.save(image));
            }
        }

        if (isCreate) {
            NotificationDto notif = NotificationDto.builder()
                    .type(NotificationType.EVALUATE)
                    .action(NotificationAction.CREATE)
                    .actorType(ActorType.CUSTOMER)
                    .actorId(maybeCustomer.get().getCustomerId())
                    .actorName(maybeCustomer.get().getFullName())
                    .evaluateId(saved.getEvaluateId())
                    .title("Đánh giá mới")
                    .message(maybeCustomer.get().getFullName() + " đã đánh giá sản phẩm " + maybeProduct.get().getProductName())
                    .build();
            notificationService.notifyAllAdmins(notif);
        }

        EvaluateReply reply = evaluateReplyRepository.findByEvaluate_EvaluateId(saved.getEvaluateId()).orElse(null);
        return Optional.of(CustomerEvaluateDto.fromEntity(saved, savedImages, reply));
    }

    @Override
    public List<CustomerEvaluateDto> getByOrderItemIds(List<Integer> orderItemIds) {
        if (orderItemIds == null || orderItemIds.isEmpty()) return List.of();
        List<Evaluate> evaluates = evaluateRepository.findAllByOrderItemIdIn(orderItemIds);
        
        // Fetch all replies for these evaluates
        List<Integer> evaluateIds = evaluates.stream()
                .map(Evaluate::getEvaluateId)
                .toList();
        Map<Integer, EvaluateReply> replyMap = evaluateReplyRepository.findAllByEvaluate_EvaluateIdIn(evaluateIds)
                .stream()
                .collect(Collectors.toMap(
                        reply -> reply.getEvaluate().getEvaluateId(),
                        reply -> reply,
                        (existing, replacement) -> existing
                ));
        
        return evaluates.stream()
                .map(evaluate -> {
                    List<EvaluateImage> images = evaluateImageRepository
                            .findAllByEvaluateEvaluateIdOrderByCreatedAtDesc(evaluate.getEvaluateId());
                    EvaluateReply reply = replyMap.get(evaluate.getEvaluateId());
                    return CustomerEvaluateDto.fromEntity(evaluate, images, reply);
                })
                .toList();
    }

    @Override
    @Transactional
    public Optional<CustomerEvaluateDto> upsertByOrderItem(
            Integer orderItemId,
            Integer customerId,
            Integer productId,
            Integer rating,
            String content,
            List<String> imageUrls,
            List<String> existingImageUrls
    ) {
        if (orderItemId == null || !isValidRating(rating)) return Optional.empty();

        Optional<CustomerAccount> maybeCustomer = customerAccountRepository.findByCustomerId(customerId);
        Optional<Product> maybeProduct = productRepository.findById(productId);
        if (maybeCustomer.isEmpty() || maybeProduct.isEmpty()) return Optional.empty();

        // Find existing evaluate for this orderItem
        Optional<Evaluate> existingOpt = evaluateRepository.findByOrderItemId(orderItemId);
        Evaluate evaluate;
        if (existingOpt.isPresent()) {
            evaluate = existingOpt.get();
            // Verify ownership
            if (evaluate.getCustomer() == null || !customerId.equals(evaluate.getCustomer().getCustomerId())) {
                return Optional.empty();
            }
            evaluate.setRating(rating);
            evaluate.setContent(normalizeContent(content));
            // Delete old images from MinIO (only those not kept) + reset DB rows
            List<String> keepUrls = existingImageUrls != null ? existingImageUrls : List.of();
            List<EvaluateImage> oldImages = evaluateImageRepository
                    .findAllByEvaluateEvaluateIdOrderByCreatedAtDesc(evaluate.getEvaluateId());

            for (EvaluateImage img : oldImages) {
                String url = img.getImageUrl();
                if (url == null) continue;
                if (!keepUrls.contains(url)) {
                    minioStorageService.deleteByUrl(url);
                }
            }
            evaluateImageRepository.deleteAllByEvaluateEvaluateId(evaluate.getEvaluateId());
        } else {
            evaluate = new Evaluate();
            evaluate.setCustomer(maybeCustomer.get());
            evaluate.setProduct(maybeProduct.get());
            evaluate.setOrderItemId(orderItemId);
            evaluate.setRating(rating);
            evaluate.setContent(normalizeContent(content));
        }

        Evaluate saved = evaluateRepository.save(evaluate);

        if (!existingOpt.isPresent()) {
            NotificationDto notif = NotificationDto.builder()
                    .type(NotificationType.EVALUATE)
                    .action(NotificationAction.CREATE)
                    .actorType(ActorType.CUSTOMER)
                    .actorId(maybeCustomer.get().getCustomerId())
                    .actorName(maybeCustomer.get().getFullName())
                    .evaluateId(saved.getEvaluateId())
                    .title("Đánh giá mới")
                    .message(maybeCustomer.get().getFullName() + " đã đánh giá sản phẩm " + maybeProduct.get().getProductName())
                    .build();
            notificationService.notifyAllAdmins(notif);
        }

        // Save kept images (when updating)
        List<EvaluateImage> savedImages = new ArrayList<>();
        if (existingOpt.isPresent()) {
            List<String> keepUrls = existingImageUrls != null ? existingImageUrls : List.of();
            for (String url : keepUrls) {
                if (url == null || url.trim().isEmpty()) continue;
                EvaluateImage image = new EvaluateImage();
                image.setEvaluate(saved);
                image.setImageUrl(url);
                savedImages.add(evaluateImageRepository.save(image));
            }
        }

        // Save new images if provided
        if (imageUrls != null && !imageUrls.isEmpty()) {
            for (String url : imageUrls) {
                EvaluateImage image = new EvaluateImage();
                image.setEvaluate(saved);
                image.setImageUrl(url);
                savedImages.add(evaluateImageRepository.save(image));
            }
        }

        // Fetch admin reply if exists
        EvaluateReply reply = evaluateReplyRepository.findByEvaluate_EvaluateId(saved.getEvaluateId()).orElse(null);
        return Optional.of(CustomerEvaluateDto.fromEntity(saved, savedImages, reply));
    }

    @Override
    @Transactional
    public boolean deleteEvaluate(Integer evaluateId, Integer customerId) {
        Optional<Evaluate> evaluateOpt = evaluateRepository.findById(evaluateId);
        if (evaluateOpt.isEmpty()) return false;
        Evaluate existing = evaluateOpt.get();
        if (existing.getCustomer() == null || !customerId.equals(existing.getCustomer().getCustomerId())) {
            return false;
        }
        // Delete images from MinIO first
        List<EvaluateImage> images = evaluateImageRepository.findAllByEvaluateEvaluateIdOrderByCreatedAtDesc(evaluateId);
        for (EvaluateImage img : images) {
            minioStorageService.deleteByUrl(img.getImageUrl());
        }
        evaluateRepository.delete(existing);
        return true;
    }

    @Override
    @Transactional
    public boolean deleteByOrderItem(Integer orderItemId, Integer customerId) {
        if (orderItemId == null || customerId == null) return false;
        Optional<Evaluate> evaluateOpt = evaluateRepository.findByOrderItemId(orderItemId);
        if (evaluateOpt.isEmpty()) return false;
        Evaluate existing = evaluateOpt.get();
        if (existing.getCustomer() == null || !customerId.equals(existing.getCustomer().getCustomerId())) {
            return false;
        }
        // Delete images from MinIO first
        List<EvaluateImage> images = evaluateImageRepository.findAllByEvaluateEvaluateIdOrderByCreatedAtDesc(existing.getEvaluateId());
        for (EvaluateImage img : images) {
            minioStorageService.deleteByUrl(img.getImageUrl());
        }
        evaluateRepository.delete(existing);
        return true;
    }

    private boolean isValidRating(Integer rating) {
        if (rating == null) return false;
        return rating >= 1 && rating <= 5;
    }

    private String normalizeContent(String content) {
        if (content == null) return null;
        String normalized = content.trim();
        return normalized.isEmpty() ? null : normalized;
    }
}
