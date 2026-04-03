import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { Request, Response, NextFunction } from 'express';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Prefijo global de API
  app.setGlobalPrefix('api');

  // ⭐ Capturar raw body ANTES de JSON parser (para validación de firmas Slack)
  app.use(express.raw({ type: 'application/json', limit: '10mb' }));

  // ⭐ Configurar parsers JSON ANTES de otros middlewares
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

  // ⭐ Middleware para guardar raw body para validación de firmas
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (Buffer.isBuffer(req.body)) {
      (req as any).rawBody = req.body.toString('utf-8');
    } else if (typeof req.body === 'string') {
      (req as any).rawBody = req.body;
    } else if (typeof req.body === 'object' && req.body) {
      (req as any).rawBody = JSON.stringify(req.body);
    }
    next();
  });

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

  // ⭐ MEGA DEBUG: Middleware para loguear TODOS los requests DESPUÉS de parsing
  app.use((req: Request, res: Response, next: NextFunction) => {
    const method = req.method;
    const path = req.path;
    const url = req.url;
    const timestamp = new Date().toISOString();

    console.log(`\n╔════════════════════════════════════════════════════════════╗`);
    console.log(`║ 🌐 INCOMING REQUEST - ${timestamp}`);
    console.log(`╠════════════════════════════════════════════════════════════╣`);
    console.log(`║ Method: ${method}`);
    console.log(`║ Path: ${path}`);
    console.log(`║ Full URL: ${url}`);
    console.log(`║ Headers: ${JSON.stringify(req.headers, null, 2)}`);
    if (method === 'POST' || method === 'PUT') {
      console.log(`║ Body: ${JSON.stringify(req.body, null, 2)}`);
    }
    console.log(`╚════════════════════════════════════════════════════════════╝\n`);

    next();
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  console.log(`Gateway running on port ${port}`);
}

bootstrap();
