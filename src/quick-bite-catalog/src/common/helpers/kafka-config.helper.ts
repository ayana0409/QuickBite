/**
 * Parse Kafka connection string or broker list into kafkajs connection options
 * Supports both standard host:port and Aiven/Cloud connection strings (Host=...;Port=...;Username=...;Password=...)
 */
export function getKafkaConfig(rawBroker: string): {
  brokers: string[];
  ssl: any;
  sasl: any;
} {
  let brokers = [rawBroker || 'localhost:9092'];
  let ssl: any = undefined;
  let sasl: any = undefined;

  if (rawBroker && rawBroker.includes('Host=') && rawBroker.includes('Port=')) {
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

    if (trustServerCert) {
      ssl = { rejectUnauthorized: false };
    } else {
      ssl = true;
    }

    if (username && password) {
      sasl = {
        mechanism: 'scram-sha-512',
        username,
        password,
      };
    }
  }

  return { brokers, ssl, sasl };
}
