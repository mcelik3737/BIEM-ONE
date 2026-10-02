import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/v1');
  app.enableCors();
  app.useGlobalPipes(
    new ValidationPipe({
      exceptionFactory: (errors) =>
        new BadRequestException(
          errors.map((error) => {
            const labels: Record<string, string> = {
              name: 'Firma / iş adı',
              quantity: 'Miktar',
              estimatedUnitCost: 'Tahmini birim maliyet',
              unitPrice: 'Birim fiyat',
              taxRate: 'KDV oranı',
              currency: 'Para birimi',
              email: 'E-posta',
              items: 'Sipariş kalemleri',
              companyId: 'Şirket',
              description: 'Açıklama',
            };
            return `${labels[error.property] ?? error.property}: geçerli bir değer girin; eksik, biçimi hatalı veya izin verilmeyen alan.`;
          }),
        ),
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('BIEM ONE API')
    .setDescription('Business operations platform API for Biem Teknoloji')
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      'access-token',
    )
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, swaggerDocument);

  await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();
