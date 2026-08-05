package com.quickbite.inventory.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StockAdjustmentRequest {

    @NotNull(message = "Food Item ID cannot be null")
    private UUID foodItemId;

    @NotNull(message = "Adjustment quantity cannot be null (positive to add, negative to reduce)")
    private Integer adjustmentQuantity;
}
