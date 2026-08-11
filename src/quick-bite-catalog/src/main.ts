import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { GlobalExceptionFilter } from './common/exceptions/global-exception.filter';
import { setupSwagger } from './common/swagger/swagger.config';
import { ResponseInterceptor } from './common/interceptor/response-interceptor';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

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

    app.useGlobalFilters(
        new GlobalExceptionFilter(),
    );

    app.useGlobalInterceptors(
        new ResponseInterceptor(),
    );

    setupSwagger(app, 'Restaurant Service');

    await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
