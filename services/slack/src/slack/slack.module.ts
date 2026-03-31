import { Module } from '@nestjs/common';
import { SlackService } from './slack.service';
import { SlackListener } from './slack.listener';

@Module({
  providers: [SlackService, SlackListener],
  exports: [SlackService],
})
export class SlackModule {}
