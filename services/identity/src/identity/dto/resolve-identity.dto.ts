import { IsString, IsOptional, IsUUID, IsEmail, IsPhoneNumber, IsObject, IsNumber, Min, Max } from 'class-validator';

/// DTO for resolving/creating an identity
export class ResolveIdentityDto {
  /// Channel name (whatsapp, instagram, slack, email, etc)
  @IsString()
  channel: string;

  /// User ID from the channel
  @IsString()
  channelUserId: string;

  /// Display name as provided by channel
  @IsOptional()
  @IsString()
  displayName?: string;

  /// Phone number (optional, used for matching)
  @IsOptional()
  @IsString()
  phone?: string;

  /// Email address (optional, used for matching)
  @IsOptional()
  @IsEmail()
  email?: string;

  /// Username/handle (optional, used for matching)
  @IsOptional()
  @IsString()
  username?: string;

  /// Avatar/profile picture URL
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  /// Trust score for the identity (0.0-1.0)
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  trustScore?: number;

  /// Additional metadata
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
