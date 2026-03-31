import { Global, Module } from '@nestjs/common';
import { RabbitMQService } from './rabbitmq.service';

@Global() // disponible en toda la app sin necesidad de importar en cada módulo
@Module({
  providers: [RabbitMQService],
  exports: [RabbitMQService],
})
export class RabbitMQModule {}
