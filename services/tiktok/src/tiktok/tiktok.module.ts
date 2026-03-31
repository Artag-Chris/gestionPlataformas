import { Module } from '@nestjs/common';
import { TikTokService } from './tiktok.service';
import { TikTokListener } from './tiktok.listener';

@Module({
  providers: [TikTokService, TikTokListener],
})
export class TikTokModule {}
