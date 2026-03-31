import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  NotFoundException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { MessagesService } from './messages.service';
import { SendMessageDto } from './dto/send-message.dto';
import { MessageResponseDto } from './dto/message-response.dto';
// import { JwtAuthGuard } from '../../auth/auth.guard'; // TODO: activar con auth
// import { UseGuards } from '@nestjs/common';           // TODO: activar con auth

@Controller('v1/messages')
export class MessagesController {
  constructor(private readonly messages: MessagesService) {}

  /**
   * Enviar un mensaje a cualquier canal.
   * Usado por: N8N bot, clientes directos, etc.
   *
   * POST /api/v1/messages/send
   * Body: { channel, recipients[], message, mediaUrl?, metadata? }
   */
  // @UseGuards(JwtAuthGuard) // TODO: descomentar cuando activemos auth
  @Post('send')
  @HttpCode(HttpStatus.ACCEPTED) // 202 → aceptado, procesando en background
  send(@Body() dto: SendMessageDto): Promise<MessageResponseDto> {
    return this.messages.send(dto);
  }

  /**
   * Consultar el estado de un mensaje por ID.
   * Útil para que N8N verifique si el mensaje fue enviado.
   *
   * GET /api/v1/messages/:id
   */
  // @UseGuards(JwtAuthGuard) // TODO: descomentar cuando activemos auth
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<MessageResponseDto> {
    const message = await this.messages.findOne(id);

    if (!message) {
      throw new NotFoundException(`Message with id ${id} not found`);
    }

    return message;
  }
}
