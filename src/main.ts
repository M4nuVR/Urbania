import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // whitelist + forbidNonWhitelisted: rechaza campos extra en el body
  // (por ejemplo, un `status` o `changedBy` enviado por el cliente).
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Urbania API')
    .setDescription('Reportes ciudadanos y su atención')
    .setVersion('0.0.1')
    .addBearerAuth()
    .addGlobalParameters({
      name: 'x-user-id',
      in: 'header',
      required: false,
      description:
        'Solo desarrollo (DEV_AUTH=true): UUID del usuario que actúa',
    })
    .build();
  SwaggerModule.setup(
    'docs',
    app,
    SwaggerModule.createDocument(app, swaggerConfig),
  );

  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
