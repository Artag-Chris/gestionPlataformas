import { Module } from '@nestjs/common';
import { SlackService } from './slack.service';
import { SlackListener } from './slack.listener';
import { SlackEventHandlerService } from './services/slack-event-handler.service';

@Module({
  providers: [SlackService, SlackListener, SlackEventHandlerService],
  exports: [SlackService],
})
export class SlackModule {}
