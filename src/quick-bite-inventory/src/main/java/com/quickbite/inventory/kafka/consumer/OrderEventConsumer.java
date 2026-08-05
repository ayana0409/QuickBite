package com.quickbite.inventory.kafka.consumer;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.quickbite.inventory.service.InventoryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.apache.kafka.common.header.Header;
import org.apache.kafka.common.header.Headers;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class OrderEventConsumer {

    private final InventoryService inventoryService;
    private final ObjectMapper objectMapper;

    @KafkaListener(topics = "${app.kafka.topics.listen:order-events}", groupId = "${spring.kafka.consumer.group-id:inventory-service-group}")
    public void handleOrderEvent(ConsumerRecord<String, String> record) {
        String message = record.value();
        String kafkaKey = record.key();
        log.info("[Kafka Consumer] Received message from topic 'order-events': Key='{}', Value={}", kafkaKey, message);
        try {
            JsonNode rootNode = objectMapper.readTree(message);

            // Determine target payload node (unwrap if wrapped)
            JsonNode payloadNode = rootNode.has("data") ? rootNode.get("data")
                    : (rootNode.has("payload") ? rootNode.get("payload") : rootNode);

            // Extract eventType
            String eventType = (kafkaKey != null && !kafkaKey.trim().isEmpty()) ? kafkaKey.trim() : "";
            if (eventType.isEmpty())
                eventType = extractString(payloadNode, "eventType", "eventName");
            if (eventType.isEmpty())
                eventType = extractString(rootNode, "eventType", "eventName", "pattern");

            // Accept order.submitted as well
            if (eventType.isEmpty() && rootNode.has("items")) {
                eventType = "order.submitted";
            }

            // Extract common order fields
            UUID eventId = parseUuidFromHeaders(record.headers());
            if (eventId == null)
                eventId = parseUuid(rootNode, "eventId");
            if (eventId == null)
                eventId = parseUuid(payloadNode, "eventId");

            UUID orderId = parseUuid(rootNode, "orderId");
            if (orderId == null)
                orderId = parseUuid(payloadNode, "orderId");

            UUID correlationId = parseUuid(rootNode, "correlationId");
            if (correlationId == null)
                correlationId = parseUuid(payloadNode, "correlationId");
            if (correlationId == null)
                correlationId = orderId; // Fallback to orderId

            if (eventId == null && orderId != null) {
                eventId = UUID
                        .nameUUIDFromBytes((eventType + "-" + orderId.toString()).getBytes(StandardCharsets.UTF_8));
                log.debug("Event ID missing. Generated deterministic UUID for inbox: {}", eventId);
            }

            if (orderId == null) {
                log.warn("[Kafka Consumer] Missing orderId. Cannot process order event.");
                return;
            }

            log.info("[Kafka Consumer] Processing event: '{}', OrderId: '{}'", eventType, orderId);

            switch (eventType) {
                case "order.submitted":
                case "saga.stock.reservation.requested":
                case "order.created":
                case "ORDER_CREATED":
                    JsonNode itemsNode = rootNode.has("items") ? rootNode.get("items") : payloadNode.get("items");
                    if (itemsNode != null && itemsNode.isArray()) {
                        for (JsonNode itemNode : itemsNode) {
                            UUID foodItemId = parseUuid(itemNode, "foodItemId");
                            if (foodItemId == null)
                                foodItemId = parseUuid(itemNode, "productId");
                            int quantity = itemNode.has("quantity") ? itemNode.get("quantity").asInt() : 1;

                            if (foodItemId != null) {
                                // Create unique eventId for each item to support Inbox idempotency per item
                                UUID itemEventId = UUID
                                        .nameUUIDFromBytes((eventId.toString() + "-" + foodItemId.toString())
                                                .getBytes(StandardCharsets.UTF_8));
                                inventoryService.reserveStock(orderId, foodItemId, quantity, correlationId,
                                        itemEventId);
                            }
                        }
                    } else {
                        // Fallback for single item payload
                        UUID singleFoodItemId = parseUuid(rootNode, "foodItemId");
                        int singleQuantity = rootNode.has("quantity") ? rootNode.get("quantity").asInt() : 1;
                        if (singleFoodItemId != null) {
                            inventoryService.reserveStock(orderId, singleFoodItemId, singleQuantity, correlationId,
                                    eventId);
                        } else {
                            log.warn("[Kafka Consumer] No items found to reserve stock for OrderId: {}", orderId);
                        }
                    }
                    break;

                case "saga.stock.release.requested":
                case "order.cancelled":
                case "ORDER_CANCELLED":
                    // Similarly parse items array for releasing stock
                    JsonNode releaseItemsNode = rootNode.has("items") ? rootNode.get("items")
                            : payloadNode.get("items");
                    if (releaseItemsNode != null && releaseItemsNode.isArray()) {
                        for (JsonNode itemNode : releaseItemsNode) {
                            UUID foodItemId = parseUuid(itemNode, "foodItemId");
                            int quantity = itemNode.has("quantity") ? itemNode.get("quantity").asInt() : 1;
                            if (foodItemId != null) {
                                UUID itemEventId = UUID
                                        .nameUUIDFromBytes((eventId.toString() + "-release-" + foodItemId.toString())
                                                .getBytes(StandardCharsets.UTF_8));
                                inventoryService.releaseReservedStock(orderId, foodItemId, quantity, correlationId,
                                        itemEventId);
                            }
                        }
                    } else {
                        UUID singleFoodItemId = parseUuid(rootNode, "foodItemId");
                        int singleQuantity = rootNode.has("quantity") ? rootNode.get("quantity").asInt() : 1;
                        if (singleFoodItemId != null) {
                            inventoryService.releaseReservedStock(orderId, singleFoodItemId, singleQuantity,
                                    correlationId, eventId);
                        }
                    }
                    break;

                case "order.confirmed":
                case "ORDER_CONFIRMED":
                    JsonNode confirmItemsNode = rootNode.has("items") ? rootNode.get("items")
                            : payloadNode.get("items");
                    if (confirmItemsNode != null && confirmItemsNode.isArray()) {
                        for (JsonNode itemNode : confirmItemsNode) {
                            UUID foodItemId = parseUuid(itemNode, "foodItemId");
                            int quantity = itemNode.has("quantity") ? itemNode.get("quantity").asInt() : 1;
                            if (foodItemId != null) {
                                UUID itemEventId = UUID
                                        .nameUUIDFromBytes((eventId.toString() + "-confirm-" + foodItemId.toString())
                                                .getBytes(StandardCharsets.UTF_8));
                                inventoryService.confirmStockDeduction(orderId, foodItemId, quantity, itemEventId);
                            }
                        }
                    } else {
                        UUID singleFoodItemId = parseUuid(rootNode, "foodItemId");
                        int singleQuantity = rootNode.has("quantity") ? rootNode.get("quantity").asInt() : 1;
                        if (singleFoodItemId != null) {
                            inventoryService.confirmStockDeduction(orderId, singleFoodItemId, singleQuantity, eventId);
                        }
                    }
                    break;

                default:
                    log.debug("[Kafka Consumer] Unhandled eventType: '{}' for OrderId: '{}'", eventType, orderId);
                    break;
            }

        } catch (Exception e) {
            log.error("[Kafka Consumer] Error processing order event message: {}", e.getMessage(), e);
        }
    }

    private String extractString(JsonNode node, String... fieldNames) {
        if (node != null && node.isObject()) {
            for (String name : fieldNames) {
                if (node.has(name) && !node.get(name).isNull()) {
                    return node.get(name).asText();
                }
            }
        }
        return "";
    }

    private UUID parseUuid(JsonNode node, String fieldName) {
        if (node != null && node.has(fieldName) && !node.get(fieldName).isNull()) {
            try {
                return UUID.fromString(node.get(fieldName).asText());
            } catch (Exception e) {
                log.warn("Invalid UUID format for field '{}': {}", fieldName, node.get(fieldName).asText());
            }
        }
        return null;
    }

    private UUID parseUuidFromHeaders(Headers headers) {
        if (headers == null)
            return null;

        Header header = headers.lastHeader("messageId");
        if (header == null) {
            header = headers.lastHeader("eventId");
        }

        if (header != null && header.value() != null) {
            try {
                String idStr = new String(header.value(), StandardCharsets.UTF_8).replace("\"", "");
                // ABP format is often without hyphens (N format)
                if (idStr.length() == 32) {
                    idStr = idStr.replaceFirst(
                            "(\\p{XDigit}{8})(\\p{XDigit}{4})(\\p{XDigit}{4})(\\p{XDigit}{4})(\\p{XDigit}+)",
                            "$1-$2-$3-$4-$5");
                }
                return UUID.fromString(idStr);
            } catch (Exception e) {
                log.warn("Invalid UUID format in headers");
            }
        }
        return null;
    }
}
