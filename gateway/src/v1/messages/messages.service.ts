import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RabbitMQService } from '../../rabbitmq/rabbitmq.service';
import { ROUTING_KEYS } from '../../rabbitmq/constants/queues';
import { SendMessageDto, Channel } from './dto/send-message.dto';
import { MessageResponseDto } from './dto/message-response.dto';
import { v4 as uuidv4 } from 'uuid';

// Mapa de canal → routing key para enrutamiento escalable
const CHANNEL_ROUTING_KEY: Record<Channel, string> = {
  whatsapp: ROUTING_KEYS.WHATSAPP_SEND,
  instagram: ROUTING_KEYS.INSTAGRAM_SEND,
  slack: ROUTING_KEYS.SLACK_SEND,
  notion: ROUTING_KEYS.NOTION_SEND,
  tiktok: ROUTING_KEYS.TIKTOK_SEND,
  facebook: ROUTING_KEYS.FACEBOOK_SEND,
};

@Injectable()
export class MessagesService {
  private readonly logger = new Logger(MessagesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly rabbitmq: RabbitMQService,
  ) {}

  async send(dto: SendMessageDto): Promise<MessageResponseDto> {
    const routingKey = CHANNEL_ROUTING_KEY[dto.channel];

    if (!routingKey) {
      throw new BadRequestException(`Unsupported channel: ${dto.channel}`);
    }

    // Persistir el mensaje con estado PENDING antes de publicar
    const message = await this.prisma.message.create({
      data: {
        id: uuidv4(),
        channel: dto.channel,
        recipients: dto.recipients,
        body: dto.message,
        metadata: (dto.metadata ?? {}) as Prisma.InputJsonValue,
        status: 'PENDING',
      },
    });

    // Publicar al exchange → microservicio correspondiente
    this.rabbitmq.publish(routingKey, {
      messageId: message.id,
      recipients: dto.recipients,
      message: dto.message,
      mediaUrl: dto.mediaUrl ?? null,
      metadata: dto.metadata ?? {},
    });

    this.logger.log(
      `Message ${message.id} queued → channel [${dto.channel}] | recipients: ${dto.recipients.length}`,
    );

    return {
      id: message.id,
      accepted: true,
      channel: message.channel,
      recipients: message.recipients,
      message: message.body,
      status: message.status as MessageResponseDto['status'],
      createdAt: message.createdAt,
    };
  }

  async findOne(id: string): Promise<MessageResponseDto | null> {
    const message = await this.prisma.message.findUnique({ where: { id } });

    if (!message) return null;

    return {
      id: message.id,
      accepted: true,
      channel: message.channel,
      recipients: message.recipients,
      message: message.body,
      status: message.status as MessageResponseDto['status'],
      createdAt: message.createdAt,
    };
  }

  async updateStatus(messageId: string, status: string): Promise<void> {
    await this.prisma.message.update({
      where: { id: messageId },
      data: { status: status as never },
    });

    this.logger.log(`Message ${messageId} status updated → ${status}`);
  }
}
