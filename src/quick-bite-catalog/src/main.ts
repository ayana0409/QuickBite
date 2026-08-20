import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { GlobalExceptionFilter } from './common/exceptions/global-exception.filter';
import { setupSwagger } from './common/swagger/swagger.config';
import { ResponseInterceptor } from './common/interceptor/response-interceptor';
import { getKafkaConfig } from './common/helpers/kafka-config.helper';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new GlobalExceptionFilter());

  app.useGlobalInterceptors(new ResponseInterceptor());

  setupSwagger(app, 'Restaurant Service');

  // Connect Kafka Microservice Consumer for events (order-events topic, etc.)
  const rawBroker = configService.get<string>('KAFKA_BROKER') || 'localhost:9092';
  const { brokers, ssl, sasl } = getKafkaConfig(rawBroker);

  try {
    app.connectMicroservice<MicroserviceOptions>({
      transport: Transport.KAFKA,
      options: {
        client: {
          clientId: 'catalog-service-consumer',
          brokers,
          ssl,
          sasl,
          retry: {
            initialRetryTime: 300,
            retries: 10,
            maxRetryTime: 30000,
            factor: 2,
          },
          connectionTimeout: 10000,
          requestTimeout: 30000,
        },
        consumer: {
          groupId: 'catalog-service-group',
          allowAutoTopicCreation: true,
        },
      },
    });

    await app.startAllMicroservices();
    logger.log('Kafka microservice consumer started successfully.');
  } catch (error) {
    logger.error('Failed to start Kafka microservice consumer:', error);
  }

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
