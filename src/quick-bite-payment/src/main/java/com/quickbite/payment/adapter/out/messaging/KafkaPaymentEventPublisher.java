package com.quickbite.payment.adapter.out.messaging;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.quickbite.payment.application.dto.PaymentCompletedEto;
import com.quickbite.payment.application.dto.PaymentFailedEto;
import com.quickbite.payment.application.port.out.PaymentEventPublisherPort;
import com.quickbite.payment.domain.model.Payment;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

/**
 * Adapter implementing PaymentEventPublisherPort using Spring Kafka.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class KafkaPaymentEventPublisher implements PaymentEventPublisherPort {

    private final KafkaTemplate<String, String> kafkaTemplate;
    private final ObjectMapper objectMapper;

    @Value("${app.kafka.topics.publish:fulfillment-events}")
    private String topicName;

    @Override
    public void publishPaymentCompleted(Payment payment) {
        try {
            PaymentCompletedEto eto = PaymentCompletedEto.builder()
                    .eventId(java.util.UUID.randomUUID())
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
            kafkaTemplate.send(topicName, "payment.authorized", jsonPayload);
            log.info("Published PaymentCompletedEto to topic {}: {}", topicName, eto);
        } catch (Exception e) {
            log.error("Failed to publish PaymentCompletedEto for paymentId: {}", payment.getId(), e);
        }
    }

    @Override
    public void publishPaymentFailed(Payment payment) {
        try {
            PaymentFailedEto eto = PaymentFailedEto.builder()
                    .eventId(java.util.UUID.randomUUID())
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
            kafkaTemplate.send(topicName, "payment.failed", jsonPayload);
            log.info("Published PaymentFailedEto to topic {}: {}", topicName, eto);
        } catch (Exception e) {
            log.error("Failed to publish PaymentFailedEto for paymentId: {}", payment.getId(), e);
        }
    }
}
