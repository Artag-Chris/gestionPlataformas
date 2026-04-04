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

  // ⭐ Middleware que captura el raw body ANTES de parsing
  // Usa express.text() para obtener el body como string
  app.use((req: Request, res: Response, next: NextFunction) => {
    express.text({ limit: '10mb', type: '*/*' })(req, res, () => {
      // En este punto, req.body es texto crudo o undefined
      const rawBody = (req.body as string) || '';
      
      // Guardar raw body para webhook signature validation
      (req as any).rawBody = rawBody;
      
      // Parsear JSON y poner el resultado en req.body
      try {
        (req as any).body = rawBody ? JSON.parse(rawBody) : {};
      } catch (e) {
        (req as any).body = {};
      }
      
      next();
    });
  });
  
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
      const rawBody = (req as any).rawBody;
      if (rawBody && typeof rawBody === 'string') {
        console.log(`║ Raw Body (first 100 chars): ${rawBody.substring(0, 100)}`);
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
