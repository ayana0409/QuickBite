package com.quickbite.inventory.kafka.producer;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.quickbite.inventory.dto.event.out.StockRejectedEvent;
import com.quickbite.inventory.dto.event.out.StockReleasedEvent;
import com.quickbite.inventory.dto.event.out.StockReservedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class FulfillmentEventProducer {

    private final KafkaTemplate<String, String> kafkaTemplate;
    private final ObjectMapper objectMapper;

    @Value("${app.kafka.topics.publish:fulfillment-events}")
    private String fulfillmentTopic;

    public void sendStockReserved(StockReservedEvent event) {
        sendEvent(event.getOrderId(), event);
    }

    public void sendStockRejected(StockRejectedEvent event) {
        sendEvent(event.getOrderId(), event);
    }

    public void sendStockReleased(StockReleasedEvent event) {
        sendEvent(event.getOrderId(), event);
    }

    private void sendEvent(String key, Object event) {
        try {
            String payload = objectMapper.writeValueAsString(event);
            log.info("[Kafka Producer] Publishing event to topic '{}' with key '{}': {}", fulfillmentTopic, key, payload);
            kafkaTemplate.send(fulfillmentTopic, key, payload)
                    .whenComplete((result, ex) -> {
                        if (ex != null) {
                            log.error("[Kafka Producer] Failed to send message to topic '{}': {}", fulfillmentTopic, ex.getMessage(), ex);
                        } else {
                            log.info("[Kafka Producer] Successfully sent message to topic '{}' [Partition: {}, Offset: {}]",
                                    fulfillmentTopic, result.getRecordMetadata().partition(), result.getRecordMetadata().offset());
                        }
                    });
        } catch (Exception e) {
            log.error("[Kafka Producer] Error serializing event object: {}", e.getMessage(), e);
        }
    }
}
