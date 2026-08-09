import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, SASLOptions } from 'kafkajs';
import { HealthCheckEntry } from './database.health';

@Injectable()
export class KafkaHealthService {
  private readonly logger = new Logger(KafkaHealthService.name);

  constructor(private readonly config: ConfigService) {}

  async check(): Promise<HealthCheckEntry> {
    const startTime = Date.now();
    try {
      const rawBroker = this.config.get<string>('KAFKA_BROKER') || 'localhost:9092';
      let brokers = [rawBroker];
      let ssl: any = undefined;
      let sasl: SASLOptions | undefined = undefined;

      if (rawBroker.includes('Host=') && rawBroker.includes('Port=')) {
        const map = new Map<string, string>();
        rawBroker.split(';').forEach((part) => {
          const idx = part.indexOf('=');
          if (idx > -1) {
            const key = part.substring(0, idx).trim().toLowerCase();
            const val = part.substring(idx + 1).trim();
            map.set(key, val);
          }
        });

        const host = map.get('host');
        const port = map.get('port');
        const username = map.get('username');
        const password = map.get('password');
        const trustServerCert = map.get('trust server certificate') === 'true';

        if (host && port) {
          brokers = [`${host}:${port}`];
        }

        ssl = trustServerCert ? { rejectUnauthorized: false } : true;

        if (username && password) {
          sasl = {
            mechanism: 'scram-sha-512',
            username,
            password,
          };
        }
      }

      const kafka = new Kafka({
        clientId: 'catalog-health-check',
        brokers,
        ssl,
        sasl,
        connectionTimeout: 5000,
        requestTimeout: 5000,
      });

      const admin = kafka.admin();
      await admin.connect();
      const topics = await admin.listTopics();
      await admin.disconnect();

      const duration = Date.now() - startTime;
      return {
        status: 'Healthy',
        description: `Kafka connection OK. Active brokers: ${brokers.length}.`,
        data: {
          brokers,
          topic_count: topics.length,
        },
        duration_ms: duration,
        exception: null,
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      this.logger.error('Kafka health check failed', error?.stack || error);
      return {
        status: 'Unhealthy',
        description: 'Kafka cluster connection failed.',
        data: null,
        duration_ms: duration,
        exception: error?.message || String(error),
      };
    }
  }
}
