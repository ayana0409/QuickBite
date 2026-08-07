package com.quickbite.payment.adapter.in.messaging;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.quickbite.payment.adapter.out.persistence.PaymentInboxEntity;
import com.quickbite.payment.adapter.out.persistence.SpringDataPaymentInboxRepository;
import com.quickbite.payment.application.port.in.CreatePaymentCommand;
import com.quickbite.payment.application.port.in.ProcessPaymentUseCase;
import com.quickbite.payment.domain.model.Payment;
import com.quickbite.payment.domain.model.PaymentMethod;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

/**
 * Adapter consuming events from Order Service via Kafka.
 * Implements Inbox pattern to guarantee idempotency.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PaymentEventConsumer {

    private final ProcessPaymentUseCase processPaymentUseCase;
    private final SpringDataPaymentInboxRepository inboxRepository;
    private final ObjectMapper objectMapper;

    @KafkaListener(topics = "${app.kafka.topics.listen:order-events}", groupId = "${spring.kafka.consumer.group-id:payment-service-group}")
    public void consumeOrderEvent(String message) {
        log.info("Received Kafka message from order-events topic: {}", message);
        try {
            JsonNode root = objectMapper.readTree(message);

            String eventType = root.has("eventType") ? root.get("eventType").asText() : "";
            
            // Extract eventId if present, or generate deterministic UUID based on message payload hash/orderId
            UUID eventId = root.has("eventId") 
                    ? UUID.fromString(root.get("eventId").asText()) 
                    : (root.has("orderId") ? UUID.nameUUIDFromBytes(("ORDER_PAYMENT_" + eventType + "_" + root.get("orderId").asText()).getBytes()) : UUID.randomUUID());

            // Inbox Check (Idempotency)
            if (inboxRepository.existsByEventId(eventId)) {
                log.info("Duplicate event detected in Inbox. Skipping processing for eventId: {}", eventId);
                return;
            }

            // Handle order.cancelled or order.Cancelled (or payload containing reason without totalAmount)
            boolean isCancelled = "order.cancelled".equalsIgnoreCase(eventType) 
                    || "order.Cancelled".equalsIgnoreCase(eventType) 
                    || (eventType.isEmpty() && root.has("reason") && !root.has("totalAmount") && !root.has("amount"));

            if (isCancelled) {
                if (root.has("orderId")) {
                    UUID orderId = UUID.fromString(root.get("orderId").asText());
                    String reason = root.has("reason") ? root.get("reason").asText() : "Đơn hàng hủy do người dùng";
                    
                    Payment payment = processPaymentUseCase.cancelPaymentByOrderId(orderId, reason);
                    if (payment != null) {
                        saveInboxRecord(eventId, "order.cancelled");
                        log.info("Cancelled payment for OrderId: {}, Reason: {}", orderId, reason);
                    } else {
                        log.info("No payment found for OrderId: {}. Skipping payment cancellation.", orderId);
                    }
                }
                return;
            }

            // Handle order.refunded or order.Refunded
            if ("order.refunded".equalsIgnoreCase(eventType) || "order.Refunded".equalsIgnoreCase(eventType)) {
                if (root.has("orderId")) {
                    UUID orderId = UUID.fromString(root.get("orderId").asText());
                    String reason = root.has("reason") ? root.get("reason").asText() : "Hoàn tiền cho khách hàng";
                    
                    Payment payment = processPaymentUseCase.refundPaymentByOrderId(orderId, reason);
                    if (payment != null) {
                        saveInboxRecord(eventId, "order.refunded");
                        log.info("Refunded payment for OrderId: {}, Reason: {}", orderId, reason);
                    } else {
                        log.info("No payment found for OrderId: {}. Skipping payment refund.", orderId);
                    }
                }
                return;
            }

            // Check if this message is intended for payment processing (ONLY for order.waiting-payment event)
            if (("order.waiting-payment".equalsIgnoreCase(eventType) || eventType.isEmpty()) && root.has("orderId") && (root.has("totalAmount") || root.has("amount"))) {
                UUID orderId = UUID.fromString(root.get("orderId").asText());
                UUID customerId = root.has("customerId") ? UUID.fromString(root.get("customerId").asText()) : UUID.randomUUID();
                
                BigDecimal amount = root.has("totalAmount") 
                        ? new BigDecimal(root.get("totalAmount").asText())
                        : new BigDecimal(root.get("amount").asText());
                
                PaymentMethod method = PaymentMethod.MOCK_PAYMENT;
                if (root.has("paymentMethod")) {
                    try {
                        method = PaymentMethod.valueOf(root.get("paymentMethod").asText().toUpperCase());
                    } catch (Exception ignored) {
                    }
                }

                CreatePaymentCommand command = CreatePaymentCommand.builder()
                        .orderId(orderId)
                        .customerId(customerId)
                        .amount(amount)
                        .method(method)
                        .build();

                Payment createdPayment = processPaymentUseCase.createPayment(command);

                saveInboxRecord(eventId, eventType);
                log.info("Created PENDING Payment via Kafka event and saved to Inbox for OrderId: {}, PaymentId: {}", orderId, createdPayment.getId());
            } else {
                log.debug("Ignored Kafka event on order-events: {}", eventType);
            }
        } catch (Exception e) {
            log.error("Error processing incoming Kafka order event: {}", message, e);
        }
    }

    private void saveInboxRecord(UUID eventId, String eventType) {
        PaymentInboxEntity inboxRecord = PaymentInboxEntity.builder()
                .id(UUID.randomUUID())
                .eventId(eventId)
                .eventType(eventType)
                .processedAt(LocalDateTime.now())
                .build();
        inboxRepository.save(inboxRecord);
    }
}
