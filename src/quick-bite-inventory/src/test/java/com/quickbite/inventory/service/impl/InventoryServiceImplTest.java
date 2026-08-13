package com.quickbite.inventory.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.quickbite.inventory.dto.request.CreateOrUpdateInventoryRequest;
import com.quickbite.inventory.dto.request.StockAdjustmentRequest;
import com.quickbite.inventory.dto.response.InventoryItemResponse;
import com.quickbite.inventory.entity.InventoryFoodItem;
import com.quickbite.inventory.entity.InventoryItem;
import com.quickbite.inventory.entity.OutboxMessage;
import com.quickbite.inventory.repository.InboxMessageRepository;
import com.quickbite.inventory.repository.InventoryFoodItemRepository;
import com.quickbite.inventory.repository.InventoryItemRepository;
import com.quickbite.inventory.repository.OutboxMessageRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class InventoryServiceImplTest {

    @Mock
    private InventoryItemRepository inventoryItemRepository;

    @Mock
    private InventoryFoodItemRepository inventoryFoodItemRepository;

    @Mock
    private OutboxMessageRepository outboxMessageRepository;

    @Mock
    private InboxMessageRepository inboxMessageRepository;

    @Spy
    private ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

    @InjectMocks
    private InventoryServiceImpl inventoryService;

    private UUID foodItemId;
    private UUID orderId;
    private UUID correlationId;
    private UUID eventId;

    @BeforeEach
    void setUp() {
        foodItemId = UUID.randomUUID();
        orderId = UUID.randomUUID();
        correlationId = UUID.randomUUID();
        eventId = UUID.randomUUID();
    }

    @Nested
    @DisplayName("Create or Update Inventory Item Tests")
    class CreateOrUpdateTests {

        @Test
        @DisplayName("Should create new inventory item when food item exists")
        void shouldCreateNewInventoryItem() {
            // Arrange
            CreateOrUpdateInventoryRequest request = new CreateOrUpdateInventoryRequest();
            request.setFoodItemId(foodItemId);
            request.setQuantity(100);

            when(inventoryFoodItemRepository.existsById(foodItemId)).thenReturn(true);
            when(inventoryItemRepository.findByFoodItemId(foodItemId)).thenReturn(Optional.empty());

            InventoryItem savedItem = InventoryItem.builder()
                    .id(UUID.randomUUID())
                    .foodItemId(foodItemId)
                    .quantity(100)
                    .reservedQuantity(0)
                    .build();

            when(inventoryItemRepository.save(any(InventoryItem.class))).thenReturn(savedItem);

            // Act
            InventoryItemResponse response = inventoryService.createOrUpdateItem(request);

            // Assert
            assertThat(response).isNotNull();
            assertThat(response.getFoodItemId()).isEqualTo(foodItemId);
            assertThat(response.getQuantity()).isEqualTo(100);
            verify(inventoryItemRepository).save(any(InventoryItem.class));
        }

        @Test
        @DisplayName("Should throw IllegalArgumentException when food item does not exist")
        void shouldThrowExceptionWhenFoodItemNotFound() {
            // Arrange
            CreateOrUpdateInventoryRequest request = new CreateOrUpdateInventoryRequest();
            request.setFoodItemId(foodItemId);
            request.setQuantity(50);

            when(inventoryFoodItemRepository.existsById(foodItemId)).thenReturn(false);

            // Act & Assert
            assertThatThrownBy(() -> inventoryService.createOrUpdateItem(request))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("Food item not found with ID");
        }
    }

    @Nested
    @DisplayName("Stock Adjustment Tests")
    class StockAdjustmentTests {

        @Test
        @DisplayName("Should adjust stock successfully when item exists")
        void shouldAdjustStockSuccessfully() {
            // Arrange
            StockAdjustmentRequest request = new StockAdjustmentRequest();
            request.setFoodItemId(foodItemId);
            request.setAdjustmentQuantity(20);

            InventoryItem existingItem = InventoryItem.builder()
                    .id(UUID.randomUUID())
                    .foodItemId(foodItemId)
                    .quantity(50)
                    .reservedQuantity(10)
                    .build();

            when(inventoryFoodItemRepository.existsById(foodItemId)).thenReturn(true);
            when(inventoryItemRepository.findByFoodItemIdWithLock(foodItemId))
                    .thenReturn(Optional.of(existingItem));
            when(inventoryItemRepository.save(any(InventoryItem.class)))
                    .thenAnswer(invocation -> invocation.getArgument(0));

            // Act
            InventoryItemResponse response = inventoryService.adjustStock(request);

            // Assert
            assertThat(response.getQuantity()).isEqualTo(70);
            verify(inventoryItemRepository).save(existingItem);
        }

        @Test
        @DisplayName("Should create new inventory item when item does not exist and adjustment is positive")
        void shouldCreateNewItemWhenAdjustmentIsPositive() {
            // Arrange
            StockAdjustmentRequest request = new StockAdjustmentRequest();
            request.setFoodItemId(foodItemId);
            request.setAdjustmentQuantity(15);

            when(inventoryFoodItemRepository.existsById(foodItemId)).thenReturn(true);
            when(inventoryItemRepository.findByFoodItemIdWithLock(foodItemId))
                    .thenReturn(Optional.empty());
            when(inventoryItemRepository.save(any(InventoryItem.class)))
                    .thenAnswer(invocation -> invocation.getArgument(0));

            // Act
            InventoryItemResponse response = inventoryService.adjustStock(request);

            // Assert
            assertThat(response).isNotNull();
            assertThat(response.getQuantity()).isEqualTo(15);
            assertThat(response.getReservedQuantity()).isEqualTo(0);
            verify(inventoryItemRepository).save(any(InventoryItem.class));
        }

        @Test
        @DisplayName("Should throw IllegalArgumentException when creating new item with negative adjustment quantity")
        void shouldThrowExceptionWhenCreatingNewItemWithNegativeQuantity() {
            // Arrange
            StockAdjustmentRequest request = new StockAdjustmentRequest();
            request.setFoodItemId(foodItemId);
            request.setAdjustmentQuantity(-10);

            when(inventoryFoodItemRepository.existsById(foodItemId)).thenReturn(true);
            when(inventoryItemRepository.findByFoodItemIdWithLock(foodItemId))
                    .thenReturn(Optional.empty());

            // Act & Assert
            assertThatThrownBy(() -> inventoryService.adjustStock(request))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("Cannot create new inventory item with a negative quantity");
        }

        @Test
        @DisplayName("Should throw IllegalStateException when reducing stock below reserved quantity")
        void shouldThrowExceptionWhenReducingBelowReservedQuantity() {
            // Arrange
            StockAdjustmentRequest request = new StockAdjustmentRequest();
            request.setFoodItemId(foodItemId);
            request.setAdjustmentQuantity(-45); // 50 - 45 = 5 < reserved (10)

            InventoryItem existingItem = InventoryItem.builder()
                    .id(UUID.randomUUID())
                    .foodItemId(foodItemId)
                    .quantity(50)
                    .reservedQuantity(10)
                    .build();

            when(inventoryFoodItemRepository.existsById(foodItemId)).thenReturn(true);
            when(inventoryItemRepository.findByFoodItemIdWithLock(foodItemId))
                    .thenReturn(Optional.of(existingItem));

            // Act & Assert
            assertThatThrownBy(() -> inventoryService.adjustStock(request))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("Cannot reduce stock below current reserved quantity");
        }
    }

    @Nested
    @DisplayName("Batch Stock Reservation Tests")
    class ReserveStockBatchTests {

        @Test
        @DisplayName("Should skip processing if event is already in inbox (idempotency)")
        void shouldSkipIfAlreadyInInbox() {
            // Arrange
            when(inboxMessageRepository.existsById(eventId)).thenReturn(true);
            Map<UUID, Integer> items = Map.of(foodItemId, 2);

            // Act
            boolean result = inventoryService.reserveStockBatch(orderId, items, correlationId, eventId);

            // Assert
            assertThat(result).isTrue();
            verifyNoInteractions(inventoryItemRepository);
            verifyNoInteractions(outboxMessageRepository);
        }

        @Test
        @DisplayName("Should reserve batch stock successfully when all items available")
        void shouldReserveBatchStockSuccessfully() {
            // Arrange
            when(inboxMessageRepository.existsById(eventId)).thenReturn(false);

            InventoryFoodItem foodItem = InventoryFoodItem.builder()
                    .id(foodItemId)
                    .isAvailable(true)
                    .build();

            InventoryItem inventoryItem = InventoryItem.builder()
                    .id(UUID.randomUUID())
                    .foodItemId(foodItemId)
                    .quantity(10)
                    .reservedQuantity(2)
                    .build();

            when(inventoryFoodItemRepository.findById(foodItemId)).thenReturn(Optional.of(foodItem));
            when(inventoryItemRepository.findByFoodItemIdWithLock(foodItemId)).thenReturn(Optional.of(inventoryItem));

            Map<UUID, Integer> items = new HashMap<>();
            items.put(foodItemId, 3);

            // Act
            boolean result = inventoryService.reserveStockBatch(orderId, items, correlationId, eventId);

            // Assert
            assertThat(result).isTrue();
            assertThat(inventoryItem.getReservedQuantity()).isEqualTo(5);
            verify(inventoryItemRepository).save(inventoryItem);
            verify(outboxMessageRepository).save(any(OutboxMessage.class));
        }

        @Test
        @DisplayName("Should reject batch reservation when item has insufficient stock")
        void shouldRejectBatchWhenInsufficientStock() {
            // Arrange
            when(inboxMessageRepository.existsById(eventId)).thenReturn(false);

            InventoryFoodItem foodItem = InventoryFoodItem.builder()
                    .id(foodItemId)
                    .isAvailable(true)
                    .build();

            InventoryItem inventoryItem = InventoryItem.builder()
                    .id(UUID.randomUUID())
                    .foodItemId(foodItemId)
                    .quantity(5)
                    .reservedQuantity(4) // Available = 1
                    .build();

            when(inventoryFoodItemRepository.findById(foodItemId)).thenReturn(Optional.of(foodItem));
            when(inventoryItemRepository.findByFoodItemIdWithLock(foodItemId)).thenReturn(Optional.of(inventoryItem));

            Map<UUID, Integer> items = Map.of(foodItemId, 5); // Requested = 5 > Available = 1

            // Act
            boolean result = inventoryService.reserveStockBatch(orderId, items, correlationId, eventId);

            // Assert
            assertThat(result).isFalse();
            // Should save stock.rejected outbox message
            verify(outboxMessageRepository).save(argThat(outbox -> outbox.getEventType().equals("stock.rejected")));
            // Reserved quantity should remain unchanged
            assertThat(inventoryItem.getReservedQuantity()).isEqualTo(4);
        }
    }
}
