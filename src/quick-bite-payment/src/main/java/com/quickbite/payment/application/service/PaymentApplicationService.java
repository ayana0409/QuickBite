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
    private final com.quickbite.payment.application.port.out.PaymentEventPublisherPort eventPublisherPort;

    @Override
    @Transactional
    public Payment createPayment(CreatePaymentCommand command) {
        // Retrieve existing payment for this order if already present, or build a new one
        Payment payment = persistencePort.findByOrderId(command.getOrderId())
                .map(existingPayment -> {
                    // If existing payment is FAILED or PENDING, allow updating method/amount and resetting
                    if (existingPayment.getStatus() == PaymentStatus.FAILED || existingPayment.getStatus() == PaymentStatus.PENDING) {
                        existingPayment.setStatus(PaymentStatus.PENDING);
                        if (command.getAmount() != null) {
                            existingPayment.setAmount(command.getAmount());
                        }
                        if (command.getMethod() != null) {
                            existingPayment.setMethod(command.getMethod());
                        }
                        existingPayment.setFailureReason(null);
                        existingPayment.setUpdatedAt(LocalDateTime.now());
                    }
                    return existingPayment;
                })
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
    @Transactional(readOnly = true)
    public java.util.List<Payment> getPaymentsByOrderIds(java.util.List<UUID> orderIds) {
        if (orderIds == null || orderIds.isEmpty()) {
            return java.util.Collections.emptyList();
        }
        return persistencePort.findByOrderIds(orderIds);
    }

    @Override
    @Transactional
    public Payment processMockPayment(UUID paymentId, boolean success, String reason) {
        Payment payment = getPaymentById(paymentId);

        // Allow retry and processing when payment is PENDING or FAILED
        if (payment.getStatus() != PaymentStatus.PENDING && payment.getStatus() != PaymentStatus.FAILED) {
            throw new IllegalStateException("Payment is already finalized with status: " + payment.getStatus());
        }

        if (success) {
            payment.markAsSuccess("MOCK-TXN-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        } else {
            payment.markAsFailed(reason != null && !reason.isBlank() ? reason : "Payment failed by customer simulation");
        }

        Payment savedPayment = persistencePort.save(payment);

        if (success) {
            eventPublisherPort.publishPaymentCompleted(savedPayment);
        } else {
            eventPublisherPort.publishPaymentFailed(savedPayment);
        }

        return savedPayment;
    }

    @Override
    @Transactional
    public Payment cancelPaymentByOrderId(UUID orderId, String reason) {
        return persistencePort.findByOrderId(orderId)
                .map(payment -> {
                    String cancelReason = reason != null && !reason.isBlank() ? reason : "Đơn hàng hủy do người dùng";
                    if (payment.getStatus() == PaymentStatus.SUCCESS) {
                        payment.markAsRefunded(cancelReason);
                    } else {
                        payment.markAsFailed(cancelReason);
                    }
                    return persistencePort.save(payment);
                })
                .orElse(null);
    }

    @Override
    @Transactional
    public Payment refundPaymentByOrderId(UUID orderId, String reason) {
        return persistencePort.findByOrderId(orderId)
                .map(payment -> {
                    payment.markAsRefunded(reason != null && !reason.isBlank() ? reason : "Hoàn tiền cho khách hàng");
                    return persistencePort.save(payment);
                })
                .orElse(null);
    }
}
