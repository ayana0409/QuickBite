package com.quickbite.inventory.repository;

import com.quickbite.inventory.entity.InventoryFoodItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface InventoryFoodItemRepository extends JpaRepository<InventoryFoodItem, UUID> {
}
