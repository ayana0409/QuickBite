package com.quickbite.payment.adapter.out.persistence;

import com.quickbite.payment.application.port.out.PaymentPersistencePort;
import com.quickbite.payment.domain.model.Payment;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Persistence adapter mapping between Domain model and JPA entity.
 */
@Component
@RequiredArgsConstructor
public class PaymentPersistenceAdapter implements PaymentPersistencePort {

    private final SpringDataPaymentRepository repository;

    @Override
    public Payment save(Payment payment) {
        PaymentEntity entity = toEntity(payment);
        PaymentEntity saved = repository.save(entity);
        return toDomain(saved);
    }

    @Override
    public Optional<Payment> findById(UUID id) {
        return repository.findById(id).map(this::toDomain);
    }

    @Override
    public Optional<Payment> findByOrderId(UUID orderId) {
        return repository.findByOrderId(orderId).map(this::toDomain);
    }

    @Override
    public java.util.List<Payment> findByOrderIds(java.util.List<UUID> orderIds) {
        if (orderIds == null || orderIds.isEmpty()) {
            return java.util.Collections.emptyList();
        }
        return repository.findByOrderIdIn(orderIds).stream()
                .map(this::toDomain)
                .toList();
    }

    private PaymentEntity toEntity(Payment domain) {
        return PaymentEntity.builder()
                .id(domain.getId())
                .orderId(domain.getOrderId())
                .customerId(domain.getCustomerId())
                .amount(domain.getAmount())
                .status(domain.getStatus())
                .method(domain.getMethod())
                .transactionId(domain.getTransactionId())
                .paymentUrl(domain.getPaymentUrl())
                .failureReason(domain.getFailureReason())
                .createdAt(domain.getCreatedAt())
                .updatedAt(domain.getUpdatedAt())
                .build();
    }

    private Payment toDomain(PaymentEntity entity) {
        return Payment.builder()
                .id(entity.getId())
                .orderId(entity.getOrderId())
                .customerId(entity.getCustomerId())
                .amount(entity.getAmount())
                .status(entity.getStatus())
                .method(entity.getMethod())
                .transactionId(entity.getTransactionId())
                .paymentUrl(entity.getPaymentUrl())
                .failureReason(entity.getFailureReason())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}
