package com.quickbite.inventory.dto.event.in;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StockReservationRequestedEvent {
    private String eventType;       // "saga.stock.reservation.requested" or "order.created"
    private String orderId;
    private String productId;
    private Integer quantity;
    private String correlationId;
    private String tenantId;
}
