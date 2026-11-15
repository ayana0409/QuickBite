package com.quickbite.inventory.repository;

import com.quickbite.inventory.entity.OutboxMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface OutboxMessageRepository extends JpaRepository<OutboxMessage, UUID> {

    List<OutboxMessage> findTop50ByStatusOrderByCreatedAtAsc(String status);

    @Modifying
    @Transactional
    @Query("UPDATE OutboxMessage m SET m.status = 'PROCESSED', m.processedAt = :processedAt WHERE m.id = :id")
    int markAsProcessed(@Param("id") UUID id, @Param("processedAt") LocalDateTime processedAt);

    @Modifying
    @Transactional
    @Query("UPDATE OutboxMessage m SET m.retryCount = m.retryCount + 1, m.status = CASE WHEN m.retryCount + 1 >= 5 THEN 'FAILED' ELSE m.status END WHERE m.id = :id")
    int recordFailure(@Param("id") UUID id);
}
