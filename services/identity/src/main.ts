import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { RabbitMQService } from './rabbitmq/rabbitmq.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Connect to RabbitMQ
  const rabbitmqService = app.get(RabbitMQService);
  await rabbitmqService.connect();

  // Keep the service running for consuming messages
  await app.listen(3010);
  console.log('Identity Service running on port 3010');
}

bootstrap().catch((error) => {
  console.error('Failed to start Identity Service:', error);
  process.exit(1);
});
