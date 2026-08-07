package com.quickbite.payment.application.port.in;

import com.quickbite.payment.domain.model.Payment;
import java.util.UUID;

/**
 * Input Port interface defining use cases for processing payments.
 */
public interface ProcessPaymentUseCase {
    Payment createPayment(CreatePaymentCommand command);
    Payment getPaymentById(UUID id);
    Payment getPaymentByOrderId(UUID orderId);
    Payment processMockPayment(UUID paymentId, boolean success, String reason);
    Payment cancelPaymentByOrderId(UUID orderId, String reason);
    Payment refundPaymentByOrderId(UUID orderId, String reason);
}
