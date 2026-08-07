package com.quickbite.payment.adapter.out.persistence;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * JPA entity for Outbox pattern to guarantee reliable event publishing to Kafka.
 */
@Entity
@Table(name = "payment_outbox_messages", indexes = {
    @Index(name = "idx_payment_outbox_status", columnList = "status")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentOutboxEntity {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "event_id", nullable = false)
    private UUID eventId;

    @Column(name = "event_type", nullable = false)
    private String eventType;

    @Column(name = "message_key", nullable = false)
    private String messageKey;

    @Column(name = "payload", nullable = false, columnDefinition = "TEXT")
    private String payload;

    @Column(name = "status", nullable = false)
    private String status; // PENDING, PROCESSED, FAILED

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "processed_at")
    private LocalDateTime processedAt;
}
