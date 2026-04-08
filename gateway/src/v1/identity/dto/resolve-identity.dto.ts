import { IsString, IsOptional, IsEmail, IsObject, IsNumber, Min, Max } from 'class-validator';

export class ResolveIdentityDto {
  @IsString()
  channel: string;

  @IsString()
  channelUserId: string;

  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  trustScore?: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
