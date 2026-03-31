import { Controller, Post, Get, Body, Headers, Logger, HttpCode } from '@nestjs/common';
import { WebhookService } from './webhook.service';

@Controller('webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(private readonly webhookService: WebhookService) {}

  /**
   * Slack URL verification challenge (used when first configuring the Events API).
   * Also handles all incoming Slack events.
   *
   * POST /webhook/slack
   */
  @Post('slack')
  @HttpCode(200)
  receiveEvent(
    @Body() body: Record<string, unknown>,
    @Headers('x-slack-signature') signature: string,
    @Headers('x-slack-request-timestamp') timestamp: string,
  ): Record<string, unknown> {
    // Handle Slack URL verification challenge
    if (body['type'] === 'url_verification') {
      return { challenge: body['challenge'] };
    }

    this.webhookService.processEvent(body);
    return { received: true };
  }

  /**
   * Health check endpoint.
   * GET /webhook/slack
   */
  @Get('slack')
  healthCheck(): { ok: boolean } {
    return { ok: true };
  }
}
