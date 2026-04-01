import { Module } from '@nestjs/common';
import { InstagramService } from './instagram.service';
import { InstagramListener } from './instagram.listener';
import { InstagramController } from './instagram.controller';

@Module({
  controllers: [InstagramController],
  providers: [InstagramService, InstagramListener],
})
export class InstagramModule {}
