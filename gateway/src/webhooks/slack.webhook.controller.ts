import {
  Controller,
  Post,
  Get,
  Body,
  Headers,
  Logger,
  HttpCode,
  BadRequestException,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import * as crypto from 'crypto';
import { SlackEventRouterService } from '../slack/services/slack-event-router.service';

/**
 * Slack Webhook Controller
 * 
 * Handles incoming Slack Events API webhooks.
 * 
 * Reference: https://api.slack.com/events-api
 * 
 * Flow:
 * 1. Slack sends POST with event data
 * 2. Controller validates HMAC-SHA256 signature
 * 3. Handles url_verification challenge for initial setup
 * 4. Routes event to SlackEventRouterService
 * 5. Returns 200 OK within 3 seconds
 * 
 * Security:
 * - Validates X-Slack-Signature header
 * - Checks X-Slack-Request-Timestamp (within 5 minutes)
 * - Prevents replay attacks
 */
@Controller('webhooks/slack')
export class SlackWebhookController {
  private readonly logger = new Logger(SlackWebhookController.name);
  private readonly signingSecret = process.env.SLACK_SIGNING_SECRET;
  private readonly REQUEST_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

  constructor(
    private readonly slackEventRouter: SlackEventRouterService,
  ) {
    if (!this.signingSecret) {
      this.logger.warn(
        'SLACK_SIGNING_SECRET not configured. Webhook signature validation will be skipped.',
      );
    }
  }

  /**
   * Health check endpoint
   * GET /webhooks/slack
   */
  @Get()
  @HttpCode(200)
  healthCheck(): { ok: boolean; message: string } {
    return { ok: true, message: 'Slack webhook ready' };
  }

  /**
   * Receive and process Slack webhook events
   * POST /webhooks/slack
   * 
   * Handles:
   * 1. url_verification challenge (initial setup handshake)
   * 2. event_callback (actual Slack events)
   */
  @Post()
  @HttpCode(200)
  async receiveEvent(
    @Body() body: Record<string, unknown>,
    @Headers('x-slack-signature') signature: string,
    @Headers('x-slack-request-timestamp') timestamp: string,
    @Req() request: Request,
  ): Promise<Record<string, unknown>> {
    try {
      // Debug log
      this.logger.debug(`=== SLACK WEBHOOK DEBUG ===`);
      this.logger.debug(`Body type: ${typeof body}`);
      this.logger.debug(`Body keys: ${body ? Object.keys(body).join(', ') : 'null'}`);
      this.logger.debug(`Body.type: ${body['type']}`);
      this.logger.debug(`Body.challenge: ${body['challenge']}`);

      // Validate signature if signing secret is configured
      if (this.signingSecret) {
        // Get raw body from request body buffer stored by middleware
        const rawBody =
          (request as any).rawBody || JSON.stringify(body);
        this.logger.debug(`Raw body length: ${rawBody ? rawBody.length : 0}`);
        this.validateSignature(signature, timestamp, rawBody);
      }

      // Log incoming request
      this.logger.log(`Received Slack webhook | type: ${body['type']}`);

      // Handle URL verification challenge
      if (body['type'] === 'url_verification') {
        const challenge = body['challenge'] as string;
        this.logger.log(
          `✓ Slack URL verification challenge | challenge: ${challenge}`,
        );
        // IMPORTANT: Return the challenge value exactly as received
        return { challenge };
      }

      // Handle event callback
      if (body['type'] === 'event_callback') {
        const event = body['event'] as Record<string, unknown>;
        const eventType = event['type'] as string;

        this.logger.log(
          `Processing event [${eventType}] | event_id: ${body['event_id']}`,
        );

        // Route event asynchronously (don't wait for result)
        this.slackEventRouter.routeEvent(eventType, body).catch((error) => {
          this.logger.error(
            `Failed to route event [${eventType}]: ${error instanceof Error ? error.message : String(error)}`,
          );
        });

        return { received: true };
      }

      // Unknown event type
      this.logger.warn(`Unknown Slack event type: ${body['type']}`);
      return { received: false };
    } catch (error) {
      this.logger.error(
        `Webhook error: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  /**
   * Validate HMAC-SHA256 signature from Slack
   * 
   * Reference: https://api.slack.com/authentication/verifying-requests-from-slack
   * 
   * @param signature - X-Slack-Signature header value (v0=abc123...)
   * @param timestamp - X-Slack-Request-Timestamp header value
   * @param rawBody - Raw request body (string)
   * @throws BadRequestException if signature is invalid or timestamp is too old
   */
  private validateSignature(
    signature: string,
    timestamp: string,
    rawBody: string,
  ): void {
    // Validate signature and timestamp are present
    if (!signature || !timestamp) {
      throw new BadRequestException('Missing signature or timestamp header');
    }

    // Extract version and hash from signature (format: v0=hash)
    const [version, hash] = signature.split('=');
    if (version !== 'v0') {
      throw new BadRequestException(`Invalid signature version: ${version}`);
    }

    // Check timestamp is within 5 minutes (prevent replay attacks)
    const requestTime = parseInt(timestamp, 10) * 1000;
    const currentTime = Date.now();
    if (currentTime - requestTime > this.REQUEST_TIMEOUT_MS) {
      throw new BadRequestException('Request timestamp too old (replay attack?)');
    }

    // Compute expected signature
    const signedContent = `v0:${timestamp}:${rawBody}`;
    const expectedHash = crypto
      .createHmac('sha256', this.signingSecret!)
      .update(signedContent)
      .digest('hex');

    // Compare signatures (constant-time comparison)
    if (!crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(expectedHash))) {
      throw new BadRequestException('Invalid signature');
    }

    this.logger.debug('✓ Signature validation passed');
  }
}
