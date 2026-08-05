package com.quickbite.inventory.kafka.consumer;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.quickbite.inventory.service.InventoryFoodItemService;
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
public class CatalogEventConsumer {

    private final InventoryFoodItemService inventoryFoodItemService;
    private final ObjectMapper objectMapper;

    @KafkaListener(
            topics = "${app.kafka.topics.catalog:catalog-events}",
            groupId = "${spring.kafka.consumer.group-id:inventory-service-group}"
    )
    public void handleCatalogEvent(ConsumerRecord<String, String> record) {
        String message = record.value();
        String kafkaKey = record.key();
        log.info("[Kafka Consumer] Received message from topic 'catalog-events': Key='{}', Value={}", kafkaKey, message);
        try {
            JsonNode rootNode = objectMapper.readTree(message);

            // AbpKafkaSerializer sets the event name as Kafka Key
            String eventType = (kafkaKey != null && !kafkaKey.trim().isEmpty()) ? kafkaKey.trim() : "";

            // Fallback to JSON root if Kafka Key is missing
            if (eventType.isEmpty()) {
                eventType = extractString(rootNode, "eventName", "eventType");
            }
            
            // If still empty but it has "id" field, infer "food.item.synced"
            if (eventType.isEmpty() && rootNode.has("id")) {
                eventType = "food.item.synced";
            }

            if ("food.item.synced".equalsIgnoreCase(eventType) || "FOOD_ITEM_SYNCED".equalsIgnoreCase(eventType)) {
                // Parse Event ID from headers (messageId or eventId) for Inbox pattern
                UUID eventId = parseUuidFromHeaders(record.headers());
                if (eventId == null) {
                    eventId = parseUuid(rootNode, "eventId");
                }
                
                // If no eventId found, use a deterministic UUID based on the payload "id" to maintain idempotency
                if (eventId == null && rootNode.has("id")) {
                    eventId = UUID.nameUUIDFromBytes(rootNode.get("id").asText().getBytes(StandardCharsets.UTF_8));
                    log.debug("Event ID missing. Generated deterministic UUID for inbox: {}", eventId);
                }

                // The message body is directly the ETO object
                UUID id = parseUuid(rootNode, "id");
                if (id == null) {
                    id = parseUuid(rootNode, "foodItemId");
                }

                String sku = extractString(rootNode, "sku");
                Boolean isAvailable = parseBoolean(rootNode, "isAvailable");
                if (isAvailable == null) isAvailable = true;

                if (id != null) {
                    inventoryFoodItemService.syncFoodItem(id, sku.isEmpty() ? null : sku, isAvailable, eventId);
                    log.info("[Kafka Consumer] Successfully processed food item sync: ID={}, SKU={}, isAvailable={}", id, sku, isAvailable);
                } else {
                    log.warn("[Kafka Consumer] FoodItem sync event missing ID field. Raw message: {}", message);
                }
            } else {
                log.debug("[Kafka Consumer] Ignored catalog eventType: '{}'", eventType);
            }

        } catch (Exception e) {
            log.error("[Kafka Consumer] Error processing catalog event message: {}", e.getMessage(), e);
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

    private Boolean parseBoolean(JsonNode node, String fieldName) {
        if (node != null && node.has(fieldName) && !node.get(fieldName).isNull()) {
            return node.get(fieldName).asBoolean();
        }
        return null;
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
        if (headers == null) return null;
        
        Header header = headers.lastHeader("messageId");
        if (header == null) {
            header = headers.lastHeader("eventId");
        }
        
        if (header != null && header.value() != null) {
            try {
                String idStr = new String(header.value(), StandardCharsets.UTF_8).replace("\"", "");
                // ABP format is often without hyphens (N format)
                if (idStr.length() == 32) {
                    idStr = idStr.replaceFirst("(\\p{XDigit}{8})(\\p{XDigit}{4})(\\p{XDigit}{4})(\\p{XDigit}{4})(\\p{XDigit}+)", "$1-$2-$3-$4-$5");
                }
                return UUID.fromString(idStr);
            } catch (Exception e) {
                log.warn("Invalid UUID format in headers");
            }
        }
        return null;
    }
}
