import { Module } from '@nestjs/common';
import { FacebookService } from './facebook.service';
import { FacebookListener } from './facebook.listener';

@Module({
  providers: [FacebookService, FacebookListener],
})
export class FacebookModule {}
