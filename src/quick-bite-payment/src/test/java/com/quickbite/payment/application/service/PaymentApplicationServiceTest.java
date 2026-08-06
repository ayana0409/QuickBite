package com.quickbite.payment.application.service;

import com.quickbite.payment.application.port.in.CreatePaymentCommand;
import com.quickbite.payment.application.port.out.PaymentGatewayPort;
import com.quickbite.payment.application.port.out.PaymentPersistencePort;
import com.quickbite.payment.domain.model.Payment;
import com.quickbite.payment.domain.model.PaymentMethod;
import com.quickbite.payment.domain.model.PaymentStatus;
import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PaymentApplicationServiceTest {

    @Mock
    private PaymentPersistencePort persistencePort;

    @Mock
    private PaymentGatewayPort gatewayPort;

    @Mock
    private com.quickbite.payment.application.port.out.PaymentEventPublisherPort eventPublisherPort;

    @InjectMocks
    private PaymentApplicationService service;

    private UUID orderId;
    private UUID paymentId;
    private Payment existingPayment;

    @BeforeEach
    void setUp() {
        orderId = UUID.randomUUID();
        paymentId = UUID.randomUUID();

        existingPayment = Payment.builder()
                .id(paymentId)
                .orderId(orderId)
                .customerId(UUID.randomUUID())
                .amount(BigDecimal.valueOf(150.00))
                .status(PaymentStatus.PENDING)
                .method(PaymentMethod.MOCK_PAYMENT)
                .build();
    }

    @Test
    void createPayment_ShouldReturnSavedPayment_WithGeneratedUrl() {
        CreatePaymentCommand command = CreatePaymentCommand.builder()
                .orderId(orderId)
                .customerId(UUID.randomUUID())
                .amount(BigDecimal.valueOf(100.00))
                .method(PaymentMethod.MOCK_PAYMENT)
                .build();

        when(persistencePort.findByOrderId(orderId)).thenReturn(Optional.empty());
        when(gatewayPort.generatePaymentUrl(any())).thenReturn("http://sandbox?paymentId=123");
        when(persistencePort.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        Payment result = service.createPayment(command);

        assertNotNull(result);
        assertEquals(orderId, result.getOrderId());
        assertEquals(PaymentStatus.PENDING, result.getStatus());
        assertEquals("http://sandbox?paymentId=123", result.getPaymentUrl());
        verify(persistencePort).save(any());
    }

    @Test
    void processMockPayment_Success_ShouldMarkPaymentAsSuccess() {
        when(persistencePort.findById(paymentId)).thenReturn(Optional.of(existingPayment));
        when(persistencePort.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        Payment result = service.processMockPayment(paymentId, true, null);

        assertEquals(PaymentStatus.SUCCESS, result.getStatus());
        assertNotNull(result.getTransactionId());
        assertTrue(result.getTransactionId().startsWith("MOCK-TXN-"));
    }

    @Test
    void processMockPayment_Failure_ShouldMarkPaymentAsFailed() {
        when(persistencePort.findById(paymentId)).thenReturn(Optional.of(existingPayment));
        when(persistencePort.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        Payment result = service.processMockPayment(paymentId, false, "Insufficient funds");

        assertEquals(PaymentStatus.FAILED, result.getStatus());
        assertEquals("Insufficient funds", result.getFailureReason());
    }
}
