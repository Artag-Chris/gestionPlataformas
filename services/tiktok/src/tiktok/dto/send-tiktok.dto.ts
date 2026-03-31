import { IsString, IsArray, IsOptional, ArrayMinSize } from 'class-validator';

export class SendTikTokDto {
  /** Unique message ID from the gateway */
  @IsString()
  messageId: string;

  /**
   * TikTok open_id(s) of the creator(s) to post on behalf of.
   * Each recipient corresponds to one TikTok account.
   */
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  recipients: string[];

  /** Caption / description for the TikTok post */
  @IsString()
  message: string;

  /**
   * Publicly accessible URL of the video to publish.
   * TikTok Content Posting API will fetch the video from this URL.
   */
  @IsString()
  videoUrl: string;

  /** Optional thumbnail/cover image URL */
  @IsOptional()
  @IsString()
  coverUrl?: string | null;

  /**
   * Optional metadata for extended configuration.
   *
   * Supported fields:
   * - `privacy_level`: "PUBLIC_TO_EVERYONE" | "MUTUAL_FOLLOW_FRIENDS" | "SELF_ONLY" (default: "PUBLIC_TO_EVERYONE")
   * - `disable_duet`: boolean (default: false)
   * - `disable_comment`: boolean (default: false)
   * - `disable_stitch`: boolean (default: false)
   * - `video_cover_timestamp_ms`: number — millisecond offset for auto cover
   */
  @IsOptional()
  metadata?: Record<string, unknown> | null;
}
