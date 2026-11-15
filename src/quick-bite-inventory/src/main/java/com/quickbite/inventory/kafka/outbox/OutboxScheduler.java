package com.quickbite.inventory.kafka.outbox;

import com.quickbite.inventory.entity.OutboxMessage;
import com.quickbite.inventory.repository.OutboxMessageRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.apache.kafka.common.header.internals.RecordHeader;
import org.springframework.context.annotation.Lazy;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

@Component
@Lazy(false)
@RequiredArgsConstructor
@Slf4j
public class OutboxScheduler {

    private final OutboxMessageRepository outboxMessageRepository;
    private final KafkaTemplate<String, String> kafkaTemplate;

    // NO @Transactional here to prevent holding DB Connection Pool during network I/O
    @Scheduled(initialDelay = 5000, fixedDelay = 1500)
    public void processOutboxMessages() {
        // Step 1: Read pending messages - connection opened and closed in milliseconds
        List<OutboxMessage> pendingMessages = outboxMessageRepository.findTop50ByStatusOrderByCreatedAtAsc("PENDING");

        if (pendingMessages.isEmpty()) {
            return;
        }

        log.debug("[Outbox Scheduler] Found {} PENDING messages to publish.", pendingMessages.size());

        for (OutboxMessage message : pendingMessages) {
            try {
                // ABP Framework and MassTransit expect standard routing key and JSON content type headers
                String key = message.getEventType();
                log.info("[Outbox Scheduler] Publishing event '{}' [ID: {}] to topic '{}'",
                        message.getEventType(), message.getEventId(), message.getTopic());

                ProducerRecord<String, String> record = new ProducerRecord<>(
                        message.getTopic(),
                        key,
                        message.getPayload()
                );
                record.headers().add(new RecordHeader("Content-Type", "application/json".getBytes(StandardCharsets.UTF_8)));
                record.headers().add(new RecordHeader("eventType", message.getEventType().getBytes(StandardCharsets.UTF_8)));
                if (message.getEventId() != null) {
                    record.headers().add(new RecordHeader("eventId", message.getEventId().toString().getBytes(StandardCharsets.UTF_8)));
                }

                // Step 2: Synchronous Kafka send executed OUTSIDE any DB transaction
                // 3s timeout is optimal for low-spec servers to prevent thread hanging
                kafkaTemplate.send(record).get(3, TimeUnit.SECONDS);

                // Step 3: Fast targeted update via @Modifying query (connection held for < 2ms)
                outboxMessageRepository.markAsProcessed(message.getId(), LocalDateTime.now());

            } catch (InterruptedException e) {
                // Restore interrupted status for graceful shutdown
                Thread.currentThread().interrupt();
                log.warn("[Outbox Scheduler] Thread interrupted while sending outbox message ID: {}. Halting current batch.", message.getId());
                break; // Stop immediately on shutdown signal

            } catch (ExecutionException | TimeoutException e) {
                log.error("[Outbox Scheduler] Kafka broker unreachable or timeout for message ID: {}. Error: {}", message.getId(), e.getMessage());
                outboxMessageRepository.recordFailure(message.getId());
                // Fast-fail: if broker has connection issues, do not hang on the rest of the batch
                log.warn("[Outbox Scheduler] Kafka failure detected. Aborting remaining batch to protect resources.");
                break;

            } catch (Exception e) {
                log.error("[Outbox Scheduler] Unexpected error processing message ID: {}", message.getId(), e);
                outboxMessageRepository.recordFailure(message.getId());
            }
        }
    }
}
