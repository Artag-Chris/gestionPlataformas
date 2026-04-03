import { Module } from '@nestjs/common';
import { SlackEventRouterService } from './services/slack-event-router.service';

@Module({
  providers: [SlackEventRouterService],
  exports: [SlackEventRouterService],
})
export class SlackModule {}
