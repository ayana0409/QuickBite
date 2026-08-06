package com.quickbite.payment.adapter.out.gateway;

import com.quickbite.payment.application.port.out.PaymentGatewayPort;
import com.quickbite.payment.domain.model.Payment;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Mock implementation of PaymentGatewayPort for sandbox demo.
 */
@Component
public class MockPaymentAdapter implements PaymentGatewayPort {

    @Value("${app.payment.frontend-sandbox-url}")
    private String sandboxUrl;

    @Override
    public String generatePaymentUrl(Payment payment) {
        // Constructs a mock sandbox URL for frontend demo simulation
        return String.format("%s?paymentId=%s&orderId=%s&amount=%s",
                sandboxUrl, payment.getId(), payment.getOrderId(), payment.getAmount());
    }
}
