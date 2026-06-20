package com.webbanhang.shop.Service.Refunds;

import com.webbanhang.shop.DTO.Refund.RefundCreateRequest;
import com.webbanhang.shop.DTO.Refund.RefundResponse;
import com.webbanhang.shop.Exception.BadRequestException;
import com.webbanhang.shop.Exception.NotFoundException;
import com.webbanhang.shop.Model.Orders.Order;
import com.webbanhang.shop.Model.Orders.PaymentStatus;
import com.webbanhang.shop.Model.Refunds.Refund;
import com.webbanhang.shop.Model.Refunds.RefundMethod;
import com.webbanhang.shop.Model.Refunds.RefundStatus;
import com.webbanhang.shop.Repository.Orders.OrderRepository;
import com.webbanhang.shop.Repository.RefundRepository;
import com.webbanhang.shop.Service.Refunds.Impl.RefundServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RefundServiceImplTest {

    @Mock
    private RefundRepository refundRepository;

    @Mock
    private OrderRepository orderRepository;

    @InjectMocks
    private RefundServiceImpl refundService;

    private Order mockOrder;
    private RefundCreateRequest mockRequest;
    private Refund mockRefund;

    @BeforeEach
    void setUp() {
        // Setup mock order
        mockOrder = new Order();
        mockOrder.setOrderId(1);
        mockOrder.setCustomerId(100);
        mockOrder.setTotalAmount(new BigDecimal("2000000"));
        mockOrder.setPaymentStatus(PaymentStatus.PAID);

        // Setup mock request
        mockRequest = new RefundCreateRequest();
        mockRequest.setOrderId(1);
        mockRequest.setRefundAmount(new BigDecimal("1000000"));
        mockRequest.setIsFullRefund(false);
        mockRequest.setRefundMethod(RefundMethod.BANK_TRANSFER);
        mockRequest.setRefundReason("Sản phẩm lỗi");
        mockRequest.setCustomerBankName("Vietcombank");
        mockRequest.setCustomerAccountNumber("1234567890");
        mockRequest.setCustomerAccountHolder("NGUYEN VAN A");

        // Setup mock refund
        mockRefund = new Refund();
        mockRefund.setRefundId(1);
        mockRefund.setRefundCode("RF-20260620-000001");
        mockRefund.setOrderId(1);
        mockRefund.setCustomerId(100);
        mockRefund.setRefundAmount(new BigDecimal("1000000"));
        mockRefund.setOrderTotalAmount(new BigDecimal("2000000"));
        mockRefund.setRefundStatus(RefundStatus.PENDING_INFO);
        mockRefund.setRefundMethod(RefundMethod.BANK_TRANSFER);
    }

    @Test
    void createRefund_Success() {
        // Arrange
        when(orderRepository.findById(1)).thenReturn(Optional.of(mockOrder));
        when(refundRepository.findActiveRefundByOrderId(1)).thenReturn(Optional.empty());
        when(refundRepository.save(any(Refund.class))).thenReturn(mockRefund);

        // Act
        RefundResponse response = refundService.createRefund(100, mockRequest);

        // Assert
        assertNotNull(response);
        assertEquals("RF-20260620-000001", response.getRefundCode());
        assertEquals(RefundStatus.PENDING_INFO, response.getRefundStatus());
        assertEquals(new BigDecimal("1000000"), response.getRefundAmount());
        verify(refundRepository, times(1)).save(any(Refund.class));
    }

    @Test
    void createRefund_OrderNotFound_ThrowException() {
        // Arrange
        when(orderRepository.findById(1)).thenReturn(Optional.empty());

        // Act & Assert
        assertThrows(NotFoundException.class, () -> {
            refundService.createRefund(100, mockRequest);
        });

        verify(refundRepository, never()).save(any(Refund.class));
    }

    @Test
    void createRefund_NotOwnOrder_ThrowException() {
        // Arrange
        when(orderRepository.findById(1)).thenReturn(Optional.of(mockOrder));

        // Act & Assert
        assertThrows(BadRequestException.class, () -> {
            refundService.createRefund(999, mockRequest); // Different customer ID
        });

        verify(refundRepository, never()).save(any(Refund.class));
    }

    @Test
    void createRefund_OrderNotPaid_ThrowException() {
        // Arrange
        mockOrder.setPaymentStatus(PaymentStatus.UNPAID);
        when(orderRepository.findById(1)).thenReturn(Optional.of(mockOrder));

        // Act & Assert
        BadRequestException exception = assertThrows(BadRequestException.class, () -> {
            refundService.createRefund(100, mockRequest);
        });

        assertEquals("Only paid orders can be refunded", exception.getMessage());
        verify(refundRepository, never()).save(any(Refund.class));
    }

    @Test
    void createRefund_AmountExceedsTotal_ThrowException() {
        // Arrange
        mockRequest.setRefundAmount(new BigDecimal("3000000")); // More than order total
        when(orderRepository.findById(1)).thenReturn(Optional.of(mockOrder));
        when(refundRepository.findActiveRefundByOrderId(1)).thenReturn(Optional.empty());

        // Act & Assert
        BadRequestException exception = assertThrows(BadRequestException.class, () -> {
            refundService.createRefund(100, mockRequest);
        });

        assertEquals("Refund amount cannot exceed order total", exception.getMessage());
        verify(refundRepository, never()).save(any(Refund.class));
    }

    @Test
    void createRefund_DuplicateActiveRefund_ThrowException() {
        // Arrange
        when(orderRepository.findById(1)).thenReturn(Optional.of(mockOrder));
        when(refundRepository.findActiveRefundByOrderId(1)).thenReturn(Optional.of(mockRefund));

        // Act & Assert
        BadRequestException exception = assertThrows(BadRequestException.class, () -> {
            refundService.createRefund(100, mockRequest);
        });

        assertEquals("This order already has an active refund request", exception.getMessage());
        verify(refundRepository, never()).save(any(Refund.class));
    }

    @Test
    void createRefund_Idempotency_ReturnExisting() {
        // Arrange
        String idempotencyKey = "test-key-123";
        mockRequest.setIdempotencyKey(idempotencyKey);
        when(refundRepository.findByIdempotencyKey(idempotencyKey)).thenReturn(Optional.of(mockRefund));

        // Act
        RefundResponse response = refundService.createRefund(100, mockRequest);

        // Assert
        assertNotNull(response);
        assertEquals("RF-20260620-000001", response.getRefundCode());
        verify(orderRepository, never()).findById(any());
        verify(refundRepository, never()).save(any(Refund.class));
    }

    @Test
    void createRefund_BankTransferWithoutAccountNumber_ThrowException() {
        // Arrange
        mockRequest.setCustomerAccountNumber(null); // Missing required field
        when(orderRepository.findById(1)).thenReturn(Optional.of(mockOrder));
        when(refundRepository.findActiveRefundByOrderId(1)).thenReturn(Optional.empty());

        // Act & Assert
        BadRequestException exception = assertThrows(BadRequestException.class, () -> {
            refundService.createRefund(100, mockRequest);
        });

        assertEquals("Bank account number is required for bank transfer refund", exception.getMessage());
        verify(refundRepository, never()).save(any(Refund.class));
    }

    @Test
    void cancelRefund_Success() {
        // Arrange
        mockRefund.setRefundStatus(RefundStatus.PENDING_INFO);
        when(refundRepository.findByRefundCodeAndDeletedAtIsNull("RF-20260620-000001"))
                .thenReturn(Optional.of(mockRefund));
        when(refundRepository.save(any(Refund.class))).thenReturn(mockRefund);

        // Act
        RefundResponse response = refundService.cancelRefund("RF-20260620-000001", 100);

        // Assert
        assertNotNull(response);
        verify(refundRepository, times(1)).save(mockRefund);
        assertEquals(RefundStatus.CANCELLED, mockRefund.getRefundStatus());
    }

    @Test
    void cancelRefund_NotOwnRefund_ThrowException() {
        // Arrange
        when(refundRepository.findByRefundCodeAndDeletedAtIsNull("RF-20260620-000001"))
                .thenReturn(Optional.of(mockRefund));

        // Act & Assert
        assertThrows(BadRequestException.class, () -> {
            refundService.cancelRefund("RF-20260620-000001", 999); // Different customer
        });

        verify(refundRepository, never()).save(any(Refund.class));
    }

    @Test
    void cancelRefund_AlreadyApproved_ThrowException() {
        // Arrange
        mockRefund.setRefundStatus(RefundStatus.APPROVED);
        when(refundRepository.findByRefundCodeAndDeletedAtIsNull("RF-20260620-000001"))
                .thenReturn(Optional.of(mockRefund));

        // Act & Assert
        BadRequestException exception = assertThrows(BadRequestException.class, () -> {
            refundService.cancelRefund("RF-20260620-000001", 100);
        });

        assertEquals("Cannot cancel refund in current status", exception.getMessage());
        verify(refundRepository, never()).save(any(Refund.class));
    }
}
