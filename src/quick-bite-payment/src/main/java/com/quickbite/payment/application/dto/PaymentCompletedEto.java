package com.quickbite.payment.application.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Event Transfer Object published when a Payment process succeeds.
 * Maps to PaymentAuthorizedEto in Order Service.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentCompletedEto {
    private UUID eventId;
    private UUID orderId;
    private UUID paymentId;
    private UUID customerId;
    private BigDecimal amount;
    private String transactionId;
    private String eventType;
    private UUID correlationId;
    private LocalDateTime occurredAt;
}
