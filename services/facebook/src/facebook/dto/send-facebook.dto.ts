import { IsString, IsArray, IsOptional, ArrayMinSize } from 'class-validator';

export class SendFacebookDto {
  /** Unique message ID from the gateway */
  @IsString()
  messageId: string;

  /**
   * Facebook Page-Scoped User IDs (PSID) to send the message to.
   * These are the IDs of the people who have interacted with your Page.
   */
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  recipients: string[];

  /** Text content of the message */
  @IsString()
  message: string;

  /** Optional media URL (image). When provided, sends an image attachment. */
  @IsOptional()
  @IsString()
  mediaUrl?: string | null;

  /**
   * Optional metadata for extended configuration.
   *
   * Supported fields:
   * - `messaging_type`: "RESPONSE" | "UPDATE" | "MESSAGE_TAG" (default: "RESPONSE")
   * - `tag`: required when messaging_type is "MESSAGE_TAG"
   *    e.g., "CONFIRMED_EVENT_UPDATE", "POST_PURCHASE_UPDATE", "ACCOUNT_UPDATE"
   */
  @IsOptional()
  metadata?: Record<string, unknown> | null;
}
