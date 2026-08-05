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

    @GetMapping("/{productId}")
    @Operation(summary = "Lấy thông tin tồn kho theo Product ID", description = "Trả về chi tiết tồn kho của 1 sản phẩm theo mã productId.")
    public ResponseEntity<InventoryItemResponse> getByProductId(@PathVariable String productId) {
        return ResponseEntity.ok(inventoryService.getByProductId(productId));
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

    @DeleteMapping("/{productId}")
    @Operation(summary = "Xóa mặt hàng khỏi kho", description = "Xóa thông tin quản lý kho của một sản phẩm.")
    public ResponseEntity<Void> deleteByProductId(@PathVariable String productId) {
        inventoryService.deleteItemByProductId(productId);
        return ResponseEntity.noContent().build();
    }
}
