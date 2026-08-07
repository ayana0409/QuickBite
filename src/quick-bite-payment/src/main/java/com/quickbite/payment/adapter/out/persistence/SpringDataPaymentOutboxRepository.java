package com.quickbite.payment.adapter.out.persistence;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SpringDataPaymentOutboxRepository extends JpaRepository<PaymentOutboxEntity, UUID> {
    List<PaymentOutboxEntity> findTop50ByStatusOrderByCreatedAtAsc(String status);
}
