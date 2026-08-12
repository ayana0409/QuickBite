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
           "COALESCE(i.id, f.id), f.id, f.name, COALESCE(i.quantity, 0), COALESCE(i.reservedQuantity, 0), " +
           "(COALESCE(i.quantity, 0) - COALESCE(i.reservedQuantity, 0)), i.createdAt, i.updatedAt) " +
           "FROM InventoryFoodItem f LEFT JOIN InventoryItem i ON f.id = i.foodItemId " +
           "WHERE f.restaurantId = :restaurantId " +
           "AND (:hasCategoryId = false OR f.categoryId = :categoryId) " +
           "AND LOWER(f.name) LIKE LOWER(CONCAT('%', :name, '%'))")
    org.springframework.data.domain.Page<com.quickbite.inventory.dto.response.InventoryItemResponse> findInventoryByRestaurant(
           @Param("restaurantId") UUID restaurantId, 
           @Param("hasCategoryId") boolean hasCategoryId,
           @Param("categoryId") UUID categoryId, 
           @Param("name") String name, 
           org.springframework.data.domain.Pageable pageable);
}
