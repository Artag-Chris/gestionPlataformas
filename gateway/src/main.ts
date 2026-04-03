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

  // ⭐ OPCIÓN 1: Middleware para capturar raw body usando express.raw()
  // Este middleware SOLO para la ruta /api/webhooks/slack
  app.use('/api/webhooks/slack', express.raw({ type: 'application/json', limit: '10mb' }));

  // ⭐ Middleware que guarda el raw body ANTES de que express.json() lo parsee
  app.use((req: Request, res: Response, next: NextFunction) => {
    // Si el body es un Buffer (de express.raw), guardarlo como string
    if (Buffer.isBuffer(req.body)) {
      (req as any).rawBody = req.body.toString('utf-8');
      // Importante: resetear body para que express.json() lo parsee
      (req as any)._body = false;
    } else if (typeof req.body === 'string') {
      (req as any).rawBody = req.body;
      (req as any)._body = false;
    }
    next();
  });

  // ⭐ Configurar parsers JSON DESPUÉS del middleware de raw body
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

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

  // ⭐ DEBUG: Middleware para loguear TODOS los requests DESPUÉS de parsing
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
      if ((req as any).rawBody) {
        console.log(`║ Raw Body (first 100 chars): ${(req as any).rawBody.substring(0, 100)}`);
      }
    }
    console.log(`╚════════════════════════════════════════════════════════════╝\n`);

    next();
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  console.log(`Gateway running on port ${port}`);
}

bootstrap();
