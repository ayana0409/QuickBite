package com.quickbite.inventory.service;

import java.util.UUID;

public interface InventoryFoodItemService {

    /**
     * Synchronize a food item from Catalog service with Inbox pattern idempotency.
     */
    void syncFoodItem(UUID id, String sku, Boolean isAvailable, UUID eventId);
}
