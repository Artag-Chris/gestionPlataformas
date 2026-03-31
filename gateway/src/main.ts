import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Prefijo global de API
  app.setGlobalPrefix('api');

  // Validación automática de DTOs en todos los endpoints
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,       // elimina propiedades no declaradas en el DTO
      forbidNonWhitelisted: true,
      transform: true,       // transforma tipos automáticamente
    }),
  );

  // Filtro global de excepciones HTTP
  app.useGlobalFilters(new HttpExceptionFilter());

  // Interceptor de logging global
  app.useGlobalInterceptors(new LoggingInterceptor());

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  console.log(`Gateway running on port ${port}`);
}

bootstrap();
