package com.webbanhang.shop.Controller.Orders;

import com.webbanhang.shop.DTO.Orders.*;
import com.webbanhang.shop.Model.Orders.CancelledBy;
import com.webbanhang.shop.Model.Orders.OrderStatus;
import com.webbanhang.shop.Model.Orders.Order;
import com.webbanhang.shop.Service.Orders.OrderService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;

import java.util.List;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    @GetMapping
    public List<OrderDto> getAll(@RequestParam(value = "customerId", required = false) Integer customerId) {
        if (customerId != null) {
            return orderService.convertToDtoList(orderService.findAllByCustomerId(customerId));
        }
        return orderService.convertToDtoList(orderService.findAll());
    }

    @PostMapping
    public ResponseEntity<OrderDto> create(@Valid @RequestBody CreateOrderRequest req) {
        Order order = orderService.createOrder(
                req.customerId(),
                req.receiverName(),
                req.receiverPhone(),
                req.shippingAddress(),
                req.items(),
                req.paymentMethod()
        );
        OrderDto dto = orderService.convertToDto(order);
        return ResponseEntity.status(HttpStatus.CREATED).body(dto);
    }

    @GetMapping("/{id:\\d+}")
    public ResponseEntity<OrderDto> getById(@PathVariable Integer id) {
        return orderService.findById(id)
                .map(orderService::convertToDto)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/trash")
    public List<OrderDto> getTrash(@RequestParam(value = "customerId", required = false) Integer customerId) {
        if (customerId != null) {
            return orderService.convertToDtoList(orderService.findTrashByCustomerId(customerId));
        }
        return orderService.convertToDtoList(orderService.findTrash());
    }

    @DeleteMapping("/{id:\\d+}")
    public ResponseEntity<Void> softDelete(@PathVariable Integer id) {
        boolean ok = orderService.softDelete(id);
        if (!ok) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id:\\d+}/restore")
    public ResponseEntity<Void> restore(@PathVariable Integer id) {
        boolean ok = orderService.restore(id);
        if (!ok) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id:\\d+}/force")
    public ResponseEntity<Void> deleteForever(@PathVariable Integer id) {
        boolean ok = orderService.deleteForever(id);
        if (!ok) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id:\\d+}/status")
    public ResponseEntity<Void> updateStatus(@PathVariable Integer id, @RequestBody UpdateOrderStatusRequest req) {
        OrderStatus status;
        try {
            status = OrderStatus.valueOf(req.status());
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }

        boolean ok = orderService.updateStatus(id, status).isPresent();
        if (!ok) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id:\\d+}/pay/cod")
    public ResponseEntity<OrderDto> payCod(@PathVariable Integer id, @RequestBody PayCodRequest req) {
        if (req == null || req.customerId() == null) {
            return ResponseEntity.badRequest().build();
        }
        return orderService.payCod(id, req.customerId())
                .map(orderService::convertToDto)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping("/{id:\\d+}/pay/online")
    public ResponseEntity<OrderDto> payOnline(@PathVariable Integer id, @RequestBody PayOnlineRequest req) {
        if (req == null || req.customerId() == null) {
            return ResponseEntity.badRequest().build();
        }
        return orderService.payOnline(id, req.customerId())
                .map(orderService::convertToDto)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping("/{id:\\d+}/cancel")
    public ResponseEntity<OrderDto> cancelOrder(@PathVariable Integer id, @RequestBody CancelOrderRequest req) {
        return orderService.cancelOrder(id, req.getCustomerId(), req.getReasonId(), req.getCancelNote(), CancelledBy.CUSTOMER)
                .map(orderService::convertToDto)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}
