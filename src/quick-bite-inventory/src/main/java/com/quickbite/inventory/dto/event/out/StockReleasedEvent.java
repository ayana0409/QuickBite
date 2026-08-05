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
public class StockReleasedEvent {
    @Builder.Default
    private String eventType = "stock.released";
    private String orderId;
    private String productId;
    private Integer quantity;
    @Builder.Default
    private String status = "RELEASED";
    private String correlationId;
    @Builder.Default
    private LocalDateTime occurredAt = LocalDateTime.now();
}
