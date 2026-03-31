import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { SendTikTokDto } from './dto/send-tiktok.dto';
import { TikTokResponseDto } from './dto/tiktok-response.dto';
import { v4 as uuidv4 } from 'uuid';

interface TikTokInitResponse {
  data: {
    publish_id: string;
    upload_url?: string;
  };
  error: {
    code: string;
    message: string;
    log_id: string;
  };
}

@Injectable()
export class TikTokService {
  private readonly logger = new Logger(TikTokService.name);
  private readonly accessToken: string;
  private readonly apiBase = 'https://open.tiktokapis.com/v2';

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.accessToken = config.getOrThrow<string>('TIKTOK_ACCESS_TOKEN');
  }

  async sendToRecipients(dto: SendTikTokDto): Promise<TikTokResponseDto> {
    const results = await Promise.allSettled(
      dto.recipients.map((recipient) =>
        this.postForOne(dto.messageId, recipient, dto),
      ),
    );

    const errors = results
      .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
      .map((r, i) => ({
        recipient: dto.recipients[i],
        reason: r.reason instanceof Error ? r.reason.message : String(r.reason),
      }));

    const sentCount = results.filter((r) => r.status === 'fulfilled').length;
    const failedCount = errors.length;

    return {
      messageId: dto.messageId,
      // TikTok video publishing is async — always starts as PROCESSING
      status: this.resolveStatus(sentCount, failedCount),
      sentCount,
      failedCount,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString(),
    };
  }

  private async postForOne(
    messageId: string,
    recipient: string,
    dto: SendTikTokDto,
  ): Promise<void> {
    const record = await this.prisma.tikTokPost.create({
      data: {
        id: uuidv4(),
        messageId,
        recipient,
        caption: dto.message,
        videoUrl: dto.videoUrl,
        coverUrl: dto.coverUrl ?? null,
        status: 'PROCESSING',
      },
    });

    try {
      const metadata = dto.metadata ?? {};
      const payload = {
        post_info: {
          title: dto.message,
          privacy_level: (metadata['privacy_level'] as string) ?? 'PUBLIC_TO_EVERYONE',
          disable_duet: (metadata['disable_duet'] as boolean) ?? false,
          disable_comment: (metadata['disable_comment'] as boolean) ?? false,
          disable_stitch: (metadata['disable_stitch'] as boolean) ?? false,
          ...(dto.coverUrl ? {} : {}), // cover is set via video_cover_timestamp_ms if provided
          ...(metadata['video_cover_timestamp_ms'] !== undefined
            ? { video_cover_timestamp_ms: metadata['video_cover_timestamp_ms'] }
            : {}),
        },
        source_info: {
          source: 'PULL_FROM_URL',
          video_url: dto.videoUrl,
          ...(dto.coverUrl ? { cover_url: dto.coverUrl } : {}),
        },
      };

      const response = await axios.post<TikTokInitResponse>(
        `${this.apiBase}/post/publish/video/init/`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json; charset=UTF-8',
          },
        },
      );

      if (response.data.error?.code && response.data.error.code !== 'ok') {
        throw new Error(
          `TikTok API error: ${response.data.error.code} — ${response.data.error.message}`,
        );
      }

      const publishId = response.data.data?.publish_id;

      await this.prisma.tikTokPost.update({
        where: { id: record.id },
        data: {
          status: 'PROCESSING',
          publishId: publishId ?? null,
          sentAt: new Date(),
        },
      });

      this.logger.log(`Submitted to TikTok for ${recipient} | publishId: ${publishId}`);
    } catch (error) {
      const reason = this.extractError(error);

      await this.prisma.tikTokPost.update({
        where: { id: record.id },
        data: { status: 'FAILED', errorReason: reason },
      });

      this.logger.error(`Failed to post for ${recipient}: ${reason}`);
      throw new Error(reason);
    }
  }

  private resolveStatus(
    sent: number,
    failed: number,
  ): 'PROCESSING' | 'PUBLISHED' | 'FAILED' | 'PARTIAL' {
    if (failed === 0) return 'PROCESSING';
    if (sent === 0) return 'FAILED';
    return 'PARTIAL';
  }

  private extractError(error: unknown): string {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ error?: { message?: string } }>;
      return (
        axiosError.response?.data?.error?.message ?? axiosError.message
      );
    }
    return error instanceof Error ? error.message : String(error);
  }
}
