import { IsString, IsArray, IsNotEmpty, IsOptional, ArrayMinSize } from 'class-validator';

export class SendSlackDto {
  @IsString()
  @IsNotEmpty()
  messageId: string;

  /**
   * recipients: can be Slack channel IDs (e.g. "C0XXXXXXX") or user IDs ("U0XXXXXXX").
   * Using channel/user IDs is recommended over display names for reliability.
   */
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  recipients: string[];

  @IsString()
  @IsNotEmpty()
  message: string;

  @IsOptional()
  @IsString()
  mediaUrl?: string | null;

  @IsOptional()
  metadata?: Record<string, unknown>;
}
