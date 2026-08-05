package com.quickbite.inventory.kafka.consumer;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.quickbite.inventory.dto.event.out.StockRejectedEvent;
import com.quickbite.inventory.dto.event.out.StockReleasedEvent;
import com.quickbite.inventory.dto.event.out.StockReservedEvent;
import com.quickbite.inventory.kafka.producer.FulfillmentEventProducer;
import com.quickbite.inventory.service.InventoryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class OrderEventConsumer {

    private final InventoryService inventoryService;
    private final FulfillmentEventProducer fulfillmentEventProducer;
    private final ObjectMapper objectMapper;

    @KafkaListener(
            topics = "${app.kafka.topics.listen:order-events}",
            groupId = "${spring.kafka.consumer.group-id:inventory-service-group}"
    )
    public void handleOrderEvent(String message) {
        log.info("[Kafka Consumer] Received raw message from topic 'order-events': {}", message);
        try {
            JsonNode rootNode = objectMapper.readTree(message);

            String eventType = rootNode.has("eventType") ? rootNode.get("eventType").asText() : "";
            String orderId = rootNode.has("orderId") ? rootNode.get("orderId").asText() : "";
            String productId = rootNode.has("productId") ? rootNode.get("productId").asText() : "";
            int quantity = rootNode.has("quantity") ? rootNode.get("quantity").asInt() : 1;
            String correlationId = rootNode.has("correlationId") ? rootNode.get("correlationId").asText() : orderId;

            log.info("[Kafka Consumer] Processing event: '{}', OrderId: '{}', ProductId: '{}', Qty: {}",
                    eventType, orderId, productId, quantity);

            switch (eventType) {
                case "saga.stock.reservation.requested":
                case "order.created":
                case "ORDER_CREATED":
                    processStockReservation(orderId, productId, quantity, correlationId);
                    break;

                case "saga.stock.release.requested":
                case "order.cancelled":
                case "ORDER_CANCELLED":
                    processStockRelease(orderId, productId, quantity, correlationId);
                    break;

                case "order.confirmed":
                case "ORDER_CONFIRMED":
                    processConfirmStockDeduction(orderId, productId, quantity);
                    break;

                default:
                    log.debug("[Kafka Consumer] Unhandled eventType: '{}' for OrderId: '{}'", eventType, orderId);
                    break;
            }

        } catch (Exception e) {
            log.error("[Kafka Consumer] Error processing order event message: {}", e.getMessage(), e);
        }
    }

    private void processStockReservation(String orderId, String productId, int quantity, String correlationId) {
        boolean reserved = inventoryService.reserveStock(orderId, productId, quantity);

        if (reserved) {
            StockReservedEvent event = StockReservedEvent.builder()
                    .orderId(orderId)
                    .productId(productId)
                    .quantity(quantity)
                    .status("SUCCESS")
                    .correlationId(correlationId)
                    .build();

            fulfillmentEventProducer.sendStockReserved(event);
        } else {
            StockRejectedEvent event = StockRejectedEvent.builder()
                    .orderId(orderId)
                    .productId(productId)
                    .quantity(quantity)
                    .status("OUT_OF_STOCK")
                    .reason("Insufficient inventory stock or product not found")
                    .correlationId(correlationId)
                    .build();

            fulfillmentEventProducer.sendStockRejected(event);
        }
    }

    private void processStockRelease(String orderId, String productId, int quantity, String correlationId) {
        boolean released = inventoryService.releaseReservedStock(orderId, productId, quantity);

        StockReleasedEvent event = StockReleasedEvent.builder()
                .orderId(orderId)
                .productId(productId)
                .quantity(quantity)
                .status(released ? "RELEASED" : "NOT_FOUND")
                .correlationId(correlationId)
                .build();

        fulfillmentEventProducer.sendStockReleased(event);
    }

    private void processConfirmStockDeduction(String orderId, String productId, int quantity) {
        inventoryService.confirmStockDeduction(orderId, productId, quantity);
    }
}
