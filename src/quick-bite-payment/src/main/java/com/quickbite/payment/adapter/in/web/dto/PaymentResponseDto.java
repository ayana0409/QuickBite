package com.quickbite.payment.adapter.in.web.dto;

import com.quickbite.payment.domain.model.Payment;
import com.quickbite.payment.domain.model.PaymentMethod;
import com.quickbite.payment.domain.model.PaymentStatus;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.Builder;
import lombok.Data;

/**
 * Data Transfer Object for Payment HTTP responses.
 */
@Data
@Builder
public class PaymentResponseDto {
    private UUID id;
    private UUID orderId;
    private UUID customerId;
    private BigDecimal amount;
    private PaymentStatus status;
    private PaymentMethod method;
    private String transactionId;
    private String paymentUrl;
    private String failureReason;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static PaymentResponseDto fromDomain(Payment domain) {
        return PaymentResponseDto.builder()
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
}
