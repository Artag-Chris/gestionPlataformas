import { Module } from '@nestjs/common';
import { InstagramService } from './instagram.service';
import { InstagramListener } from './instagram.listener';
import { InstagramController, InstagramSendController } from './instagram.controller';

@Module({
  controllers: [InstagramController, InstagramSendController],
  providers: [InstagramService, InstagramListener],
})
export class InstagramModule {}
