package com.quickbite.payment.adapter.out.persistence;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * JPA entity for Inbox pattern to prevent duplicate Kafka event processing.
 */
@Entity
@Table(name = "payment_inbox_messages", indexes = {
    @Index(name = "idx_payment_inbox_event_id", columnList = "event_id", unique = true)
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentInboxEntity {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "event_id", nullable = false, unique = true)
    private UUID eventId;

    @Column(name = "event_type")
    private String eventType;

    @Column(name = "processed_at", nullable = false)
    private LocalDateTime processedAt;
}
