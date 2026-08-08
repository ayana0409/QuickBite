import { Serializer } from '@nestjs/microservices';
import * as crypto from 'crypto';

/**
 * ABP Framework Kafka Message Serializer
 *
 * Converts NestJS Microservices Kafka payloads into the format expected by Volo.Abp.EventBus.Kafka:
 *   - Key: Event Name string (used by ABP for handler routing)
 *   - Value: UTF-8 JSON bytes of ETO (Event Transfer Object) properties
 *   - Headers: messageId (Guid string in 'N' format without hyphens for Inbox deduplication)
 */
export class AbpKafkaSerializer implements Serializer {
  serialize(kafkaData: any) {
    if (!kafkaData || !kafkaData.value) {
      return kafkaData;
    }

    const payload = kafkaData.value;
    const eventName: string = payload.eventName || kafkaData.key;

    // If payload contains explicit eto property, use it; otherwise exclude eventName
    let etoData: any;
    if (payload.eto) {
      etoData = payload.eto;
    } else {
      const { eventName: _, ...rest } = payload;
      etoData = rest;
    }

    return {
      key: eventName,
      value: Buffer.from(JSON.stringify(etoData), 'utf-8'),
      headers: {
        messageId: crypto.randomUUID().replace(/-/g, ''),
      },
    };
  }
}
