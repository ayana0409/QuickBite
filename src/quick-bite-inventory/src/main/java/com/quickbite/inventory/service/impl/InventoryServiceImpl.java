package com.quickbite.inventory.service.impl;

import com.quickbite.inventory.dto.request.CreateOrUpdateInventoryRequest;
import com.quickbite.inventory.dto.request.StockAdjustmentRequest;
import com.quickbite.inventory.dto.response.InventoryItemResponse;
import com.quickbite.inventory.entity.InventoryItem;
import com.quickbite.inventory.repository.InventoryItemRepository;
import com.quickbite.inventory.service.InventoryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class InventoryServiceImpl implements InventoryService {

    private final InventoryItemRepository inventoryItemRepository;

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
    public InventoryItemResponse getByProductId(String productId) {
        InventoryItem item = inventoryItemRepository.findByProductId(productId)
                .orElseThrow(() -> new IllegalArgumentException("Inventory item not found for product ID: " + productId));
        return mapToResponse(item);
    }

    @Override
    @Transactional
    public InventoryItemResponse createOrUpdateItem(CreateOrUpdateInventoryRequest request) {
        log.info("Creating/Updating inventory for product: {}, quantity: {}", request.getProductId(), request.getQuantity());
        InventoryItem item = inventoryItemRepository.findByProductId(request.getProductId())
                .orElseGet(() -> InventoryItem.builder()
                        .productId(request.getProductId())
                        .reservedQuantity(0)
                        .build());

        item.setQuantity(request.getQuantity());
        InventoryItem savedItem = inventoryItemRepository.save(item);
        return mapToResponse(savedItem);
    }

    @Override
    @Transactional
    public InventoryItemResponse adjustStock(StockAdjustmentRequest request) {
        log.info("Adjusting stock for product: {}, adjustment: {}", request.getProductId(), request.getAdjustmentQuantity());
        InventoryItem item = inventoryItemRepository.findByProductIdWithLock(request.getProductId())
                .orElseThrow(() -> new IllegalArgumentException("Inventory item not found for product ID: " + request.getProductId()));

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
    public void deleteItemByProductId(String productId) {
        log.info("Deleting inventory item for product: {}", productId);
        InventoryItem item = inventoryItemRepository.findByProductId(productId)
                .orElseThrow(() -> new IllegalArgumentException("Inventory item not found for product ID: " + productId));
        inventoryItemRepository.delete(item);
    }

    @Override
    @Transactional
    public boolean reserveStock(String orderId, String productId, int quantity) {
        log.info("[Saga Reserve] Request to reserve stock. OrderId: {}, ProductId: {}, Qty: {}", orderId, productId, quantity);
        Optional<InventoryItem> optionalItem = inventoryItemRepository.findByProductIdWithLock(productId);

        if (optionalItem.isEmpty()) {
            log.warn("[Saga Reserve] FAILED - Product ID: {} not found in inventory", productId);
            return false;
        }

        InventoryItem item = optionalItem.get();
        if (!item.hasEnoughStock(quantity)) {
            log.warn("[Saga Reserve] FAILED - Insufficient stock for product: {}. Available: {}, Requested: {}",
                    productId, item.getAvailableQuantity(), quantity);
            return false;
        }

        item.reserveStock(quantity);
        inventoryItemRepository.save(item);
        log.info("[Saga Reserve] SUCCESS - Reserved {} units for order: {}", quantity, orderId);
        return true;
    }

    @Override
    @Transactional
    public boolean releaseReservedStock(String orderId, String productId, int quantity) {
        log.info("[Saga Release] Request to release reserved stock. OrderId: {}, ProductId: {}, Qty: {}", orderId, productId, quantity);
        Optional<InventoryItem> optionalItem = inventoryItemRepository.findByProductIdWithLock(productId);

        if (optionalItem.isEmpty()) {
            log.warn("[Saga Release] Product ID: {} not found during compensation", productId);
            return false;
        }

        InventoryItem item = optionalItem.get();
        item.releaseReservedStock(quantity);
        inventoryItemRepository.save(item);
        log.info("[Saga Release] SUCCESS - Released {} units for order: {}", quantity, orderId);
        return true;
    }

    @Override
    @Transactional
    public boolean confirmStockDeduction(String orderId, String productId, int quantity) {
        log.info("[Saga Confirm] Request to confirm stock deduction. OrderId: {}, ProductId: {}, Qty: {}", orderId, productId, quantity);
        Optional<InventoryItem> optionalItem = inventoryItemRepository.findByProductIdWithLock(productId);

        if (optionalItem.isEmpty()) {
            log.warn("[Saga Confirm] Product ID: {} not found", productId);
            return false;
        }

        InventoryItem item = optionalItem.get();
        item.confirmDeduct(quantity);
        inventoryItemRepository.save(item);
        log.info("[Saga Confirm] SUCCESS - Deducted {} units for order: {}", quantity, orderId);
        return true;
    }

    private InventoryItemResponse mapToResponse(InventoryItem item) {
        return InventoryItemResponse.builder()
                .id(item.getId())
                .productId(item.getProductId())
                .quantity(item.getQuantity())
                .reservedQuantity(item.getReservedQuantity())
                .availableQuantity(item.getAvailableQuantity())
                .createdAt(item.getCreatedAt())
                .updatedAt(item.getUpdatedAt())
                .build();
    }
}
