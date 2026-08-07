package com.quickbite.payment.adapter.out.persistence;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SpringDataPaymentInboxRepository extends JpaRepository<PaymentInboxEntity, UUID> {
    boolean existsByEventId(UUID eventId);
}
