package com.quickbite.inventory.kafka.consumer;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.quickbite.inventory.service.InventoryService;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Map;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

@ExtendWith(MockitoExtension.class)
class OrderEventConsumerTest {

    @Mock
    private InventoryService inventoryService;

    @Spy
    private ObjectMapper objectMapper = new ObjectMapper();

    @InjectMocks
    private OrderEventConsumer orderEventConsumer;

    private UUID orderId;
    private UUID foodItemId;

    @BeforeEach
    void setUp() {
        orderId = UUID.randomUUID();
        foodItemId = UUID.randomUUID();
    }

    @Test
    @DisplayName("Should handle order.submitted event and delegate to reserveStockBatch")
    void shouldHandleOrderSubmittedEvent() {
        // Arrange
        String jsonPayload = String.format("""
                {
                    "eventId": "%s",
                    "orderId": "%s",
                    "eventType": "order.submitted",
                    "items": [
                        {
                            "foodItemId": "%s",
                            "quantity": 2
                        }
                    ]
                }
                """, UUID.randomUUID(), orderId, foodItemId);

        ConsumerRecord<String, String> record = new ConsumerRecord<>("order-events", 0, 0L, "order.submitted", jsonPayload);

        // Act
        orderEventConsumer.handleOrderEvent(record);

        // Assert
        verify(inventoryService).reserveStockBatch(
                eq(orderId),
                eq(Map.of(foodItemId, 2)),
                any(),
                any()
        );
    }

    @Test
    @DisplayName("Should aggregate duplicate foodItemIds on order.completed and confirm total quantity")
    void shouldAggregateDuplicateFoodItemsOnOrderCompleted() {
        // Arrange - 3 separate order items with the same foodItemId
        String jsonPayload = String.format("""
                {
                    "eventId": "%s",
                    "orderId": "%s",
                    "eventType": "order.completed",
                    "items": [
                        { "foodItemId": "%s", "quantity": 1 },
                        { "foodItemId": "%s", "quantity": 1 },
                        { "foodItemId": "%s", "quantity": 1 }
                    ]
                }
                """, UUID.randomUUID(), orderId, foodItemId, foodItemId, foodItemId);

        ConsumerRecord<String, String> record = new ConsumerRecord<>("order-events", 0, 0L, "order.completed", jsonPayload);

        // Act
        orderEventConsumer.handleOrderEvent(record);

        // Assert - confirmStockDeduction should be called exactly once with quantity = 3
        verify(inventoryService).confirmStockDeduction(
                eq(orderId),
                eq(foodItemId),
                eq(3),
                any()
        );
    }

    @Test
    @DisplayName("Should aggregate duplicate foodItemIds on order.cancelled and release total quantity")
    void shouldAggregateDuplicateFoodItemsOnOrderCancelled() {
        // Arrange - 2 separate order items with the same foodItemId
        String jsonPayload = String.format("""
                {
                    "eventId": "%s",
                    "orderId": "%s",
                    "eventType": "order.cancelled",
                    "items": [
                        { "foodItemId": "%s", "quantity": 2 },
                        { "foodItemId": "%s", "quantity": 3 }
                    ]
                }
                """, UUID.randomUUID(), orderId, foodItemId, foodItemId);

        ConsumerRecord<String, String> record = new ConsumerRecord<>("order-events", 0, 0L, "order.cancelled", jsonPayload);

        // Act
        orderEventConsumer.handleOrderEvent(record);

        // Assert - releaseReservedStock should be called exactly once with quantity = 5
        verify(inventoryService).releaseReservedStock(
                eq(orderId),
                eq(foodItemId),
                eq(5),
                any(),
                any()
        );
    }

    @Test
    @DisplayName("Should ignore event if orderId is missing")
    void shouldIgnoreEventWithoutOrderId() {
        // Arrange
        String jsonPayload = """
                {
                    "eventType": "order.submitted",
                    "items": []
                }
                """;

        ConsumerRecord<String, String> record = new ConsumerRecord<>("order-events", 0, 0L, "order.submitted", jsonPayload);

        // Act
        orderEventConsumer.handleOrderEvent(record);

        // Assert
        verifyNoInteractions(inventoryService);
    }
}
