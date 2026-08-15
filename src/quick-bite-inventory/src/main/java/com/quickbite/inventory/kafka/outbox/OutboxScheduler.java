package com.quickbite.inventory.kafka.outbox;

import com.quickbite.inventory.entity.OutboxMessage;
import com.quickbite.inventory.repository.OutboxMessageRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class OutboxScheduler {

    private final OutboxMessageRepository outboxMessageRepository;
    private final KafkaTemplate<String, String> kafkaTemplate;

    @Scheduled(initialDelay = 30000, fixedDelay = 3000)
    @Transactional
    public void processOutboxMessages() {
        List<OutboxMessage> pendingMessages = outboxMessageRepository.findTop50ByStatusOrderByCreatedAtAsc("PENDING");

        if (pendingMessages.isEmpty()) {
            return;
        }

        log.debug("[Outbox Scheduler] Found {} PENDING messages to publish.", pendingMessages.size());

        for (OutboxMessage message : pendingMessages) {
            try {
                // ABP Framework expects the Event Name as the Kafka key for routing
                String key = message.getEventType();
                log.info("[Outbox Scheduler] Publishing event '{}' [ID: {}] to topic '{}'",
                        message.getEventType(), message.getEventId(), message.getTopic());

                kafkaTemplate.send(message.getTopic(), key, message.getPayload())
                        .whenComplete((result, ex) -> {
                            if (ex != null) {
                                log.error("[Outbox Scheduler] Failed to publish outbox message ID: {}", message.getId(),
                                        ex);
                            }
                        });

                message.setStatus("PROCESSED");
                message.setProcessedAt(LocalDateTime.now());
                outboxMessageRepository.save(message);

            } catch (Exception e) {
                log.error("[Outbox Scheduler] Error processing message ID: {}", message.getId(), e);
                message.setRetryCount(message.getRetryCount() + 1);
                if (message.getRetryCount() >= 5) {
                    message.setStatus("FAILED");
                }
                outboxMessageRepository.save(message);
            }
        }
    }
}
