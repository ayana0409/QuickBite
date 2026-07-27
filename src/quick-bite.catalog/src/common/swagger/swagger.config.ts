import {
    INestApplication,
} from '@nestjs/common';

import {
    DocumentBuilder,
    SwaggerModule,
} from '@nestjs/swagger';

export function setupSwagger(
    app: INestApplication,
    title: string,
) {

    if (
        process.env.NODE_ENV ===
        'production'
    ) {
        return;
    }

    const config =
        new DocumentBuilder()
            .setTitle(title)
            .setVersion('1.0.0')
            .addBearerAuth()
            .build();


    const document =
        SwaggerModule.createDocument(
            app,
            config,
        );

    SwaggerModule.setup(
        'swagger',
        app,
        document,
    );
}