package com.quickbite.inventory.kafka.consumer;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.quickbite.inventory.service.InventoryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class OrderEventConsumer {

    private final InventoryService inventoryService;
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
            UUID eventId = parseUuid(rootNode, "eventId");
            UUID orderId = parseUuid(rootNode, "orderId");
            UUID foodItemId = parseUuid(rootNode, "foodItemId");
            if (foodItemId == null) {
                foodItemId = parseUuid(rootNode, "productId");
            }
            int quantity = rootNode.has("quantity") ? rootNode.get("quantity").asInt() : 1;
            UUID correlationId = parseUuid(rootNode, "correlationId");
            if (correlationId == null) {
                correlationId = orderId;
            }

            log.info("[Kafka Consumer] Processing event: '{}', OrderId: '{}', FoodItemId: '{}', Qty: {}",
                    eventType, orderId, foodItemId, quantity);

            if (orderId == null || foodItemId == null) {
                log.warn("[Kafka Consumer] Missing orderId or foodItemId. Cannot process order event.");
                return;
            }

            switch (eventType) {
                case "saga.stock.reservation.requested":
                case "order.created":
                case "ORDER_CREATED":
                    inventoryService.reserveStock(orderId, foodItemId, quantity, correlationId, eventId);
                    break;

                case "saga.stock.release.requested":
                case "order.cancelled":
                case "ORDER_CANCELLED":
                    inventoryService.releaseReservedStock(orderId, foodItemId, quantity, correlationId, eventId);
                    break;

                case "order.confirmed":
                case "ORDER_CONFIRMED":
                    inventoryService.confirmStockDeduction(orderId, foodItemId, quantity, eventId);
                    break;

                default:
                    log.debug("[Kafka Consumer] Unhandled eventType: '{}' for OrderId: '{}'", eventType, orderId);
                    break;
            }

        } catch (Exception e) {
            log.error("[Kafka Consumer] Error processing order event message: {}", e.getMessage(), e);
        }
    }

    private UUID parseUuid(JsonNode node, String fieldName) {
        if (node.has(fieldName) && !node.get(fieldName).isNull()) {
            try {
                return UUID.fromString(node.get(fieldName).asText());
            } catch (Exception e) {
                log.warn("Invalid UUID format for field '{}': {}", fieldName, node.get(fieldName).asText());
            }
        }
        return null;
    }
}
