import {
  IsString,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsObject,
  IsIn,
  ArrayMinSize,
} from 'class-validator';

// Canales disponibles - añade aquí cuando agregues nuevos microservicios
const SUPPORTED_CHANNELS = [
  'whatsapp',
  'instagram',
  'slack',
  'notion',
  'tiktok',
  'facebook',
] as const;
export type Channel = (typeof SUPPORTED_CHANNELS)[number];

export class SendMessageDto {
  @IsString()
  @IsIn(SUPPORTED_CHANNELS, {
    message: `channel must be one of: ${SUPPORTED_CHANNELS.join(', ')}`,
  })
  channel: Channel;

  @IsArray()
  @ArrayMinSize(1, { message: 'At least one recipient is required' })
  @IsString({ each: true })
  recipients: string[];

  @IsString()
  @IsNotEmpty()
  message: string;

  @IsOptional()
  @IsString()
  mediaUrl?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>; // info extra de N8N u otros clientes
}
