package com.quickbite.inventory.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "inventory_items", indexes = {
    @Index(name = "idx_inventory_food_item_id", columnList = "food_item_id", unique = true)
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InventoryItem {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "food_item_id", nullable = false, unique = true)
    private UUID foodItemId;

    @Column(name = "quantity", nullable = false)
    @Builder.Default
    private Integer quantity = 0;

    @Column(name = "reserved_quantity", nullable = false)
    @Builder.Default
    private Integer reservedQuantity = 0;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    /**
     * Calculate remaining available quantity in stock.
     */
    public int getAvailableQuantity() {
        return Math.max(0, (quantity != null ? quantity : 0) - (reservedQuantity != null ? reservedQuantity : 0));
    }

    /**
     * Check if there is enough stock for requested quantity.
     */
    public boolean hasEnoughStock(int requestedQty) {
        return getAvailableQuantity() >= requestedQty;
    }

    /**
     * Reserve stock for pending order.
     */
    public void reserveStock(int reqQty) {
        if (!hasEnoughStock(reqQty)) {
            throw new IllegalStateException("Insufficient available stock for food item: " + foodItemId);
        }
        this.reservedQuantity = (this.reservedQuantity != null ? this.reservedQuantity : 0) + reqQty;
    }

    /**
     * Deduct stock directly upon successful confirmation.
     */
    public void confirmDeduct(int reqQty) {
        this.quantity = Math.max(0, (this.quantity != null ? this.quantity : 0) - reqQty);
        this.reservedQuantity = Math.max(0, (this.reservedQuantity != null ? this.reservedQuantity : 0) - reqQty);
    }

    /**
     * Release reserved stock on order cancellation/compensation.
     */
    public void releaseReservedStock(int reqQty) {
        this.reservedQuantity = Math.max(0, (this.reservedQuantity != null ? this.reservedQuantity : 0) - reqQty);
    }
}
