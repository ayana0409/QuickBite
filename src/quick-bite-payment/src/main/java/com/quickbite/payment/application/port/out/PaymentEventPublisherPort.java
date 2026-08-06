package com.quickbite.payment.application.port.out;

import com.quickbite.payment.domain.model.Payment;

/**
 * Output Port interface for publishing Payment events to external event stream (Kafka).
 */
public interface PaymentEventPublisherPort {
    void publishPaymentCompleted(Payment payment);
    void publishPaymentFailed(Payment payment);
}
