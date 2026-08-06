package com.quickbite.payment.application.port.out;

import com.quickbite.payment.domain.model.Payment;

/**
 * Output Port interface for Payment Gateway integrations (Mock Gateway, MoMo, VNPay, etc.).
 */
public interface PaymentGatewayPort {
    String generatePaymentUrl(Payment payment);
}
