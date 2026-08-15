package com.quickbite.payment.adapter.out.messaging;

import com.quickbite.payment.adapter.out.persistence.PaymentOutboxEntity;
import com.quickbite.payment.adapter.out.persistence.SpringDataPaymentOutboxRepository;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Scheduler worker reading PENDING messages from payment_outbox_messages table
 * and publishing them to Kafka topic.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PaymentOutboxScheduler {

    private final SpringDataPaymentOutboxRepository outboxRepository;
    private final KafkaTemplate<String, String> kafkaTemplate;

    @Value("${app.kafka.topics.publish:fulfillment-events}")
    private String topicName;

    @Scheduled(initialDelay = 30000, fixedDelay = 3000)
    @Transactional
    public void processOutboxMessages() {
        List<PaymentOutboxEntity> pendingMessages = outboxRepository.findTop50ByStatusOrderByCreatedAtAsc("PENDING");
        if (pendingMessages.isEmpty()) {
            return;
        }

        log.info("Processing {} pending Outbox messages...", pendingMessages.size());

        for (PaymentOutboxEntity message : pendingMessages) {
            try {
                kafkaTemplate.send(topicName, message.getMessageKey(), message.getPayload());
                message.setStatus("PROCESSED");
                message.setProcessedAt(LocalDateTime.now());
                outboxRepository.save(message);
                log.info("Outbox message eventId {} published to topic {}", message.getEventId(), topicName);
            } catch (Exception e) {
                log.error("Failed to publish Outbox message eventId {}", message.getEventId(), e);
                message.setStatus("FAILED");
                outboxRepository.save(message);
            }
        }
    }
}
