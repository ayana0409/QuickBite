package com.quickbite.inventory.repository;

import com.quickbite.inventory.entity.InventoryItem;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface InventoryItemRepository extends JpaRepository<InventoryItem, UUID> {

    /**
     * Find item by Food Item ID.
     */
    Optional<InventoryItem> findByFoodItemId(UUID foodItemId);

    /**
     * Find item by Food Item ID with pessimistic write lock for thread-safe stock reservation under high concurrency.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT i FROM InventoryItem i WHERE i.foodItemId = :foodItemId")
    Optional<InventoryItem> findByFoodItemIdWithLock(@Param("foodItemId") UUID foodItemId);

    @Query("SELECT new com.quickbite.inventory.dto.response.InventoryItemResponse(" +
           "i.id, i.foodItemId, f.name, i.quantity, i.reservedQuantity, (i.quantity - i.reservedQuantity), i.createdAt, i.updatedAt) " +
           "FROM InventoryItem i JOIN InventoryFoodItem f ON i.foodItemId = f.id " +
           "WHERE f.restaurantId = :restaurantId " +
           "AND (:categoryId IS NULL OR f.categoryId = :categoryId) " +
           "AND (:name IS NULL OR LOWER(f.name) LIKE LOWER(CONCAT('%', :name, '%')))")
    org.springframework.data.domain.Page<com.quickbite.inventory.dto.response.InventoryItemResponse> findInventoryByRestaurant(
           @Param("restaurantId") UUID restaurantId, 
           @Param("categoryId") UUID categoryId, 
           @Param("name") String name, 
           org.springframework.data.domain.Pageable pageable);
}
