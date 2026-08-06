package com.quickbite.payment.application.port.out;

import com.quickbite.payment.domain.model.Payment;
import java.util.Optional;
import java.util.UUID;

/**
 * Output Port interface for Payment persistence operations.
 */
public interface PaymentPersistencePort {
    Payment save(Payment payment);
    Optional<Payment> findById(UUID id);
    Optional<Payment> findByOrderId(UUID orderId);
}
