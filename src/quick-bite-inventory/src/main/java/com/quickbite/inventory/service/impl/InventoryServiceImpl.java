package com.quickbite.inventory.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.quickbite.inventory.dto.event.out.StockRejectedEvent;
import com.quickbite.inventory.dto.event.out.StockReleasedEvent;
import com.quickbite.inventory.dto.event.out.StockReservedEvent;
import com.quickbite.inventory.dto.request.CreateOrUpdateInventoryRequest;
import com.quickbite.inventory.dto.request.StockAdjustmentRequest;
import com.quickbite.inventory.dto.response.InventoryItemResponse;
import com.quickbite.inventory.entity.InboxMessage;
import com.quickbite.inventory.entity.InventoryFoodItem;
import com.quickbite.inventory.entity.InventoryItem;
import com.quickbite.inventory.entity.OutboxMessage;
import com.quickbite.inventory.repository.InboxMessageRepository;
import com.quickbite.inventory.repository.InventoryFoodItemRepository;
import com.quickbite.inventory.repository.InventoryItemRepository;
import com.quickbite.inventory.repository.OutboxMessageRepository;
import com.quickbite.inventory.service.InventoryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class InventoryServiceImpl implements InventoryService {

    private final InventoryItemRepository inventoryItemRepository;
    private final InventoryFoodItemRepository inventoryFoodItemRepository;
    private final OutboxMessageRepository outboxMessageRepository;
    private final InboxMessageRepository inboxMessageRepository;
    private final ObjectMapper objectMapper;

    @Value("${app.kafka.topics.publish:fulfillment-events}")
    private String fulfillmentTopic;

    @Override
    @Transactional(readOnly = true)
    public List<InventoryItemResponse> getAllInventoryItems() {
        return inventoryItemRepository.findAll()
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public org.springframework.data.domain.Page<InventoryItemResponse> getInventoryByRestaurant(UUID restaurantId, UUID categoryId, String name, int page, int limit) {
        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(Math.max(0, page - 1), limit);
        return inventoryItemRepository.findInventoryByRestaurant(restaurantId, categoryId, name, pageable);
    }

    @Override
    @Transactional(readOnly = true)
    public InventoryItemResponse getByFoodItemId(UUID foodItemId) {
        InventoryItem item = inventoryItemRepository.findByFoodItemId(foodItemId)
                .orElseThrow(() -> new IllegalArgumentException("Inventory item not found for food item ID: " + foodItemId));
        return mapToResponse(item);
    }

    @Override
    @Transactional
    public InventoryItemResponse createOrUpdateItem(CreateOrUpdateInventoryRequest request) {
        log.info("Creating/Updating inventory for food item: {}, quantity: {}", request.getFoodItemId(), request.getQuantity());

        if (!inventoryFoodItemRepository.existsById(request.getFoodItemId())) {
            throw new IllegalArgumentException("Food item not found with ID: " + request.getFoodItemId());
        }

        InventoryItem item = inventoryItemRepository.findByFoodItemId(request.getFoodItemId())
                .orElseGet(() -> InventoryItem.builder()
                        .foodItemId(request.getFoodItemId())
                        .reservedQuantity(0)
                        .build());

        item.setQuantity(request.getQuantity());
        InventoryItem savedItem = inventoryItemRepository.save(item);
        return mapToResponse(savedItem);
    }

    @Override
    @Transactional
    public InventoryItemResponse adjustStock(StockAdjustmentRequest request) {
        log.info("Adjusting stock for food item: {}, adjustment: {}", request.getFoodItemId(), request.getAdjustmentQuantity());
        InventoryItem item = inventoryItemRepository.findByFoodItemIdWithLock(request.getFoodItemId())
                .orElseThrow(() -> new IllegalArgumentException("Inventory item not found for food item ID: " + request.getFoodItemId()));

        int newQuantity = item.getQuantity() + request.getAdjustmentQuantity();
        if (newQuantity < item.getReservedQuantity()) {
            throw new IllegalStateException("Cannot reduce stock below current reserved quantity (" + item.getReservedQuantity() + ")");
        }

        item.setQuantity(Math.max(0, newQuantity));
        InventoryItem savedItem = inventoryItemRepository.save(item);
        return mapToResponse(savedItem);
    }

    @Override
    @Transactional
    public void deleteItemByFoodItemId(UUID foodItemId) {
        log.info("Deleting inventory item for food item: {}", foodItemId);
        InventoryItem item = inventoryItemRepository.findByFoodItemId(foodItemId)
                .orElseThrow(() -> new IllegalArgumentException("Inventory item not found for food item ID: " + foodItemId));
        inventoryItemRepository.delete(item);
    }

    @Override
    @Transactional
    public boolean reserveStock(UUID orderId, UUID foodItemId, int quantity, UUID correlationId, UUID eventId) {
        if (eventId != null && inboxMessageRepository.existsById(eventId)) {
            log.info("[Inbox Pattern] Order event ID: {} already processed. Skipping reserve stock.", eventId);
            return true;
        }

        log.info("[Saga Reserve] Request to reserve stock. OrderId: {}, FoodItemId: {}, Qty: {}", orderId, foodItemId, quantity);

        // 1. Validate FoodItem existence & availability
        Optional<InventoryFoodItem> foodItemOpt = inventoryFoodItemRepository.findById(foodItemId);
        if (foodItemOpt.isEmpty() || !foodItemOpt.get().isAvailable()) {
            String reason = foodItemOpt.isEmpty()
                    ? "Food item not found in catalog replica: " + foodItemId
                    : "Food item is currently unavailable: " + foodItemId;
            log.warn("[Saga Reserve] REJECTED - {}", reason);

            saveOutboxEvent(
                    UUID.randomUUID(),
                    "stock.rejected",
                    StockRejectedEvent.builder()
                            .eventId(UUID.randomUUID())
                            .orderId(orderId)
                            .foodItemId(foodItemId)
                            .quantity(quantity)
                            .status("OUT_OF_STOCK")
                            .reason(reason)
                            .correlationId(correlationId)
                            .build()
            );

            recordInbox(eventId, "order.stock.reservation.requested");
            return false;
        }

        // 2. Lock and validate inventory stock
        Optional<InventoryItem> optionalItem = inventoryItemRepository.findByFoodItemIdWithLock(foodItemId);
        if (optionalItem.isEmpty() || !optionalItem.get().hasEnoughStock(quantity)) {
            int avail = optionalItem.map(InventoryItem::getAvailableQuantity).orElse(0);
            String reason = "Insufficient available stock. Available: " + avail + ", Requested: " + quantity;
            log.warn("[Saga Reserve] REJECTED - FoodItemId: {}. {}", foodItemId, reason);

            saveOutboxEvent(
                    UUID.randomUUID(),
                    "stock.rejected",
                    StockRejectedEvent.builder()
                            .eventId(UUID.randomUUID())
                            .orderId(orderId)
                            .foodItemId(foodItemId)
                            .quantity(quantity)
                            .status("OUT_OF_STOCK")
                            .reason(reason)
                            .correlationId(correlationId)
                            .build()
            );

            recordInbox(eventId, "order.stock.reservation.requested");
            return false;
        }

        // 3. Reserve stock & Save Outbox Event
        InventoryItem item = optionalItem.get();
        item.reserveStock(quantity);
        inventoryItemRepository.save(item);

        saveOutboxEvent(
                UUID.randomUUID(),
                "stock.reserved",
                StockReservedEvent.builder()
                        .eventId(UUID.randomUUID())
                        .orderId(orderId)
                        .foodItemId(foodItemId)
                        .quantity(quantity)
                        .status("SUCCESS")
                        .correlationId(correlationId)
                        .build()
        );

        recordInbox(eventId, "order.stock.reservation.requested");
        log.info("[Saga Reserve] SUCCESS - Reserved {} units for order: {}", quantity, orderId);
        return true;
    }

    @Override
    @Transactional
    public boolean reserveStockBatch(UUID orderId, java.util.Map<UUID, Integer> items, UUID correlationId, UUID eventId) {
        if (eventId != null && inboxMessageRepository.existsById(eventId)) {
            log.info("[Inbox Pattern] Order event ID: {} already processed. Skipping reserve stock batch.", eventId);
            return true;
        }

        log.info("[Saga Reserve Batch] Request to reserve stock for OrderId: {}. Items: {}", orderId, items.size());

        // Sort keys to prevent deadlocks during locking
        List<UUID> sortedFoodItemIds = items.keySet().stream().sorted().collect(Collectors.toList());

        // 1. Validate ALL items exist and have enough stock
        for (UUID foodItemId : sortedFoodItemIds) {
            int quantity = items.get(foodItemId);

            Optional<InventoryFoodItem> foodItemOpt = inventoryFoodItemRepository.findById(foodItemId);
            if (foodItemOpt.isEmpty() || !foodItemOpt.get().isAvailable()) {
                String reason = foodItemOpt.isEmpty()
                        ? "Food item not found in catalog replica: " + foodItemId
                        : "Food item is currently unavailable: " + foodItemId;
                log.warn("[Saga Reserve Batch] REJECTED - {}", reason);
                saveRejectedEvent(orderId, foodItemId, quantity, reason, correlationId);
                recordInbox(eventId, "order.stock.reservation.requested.batch");
                return false;
            }

            Optional<InventoryItem> optionalItem = inventoryItemRepository.findByFoodItemIdWithLock(foodItemId);
            if (optionalItem.isEmpty() || !optionalItem.get().hasEnoughStock(quantity)) {
                int avail = optionalItem.map(InventoryItem::getAvailableQuantity).orElse(0);
                String reason = "Insufficient available stock for item " + foodItemId + ". Available: " + avail + ", Requested: " + quantity;
                log.warn("[Saga Reserve Batch] REJECTED - {}", reason);
                saveRejectedEvent(orderId, foodItemId, quantity, reason, correlationId);
                recordInbox(eventId, "order.stock.reservation.requested.batch");
                return false;
            }
        }

        // 2. All items valid, reserve all
        for (UUID foodItemId : sortedFoodItemIds) {
            int quantity = items.get(foodItemId);
            InventoryItem item = inventoryItemRepository.findByFoodItemIdWithLock(foodItemId).get();
            item.reserveStock(quantity);
            inventoryItemRepository.save(item);
        }

        // 3. Save SUCCESS Outbox Event for the whole order
        saveOutboxEvent(
                UUID.randomUUID(),
                "stock.reserved",
                StockReservedEvent.builder()
                        .eventId(UUID.randomUUID())
                        .orderId(orderId)
                        .correlationId(correlationId)
                        .status("SUCCESS")
                        .build()
        );

        recordInbox(eventId, "order.stock.reservation.requested.batch");
        log.info("[Saga Reserve Batch] SUCCESS - Reserved all {} items for order: {}", items.size(), orderId);
        return true;
    }

    private void saveRejectedEvent(UUID orderId, UUID foodItemId, int quantity, String reason, UUID correlationId) {
        saveOutboxEvent(
                UUID.randomUUID(),
                "stock.rejected",
                StockRejectedEvent.builder()
                        .eventId(UUID.randomUUID())
                        .orderId(orderId)
                        .foodItemId(foodItemId)
                        .quantity(quantity)
                        .status("OUT_OF_STOCK")
                        .reason(reason)
                        .correlationId(correlationId)
                        .build()
        );
    }

    @Override
    @Transactional
    public boolean releaseReservedStock(UUID orderId, UUID foodItemId, int quantity, UUID correlationId, UUID eventId) {
        if (eventId != null && inboxMessageRepository.existsById(eventId)) {
            log.info("[Inbox Pattern] Order event ID: {} already processed. Skipping release stock.", eventId);
            return true;
        }

        log.info("[Saga Release] Request to release stock. OrderId: {}, FoodItemId: {}, Qty: {}", orderId, foodItemId, quantity);

        Optional<InventoryItem> optionalItem = inventoryItemRepository.findByFoodItemIdWithLock(foodItemId);
        boolean released = false;
        if (optionalItem.isPresent()) {
            InventoryItem item = optionalItem.get();
            item.releaseReservedStock(quantity);
            inventoryItemRepository.save(item);
            released = true;
            log.info("[Saga Release] SUCCESS - Released {} units for order: {}", quantity, orderId);
        } else {
            log.warn("[Saga Release] FoodItemId: {} not found during compensation", foodItemId);
        }

        saveOutboxEvent(
                UUID.randomUUID(),
                "stock.released",
                StockReleasedEvent.builder()
                        .eventId(UUID.randomUUID())
                        .orderId(orderId)
                        .foodItemId(foodItemId)
                        .quantity(quantity)
                        .status(released ? "RELEASED" : "NOT_FOUND")
                        .correlationId(correlationId)
                        .build()
        );

        recordInbox(eventId, "order.stock.release.requested");
        return released;
    }

    @Override
    @Transactional
    public boolean confirmStockDeduction(UUID orderId, UUID foodItemId, int quantity, UUID eventId) {
        if (eventId != null && inboxMessageRepository.existsById(eventId)) {
            log.info("[Inbox Pattern] Order event ID: {} already processed. Skipping confirm stock.", eventId);
            return true;
        }

        log.info("[Saga Confirm] Request to confirm stock deduction. OrderId: {}, FoodItemId: {}, Qty: {}", orderId, foodItemId, quantity);
        Optional<InventoryItem> optionalItem = inventoryItemRepository.findByFoodItemIdWithLock(foodItemId);

        if (optionalItem.isPresent()) {
            InventoryItem item = optionalItem.get();
            item.confirmDeduct(quantity);
            inventoryItemRepository.save(item);
            log.info("[Saga Confirm] SUCCESS - Deducted {} units for order: {}", quantity, orderId);
        } else {
            log.warn("[Saga Confirm] FoodItemId: {} not found during confirm deduction", foodItemId);
        }

        recordInbox(eventId, "order.confirmed");
        return true;
    }

    private void saveOutboxEvent(UUID eventId, String eventType, Object eventObj) {
        try {
            String payload = objectMapper.writeValueAsString(eventObj);
            OutboxMessage outbox = OutboxMessage.builder()
                    .eventId(eventId)
                    .eventType(eventType)
                    .topic(fulfillmentTopic)
                    .payload(payload)
                    .status("PENDING")
                    .build();
            outboxMessageRepository.save(outbox);
            log.info("[Outbox Pattern] Saved '{}' event to outbox messages [EventID: {}]", eventType, eventId);
        } catch (Exception e) {
            log.error("[Outbox Pattern] Failed to serialize event for outbox: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to save outbox event", e);
        }
    }

    private void recordInbox(UUID eventId, String eventType) {
        if (eventId != null) {
            InboxMessage inbox = InboxMessage.builder()
                    .eventId(eventId)
                    .eventType(eventType)
                    .consumer("inventory-service-order-consumer")
                    .build();
            inboxMessageRepository.save(inbox);
        }
    }

    private InventoryItemResponse mapToResponse(InventoryItem item) {
        return InventoryItemResponse.builder()
                .id(item.getId())
                .foodItemId(item.getFoodItemId())
                .quantity(item.getQuantity())
                .reservedQuantity(item.getReservedQuantity())
                .availableQuantity(item.getAvailableQuantity())
                .createdAt(item.getCreatedAt())
                .updatedAt(item.getUpdatedAt())
                .build();
    }
}
