package com.webbanhang.shop.Controller.Orders;

import com.webbanhang.shop.DTO.Orders.CustomerEvaluateDto;
import com.webbanhang.shop.DTO.Orders.ProductEvaluateCommentDto;
import com.webbanhang.shop.DTO.Orders.ProductEvaluateWithImagesDto;
import com.webbanhang.shop.Model.Orders.OrderItem;
import com.webbanhang.shop.Repository.Orders.OrderItemRepository;
import com.webbanhang.shop.Service.Orders.CustomerEvaluateService;
import com.webbanhang.shop.Service.Storage.MinioStorageService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api/evaluates")
public class CustomerEvaluateController {

    private final CustomerEvaluateService customerEvaluateService;
    private final OrderItemRepository orderItemRepository;
    private final MinioStorageService minioStorageService;

    public CustomerEvaluateController(CustomerEvaluateService customerEvaluateService,
                                       OrderItemRepository orderItemRepository,
                                       MinioStorageService minioStorageService) {
        this.customerEvaluateService = customerEvaluateService;
        this.orderItemRepository = orderItemRepository;
        this.minioStorageService = minioStorageService;
    }

    @GetMapping("/products/{productId}")
    public ResponseEntity<List<ProductEvaluateCommentDto>> getByProduct(@PathVariable Integer productId) {
        if (productId == null) return ResponseEntity.badRequest().build();
        return ResponseEntity.ok(customerEvaluateService.getByProductId(productId));
    }

    @GetMapping("/products/{productId}/with-images")
    public ResponseEntity<List<ProductEvaluateWithImagesDto>> getByProductWithImages(@PathVariable Integer productId) {
        if (productId == null) return ResponseEntity.badRequest().build();
        return ResponseEntity.ok(customerEvaluateService.getByProductIdWithImages(productId));
    }

    @GetMapping("/customers/{customerId}")
    public ResponseEntity<List<CustomerEvaluateDto>> getByCustomer(
            @PathVariable Integer customerId
    ) {
        if (customerId == null) return ResponseEntity.badRequest().build();
        return ResponseEntity.ok(customerEvaluateService.getByCustomerId(customerId));
    }

    @GetMapping("/orders/{orderId}")
    public ResponseEntity<List<CustomerEvaluateDto>> getByOrder(
            @PathVariable Integer orderId,
            @RequestParam("customerId") Integer customerId
    ) {
        if (orderId == null || customerId == null) return ResponseEntity.badRequest().build();
        // Get order items for this order
        List<OrderItem> orderItems = orderItemRepository.findAllByOrderOrderId(orderId);
        List<Integer> orderItemIds = orderItems.stream()
                .map(OrderItem::getOrderItemId)
                .toList();
        return ResponseEntity.ok(customerEvaluateService.getByOrderItemIds(orderItemIds));
    }

    @PutMapping(value = "/order-items/{orderItemId}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<CustomerEvaluateDto> upsertByOrderItem(
            @PathVariable Integer orderItemId,
            @RequestParam("customerId") Integer customerId,
            @RequestParam("productId") Integer productId,
            @RequestParam("rating") Integer rating,
            @RequestParam(value = "content", required = false) String content,
            @RequestParam(value = "existingImageUrls", required = false) List<String> existingImageUrls,
            @RequestParam(value = "images", required = false) List<MultipartFile> images
    ) {
        if (orderItemId == null || customerId == null || productId == null || rating == null) {
            return ResponseEntity.badRequest().build();
        }

        // Upload images to MinIO
        List<String> imageUrls = new ArrayList<>();
        if (images != null && !images.isEmpty()) {
            for (MultipartFile image : images) {
                if (!image.isEmpty()) {
                    MinioStorageService.UploadedObject uploaded = minioStorageService.uploadEvaluateImage(image);
                    imageUrls.add(uploaded.url());
                }
            }
        }

        return customerEvaluateService
                .upsertByOrderItem(orderItemId, customerId, productId, rating, content, imageUrls, existingImageUrls)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.badRequest().build());
    }

    @DeleteMapping("/order-items/{orderItemId}")
    public ResponseEntity<Void> deleteByOrderItem(
            @PathVariable Integer orderItemId,
            @RequestParam("customerId") Integer customerId
    ) {
        if (orderItemId == null || customerId == null) return ResponseEntity.badRequest().build();
        boolean ok = customerEvaluateService.deleteByOrderItem(orderItemId, customerId);
        if (!ok) return ResponseEntity.notFound().build();
        return ResponseEntity.noContent().build();
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<CustomerEvaluateDto> create(
            @RequestParam("customerId") Integer customerId,
            @RequestParam("productId") Integer productId,
            @RequestParam("rating") Integer rating,
            @RequestParam(value = "content", required = false) String content,
            @RequestParam(value = "images", required = false) List<MultipartFile> images
    ) {
        if (customerId == null || productId == null || rating == null) {
            return ResponseEntity.badRequest().build();
        }

        // Upload images to MinIO
        List<String> imageUrls = new ArrayList<>();
        if (images != null && !images.isEmpty()) {
            for (MultipartFile image : images) {
                if (!image.isEmpty()) {
                    MinioStorageService.UploadedObject uploaded = minioStorageService.uploadEvaluateImage(image);
                    imageUrls.add(uploaded.url());
                }
            }
        }

        return customerEvaluateService
                .createEvaluate(customerId, productId, rating, content, imageUrls)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.badRequest().build());
    }

    @DeleteMapping("/{evaluateId}")
    public ResponseEntity<Void> delete(
            @PathVariable Integer evaluateId,
            @RequestParam("customerId") Integer customerId
    ) {
        if (evaluateId == null || customerId == null) return ResponseEntity.badRequest().build();
        boolean ok = customerEvaluateService.deleteEvaluate(evaluateId, customerId);
        if (!ok) return ResponseEntity.notFound().build();
        return ResponseEntity.noContent().build();
    }
}
