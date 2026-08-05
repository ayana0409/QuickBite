package com.quickbite.inventory.dto.event.out;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StockReleasedEvent {
    @Builder.Default
    private UUID eventId = UUID.randomUUID();

    @Builder.Default
    private String eventType = "stock.released";

    private UUID orderId;
    private UUID foodItemId;
    private Integer quantity;

    @Builder.Default
    private String status = "RELEASED";

    private UUID correlationId;

    @Builder.Default
    private LocalDateTime occurredAt = LocalDateTime.now();
}
