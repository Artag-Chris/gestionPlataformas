import { Module } from '@nestjs/common';
import { RabbitMQModule } from '../rabbitmq/rabbitmq.module';
import { NotionEventRouterService } from './services/notion-event-router.service';

@Module({
  imports: [RabbitMQModule],
  providers: [NotionEventRouterService],
  exports: [NotionEventRouterService],
})
export class NotionModule {}
