package com.quickbite.payment.application.service;

import com.quickbite.payment.application.port.in.CreatePaymentCommand;
import com.quickbite.payment.application.port.in.ProcessPaymentUseCase;
import com.quickbite.payment.application.port.out.PaymentGatewayPort;
import com.quickbite.payment.application.port.out.PaymentPersistencePort;
import com.quickbite.payment.domain.model.Payment;
import com.quickbite.payment.domain.model.PaymentMethod;
import com.quickbite.payment.domain.model.PaymentStatus;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Application service orchestrating payment use cases and domain logic.
 */
@Service
@RequiredArgsConstructor
public class PaymentApplicationService implements ProcessPaymentUseCase {

    private final PaymentPersistencePort persistencePort;
    private final PaymentGatewayPort gatewayPort;

    @Override
    @Transactional
    public Payment createPayment(CreatePaymentCommand command) {
        // Retrieve existing payment for this order if already present, or build a new one
        Payment payment = persistencePort.findByOrderId(command.getOrderId())
                .orElseGet(() -> Payment.builder()
                        .id(UUID.randomUUID())
                        .orderId(command.getOrderId())
                        .customerId(command.getCustomerId())
                        .amount(command.getAmount())
                        .method(command.getMethod() != null ? command.getMethod() : PaymentMethod.MOCK_PAYMENT)
                        .status(PaymentStatus.PENDING)
                        .createdAt(LocalDateTime.now())
                        .updatedAt(LocalDateTime.now())
                        .build());

        String paymentUrl = gatewayPort.generatePaymentUrl(payment);
        payment.setPaymentUrl(paymentUrl);

        return persistencePort.save(payment);
    }

    @Override
    @Transactional(readOnly = true)
    public Payment getPaymentById(UUID id) {
        return persistencePort.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Payment not found with ID: " + id));
    }

    @Override
    @Transactional(readOnly = true)
    public Payment getPaymentByOrderId(UUID orderId) {
        return persistencePort.findByOrderId(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Payment not found for Order ID: " + orderId));
    }

    @Override
    @Transactional
    public Payment processMockPayment(UUID paymentId, boolean success, String reason) {
        Payment payment = getPaymentById(paymentId);

        if (payment.getStatus() != PaymentStatus.PENDING) {
            throw new IllegalStateException("Payment is already processed with status: " + payment.getStatus());
        }

        if (success) {
            payment.markAsSuccess("MOCK-TXN-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        } else {
            payment.markAsFailed(reason != null && !reason.isBlank() ? reason : "Payment failed by customer simulation");
        }

        return persistencePort.save(payment);
    }
}
