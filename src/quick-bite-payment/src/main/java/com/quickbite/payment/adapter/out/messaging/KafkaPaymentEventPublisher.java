package com.quickbite.payment.adapter.out.messaging;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.quickbite.payment.adapter.out.persistence.PaymentOutboxEntity;
import com.quickbite.payment.adapter.out.persistence.SpringDataPaymentOutboxRepository;
import com.quickbite.payment.application.dto.PaymentCompletedEto;
import com.quickbite.payment.application.dto.PaymentFailedEto;
import com.quickbite.payment.application.port.out.PaymentEventPublisherPort;
import com.quickbite.payment.domain.model.Payment;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * Outbox implementation of PaymentEventPublisherPort.
 * Saves outbox messages to Database in the same transaction as Payment entity updates.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class KafkaPaymentEventPublisher implements PaymentEventPublisherPort {

    private final SpringDataPaymentOutboxRepository outboxRepository;
    private final ObjectMapper objectMapper;

    @Override
    public void publishPaymentCompleted(Payment payment) {
        try {
            UUID eventId = UUID.randomUUID();
            PaymentCompletedEto eto = PaymentCompletedEto.builder()
                    .eventId(eventId)
                    .paymentId(payment.getId())
                    .orderId(payment.getOrderId())
                    .customerId(payment.getCustomerId())
                    .amount(payment.getAmount())
                    .transactionId(payment.getTransactionId())
                    .eventType("payment.authorized")
                    .correlationId(payment.getOrderId())
                    .occurredAt(LocalDateTime.now())
                    .build();

            String jsonPayload = objectMapper.writeValueAsString(eto);

            PaymentOutboxEntity outboxMessage = PaymentOutboxEntity.builder()
                    .id(UUID.randomUUID())
                    .eventId(eventId)
                    .eventType("payment.authorized")
                    .messageKey("payment.authorized")
                    .payload(jsonPayload)
                    .status("PENDING")
                    .createdAt(LocalDateTime.now())
                    .build();

            outboxRepository.save(outboxMessage);
            log.info("Saved PaymentCompletedEto to Outbox table for paymentId: {}", payment.getId());
        } catch (Exception e) {
            log.error("Failed to save PaymentCompletedEto to Outbox for paymentId: {}", payment.getId(), e);
        }
    }

    @Override
    public void publishPaymentFailed(Payment payment) {
        try {
            UUID eventId = UUID.randomUUID();
            PaymentFailedEto eto = PaymentFailedEto.builder()
                    .eventId(eventId)
                    .paymentId(payment.getId())
                    .orderId(payment.getOrderId())
                    .customerId(payment.getCustomerId())
                    .amount(payment.getAmount())
                    .reason(payment.getFailureReason())
                    .eventType("payment.failed")
                    .correlationId(payment.getOrderId())
                    .occurredAt(LocalDateTime.now())
                    .build();

            String jsonPayload = objectMapper.writeValueAsString(eto);

            PaymentOutboxEntity outboxMessage = PaymentOutboxEntity.builder()
                    .id(UUID.randomUUID())
                    .eventId(eventId)
                    .eventType("payment.failed")
                    .messageKey("payment.failed")
                    .payload(jsonPayload)
                    .status("PENDING")
                    .createdAt(LocalDateTime.now())
                    .build();

            outboxRepository.save(outboxMessage);
            log.info("Saved PaymentFailedEto to Outbox table for paymentId: {}", payment.getId());
        } catch (Exception e) {
            log.error("Failed to save PaymentFailedEto to Outbox for paymentId: {}", payment.getId(), e);
        }
    }
}
