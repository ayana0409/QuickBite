package com.quickbite.payment.application.dto;

import java.math.BigDecimal;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Event Transfer Object received when an Order is created and awaiting payment.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderWaitingPaymentEto {
    private UUID orderId;
    private UUID customerId;
    private BigDecimal totalAmount;
    private String paymentMethod;
}
