package com.quickbite.inventory.service.impl;

import com.quickbite.inventory.entity.InboxMessage;
import com.quickbite.inventory.entity.InventoryFoodItem;
import com.quickbite.inventory.repository.InboxMessageRepository;
import com.quickbite.inventory.repository.InventoryFoodItemRepository;
import com.quickbite.inventory.service.InventoryFoodItemService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class InventoryFoodItemServiceImpl implements InventoryFoodItemService {

    private final InventoryFoodItemRepository inventoryFoodItemRepository;
    private final InboxMessageRepository inboxMessageRepository;

    @Override
    @Transactional
    public void syncFoodItem(UUID id, String sku, Boolean isAvailable, UUID eventId) {
        if (eventId != null && inboxMessageRepository.existsById(eventId)) {
            log.info("[Inbox Pattern] Event ID: {} already processed for food item sync. Skipping.", eventId);
            return;
        }

        log.info("[Sync FoodItem] Synchronizing food item ID: {}, SKU: {}, Available: {}", id, sku, isAvailable);

        InventoryFoodItem foodItem = inventoryFoodItemRepository.findById(id)
                .orElseGet(() -> InventoryFoodItem.builder()
                        .id(id)
                        .build());

        if (sku != null) {
            foodItem.setSku(sku);
        }
        if (isAvailable != null) {
            foodItem.setAvailable(isAvailable);
        }

        inventoryFoodItemRepository.save(foodItem);

        if (eventId != null) {
            InboxMessage inboxMessage = InboxMessage.builder()
                    .eventId(eventId)
                    .eventType("food.item.synced")
                    .consumer("inventory-service-catalog-consumer")
                    .build();
            inboxMessageRepository.save(inboxMessage);
        }

        log.info("[Sync FoodItem] SUCCESS - Food item ID: {} saved successfully.", id);
    }
}
