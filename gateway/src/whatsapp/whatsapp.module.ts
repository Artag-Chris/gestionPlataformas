import { Module } from '@nestjs/common';
import { RabbitMQModule } from '../rabbitmq/rabbitmq.module';
import { WhatsappEventRouterService } from './services/whatsapp-event-router.service';

@Module({
  imports: [RabbitMQModule],
  providers: [WhatsappEventRouterService],
  exports: [WhatsappEventRouterService],
})
export class WhatsappModule {}
