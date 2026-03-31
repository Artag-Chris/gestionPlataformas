import { Module } from '@nestjs/common';
import { InstagramService } from './instagram.service';
import { InstagramListener } from './instagram.listener';

@Module({
  providers: [InstagramService, InstagramListener],
})
export class InstagramModule {}
