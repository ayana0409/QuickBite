package com.quickbite.payment.application.port.in;

import com.quickbite.payment.domain.model.PaymentMethod;
import java.math.BigDecimal;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Command object for creating a payment session.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreatePaymentCommand {
    private UUID orderId;
    private UUID customerId;
    private BigDecimal amount;
    private PaymentMethod method;
}
