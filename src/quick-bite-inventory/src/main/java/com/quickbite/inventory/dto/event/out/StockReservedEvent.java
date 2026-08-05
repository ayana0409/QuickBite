package com.quickbite.inventory.dto.event.out;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StockReservedEvent {
    @Builder.Default
    private String eventType = "stock.reserved";
    private String orderId;
    private String productId;
    private Integer quantity;
    @Builder.Default
    private String status = "SUCCESS";
    private String correlationId;
    @Builder.Default
    private LocalDateTime occurredAt = LocalDateTime.now();
}
