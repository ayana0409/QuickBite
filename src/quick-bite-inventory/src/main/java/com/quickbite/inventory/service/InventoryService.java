package com.quickbite.inventory.service;

import com.quickbite.inventory.dto.request.CreateOrUpdateInventoryRequest;
import com.quickbite.inventory.dto.request.StockAdjustmentRequest;
import com.quickbite.inventory.dto.response.InventoryItemResponse;

import java.util.List;

public interface InventoryService {

    /**
     * Get all inventory items.
     */
    List<InventoryItemResponse> getAllInventoryItems();

    /**
     * Get inventory item by Product ID.
     */
    InventoryItemResponse getByProductId(String productId);

    /**
     * Create new or set absolute stock for a product (Nhập kho).
     */
    InventoryItemResponse createOrUpdateItem(CreateOrUpdateInventoryRequest request);

    /**
     * Adjust (add or subtract) stock quantity.
     */
    InventoryItemResponse adjustStock(StockAdjustmentRequest request);

    /**
     * Delete item by Product ID.
     */
    void deleteItemByProductId(String productId);

    /**
     * Reserve stock for an order (Saga Step 1).
     * @return true if reserved successfully, false if insufficient stock or product not found.
     */
    boolean reserveStock(String orderId, String productId, int quantity);

    /**
     * Release reserved stock for an order (Saga Compensation Step).
     */
    boolean releaseReservedStock(String orderId, String productId, int quantity);

    /**
     * Confirm final deduction of stock when order is completed.
     */
    boolean confirmStockDeduction(String orderId, String productId, int quantity);
}
