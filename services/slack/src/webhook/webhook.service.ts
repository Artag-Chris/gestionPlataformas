import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);
  private readonly signingSecret: string;

  constructor(private readonly config: ConfigService) {
    this.signingSecret = this.config.get<string>('SLACK_SIGNING_SECRET') ?? '';
  }

  /**
   * Verify Slack request signature.
   * https://api.slack.com/authentication/verifying-requests-from-slack
   */
  verifySignature(
    slackSignature: string,
    requestTimestamp: string,
    rawBody: string,
  ): boolean {
    if (!this.signingSecret) return false;

    const fiveMinutesAgo = Math.floor(Date.now() / 1000) - 60 * 5;
    if (Number(requestTimestamp) < fiveMinutesAgo) {
      this.logger.warn('Slack request timestamp too old — possible replay attack');
      return false;
    }

    const sigBasestring = `v0:${requestTimestamp}:${rawBody}`;
    const hmac = crypto.createHmac('sha256', this.signingSecret);
    const mySignature = `v0=${hmac.update(sigBasestring).digest('hex')}`;

    return crypto.timingSafeEqual(
      Buffer.from(mySignature, 'utf8'),
      Buffer.from(slackSignature, 'utf8'),
    );
  }

  processEvent(body: Record<string, unknown>): void {
    const type = body['type'] as string | undefined;
    this.logger.log(`Slack event received: ${type ?? 'unknown'}`);
    // Future: route event types (message, reaction, slash command, etc.)
  }
}
