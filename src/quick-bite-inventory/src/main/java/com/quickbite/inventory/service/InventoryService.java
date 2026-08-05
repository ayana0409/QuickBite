package com.quickbite.inventory.service;

import com.quickbite.inventory.dto.request.CreateOrUpdateInventoryRequest;
import com.quickbite.inventory.dto.request.StockAdjustmentRequest;
import com.quickbite.inventory.dto.response.InventoryItemResponse;

import java.util.List;
import java.util.UUID;

public interface InventoryService {

    /**
     * Get all inventory items.
     */
    List<InventoryItemResponse> getAllInventoryItems();

    /**
     * Get inventory item by Food Item ID.
     */
    InventoryItemResponse getByFoodItemId(UUID foodItemId);

    /**
     * Create new or set absolute stock for a food item (Nhập kho).
     */
    InventoryItemResponse createOrUpdateItem(CreateOrUpdateInventoryRequest request);

    /**
     * Adjust (add or subtract) stock quantity.
     */
    InventoryItemResponse adjustStock(StockAdjustmentRequest request);

    /**
     * Delete item by Food Item ID.
     */
    void deleteItemByFoodItemId(UUID foodItemId);

    /**
     * Reserve stock for an order and save result to Outbox (Saga Step 1).
     */
    boolean reserveStock(UUID orderId, UUID foodItemId, int quantity, UUID correlationId, UUID eventId);

    /**
     * Release reserved stock for an order and save result to Outbox (Saga Compensation Step).
     */
    boolean releaseReservedStock(UUID orderId, UUID foodItemId, int quantity, UUID correlationId, UUID eventId);

    /**
     * Confirm final deduction of stock when order is completed.
     */
    boolean confirmStockDeduction(UUID orderId, UUID foodItemId, int quantity, UUID eventId);
}
