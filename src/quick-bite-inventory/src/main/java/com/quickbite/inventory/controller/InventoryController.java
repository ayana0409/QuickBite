package com.quickbite.inventory.controller;

import com.quickbite.inventory.dto.request.CreateOrUpdateInventoryRequest;
import com.quickbite.inventory.dto.request.StockAdjustmentRequest;
import com.quickbite.inventory.dto.response.InventoryItemResponse;
import com.quickbite.inventory.service.InventoryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/inventory")
@RequiredArgsConstructor
@Tag(name = "Inventory Management", description = "Endpoints cho Quản lý Tồn kho & Nhập/Xuất kho")
public class InventoryController {

    private final InventoryService inventoryService;

    @GetMapping
    @Operation(summary = "Lấy danh sách tồn kho tất cả sản phẩm", description = "Trả về danh sách tất cả sản phẩm cùng số lượng tồn và số lượng đang giữ.")
    public ResponseEntity<List<InventoryItemResponse>> getAll() {
        return ResponseEntity.ok(inventoryService.getAllInventoryItems());
    }

    @GetMapping("/restaurant/{restaurantId}")
    @Operation(summary = "Lấy danh sách tồn kho theo nhà hàng", description = "Có phân trang, lọc theo category, tìm kiếm theo tên món ăn.")
    public ResponseEntity<org.springframework.data.domain.Page<InventoryItemResponse>> getByRestaurantId(
            @PathVariable UUID restaurantId,
            @RequestParam(required = false) UUID categoryId,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int limit) {
        return ResponseEntity.ok(inventoryService.getInventoryByRestaurant(restaurantId, categoryId, search, page, limit));
    }

    @GetMapping("/{foodItemId}")
    @Operation(summary = "Lấy thông tin tồn kho theo Food Item ID", description = "Trả về chi tiết tồn kho của 1 sản phẩm theo mã foodItemId.")
    public ResponseEntity<InventoryItemResponse> getByFoodItemId(@PathVariable UUID foodItemId) {
        return ResponseEntity.ok(inventoryService.getByFoodItemId(foodItemId));
    }

    @PostMapping
    @Operation(summary = "Nhập kho / Cập nhật số lượng tồn tuyệt đối (CRUD)", description = "Khởi tạo mới hoặc thiết lập lại số lượng tồn kho của sản phẩm.")
    public ResponseEntity<InventoryItemResponse> createOrUpdate(@Valid @RequestBody CreateOrUpdateInventoryRequest request) {
        InventoryItemResponse response = inventoryService.createOrUpdateItem(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/adjust")
    @Operation(summary = "Điều chỉnh cộng/trừ số lượng tồn kho", description = "Cộng thêm (truyền số dương) hoặc giảm bớt (truyền số âm) số lượng tồn kho hiện tại.")
    public ResponseEntity<InventoryItemResponse> adjustStock(@Valid @RequestBody StockAdjustmentRequest request) {
        InventoryItemResponse response = inventoryService.adjustStock(request);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{foodItemId}")
    @Operation(summary = "Xóa mặt hàng khỏi kho", description = "Xóa thông tin quản lý kho của một sản phẩm.")
    public ResponseEntity<Void> deleteByFoodItemId(@PathVariable UUID foodItemId) {
        inventoryService.deleteItemByFoodItemId(foodItemId);
        return ResponseEntity.noContent().build();
    }
}
