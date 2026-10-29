import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  if (process.env.NODE_ENV !== 'test' && !process.env.DATABASE_URL) {
    throw new Error('Define DATABASE_URL para iniciar Urbania');
  }

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
    .setDescription(
      'API de reportes urbanos, ubicacion, evidencias, atencion y notificaciones',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addGlobalParameters({
      name: 'x-user-id',
      in: 'header',
      required: false,
      description: 'Solo desarrollo (DEV_AUTH=true): UUID del usuario que actua',
    })
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();
