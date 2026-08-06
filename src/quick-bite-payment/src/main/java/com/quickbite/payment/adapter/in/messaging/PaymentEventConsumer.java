package com.quickbite.payment.adapter.in.messaging;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.quickbite.payment.application.port.in.CreatePaymentCommand;
import com.quickbite.payment.application.port.in.ProcessPaymentUseCase;
import com.quickbite.payment.domain.model.Payment;
import com.quickbite.payment.domain.model.PaymentMethod;
import java.math.BigDecimal;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

/**
 * Adapter consuming events from Order Service via Kafka.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PaymentEventConsumer {

    private final ProcessPaymentUseCase processPaymentUseCase;
    private final ObjectMapper objectMapper;

    @KafkaListener(topics = "${app.kafka.topics.listen:order-events}", groupId = "${spring.kafka.consumer.group-id:payment-service-group}")
    public void consumeOrderEvent(String message) {
        log.info("Received Kafka message from order-events topic: {}", message);
        try {
            JsonNode root = objectMapper.readTree(message);

            // Extract event type if available, e.g. "saga.payment.requested" or "order.created"
            String eventType = root.has("eventType") ? root.get("eventType").asText() : "";
            
            // Check if this message is intended for payment processing
            if (root.has("orderId") && (root.has("totalAmount") || root.has("amount"))) {
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
                log.info("Created PENDING Payment via Kafka event for OrderId: {}, PaymentId: {}", orderId, createdPayment.getId());
            } else {
                log.debug("Ignored Kafka event on order-events as it does not contain payment payload: {}", eventType);
            }
        } catch (Exception e) {
            log.error("Error processing incoming Kafka order event: {}", message, e);
        }
    }
}
