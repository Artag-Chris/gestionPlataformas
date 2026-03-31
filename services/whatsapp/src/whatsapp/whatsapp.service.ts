import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { SendWhatsappDto } from './dto/send-whatsapp.dto';
import { WhatsappResponseDto } from './dto/whatsapp-response.dto';
import { v4 as uuidv4 } from 'uuid';

interface MetaApiResponse {
  messages: Array<{ id: string }>;
}

interface MetaApiError {
  error: {
    message: string;
    type?: string;
    code: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
}

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private readonly apiUrl: string;
  private readonly apiToken: string;
  private readonly phoneNumberId: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    const version = config.get<string>('WHATSAPP_API_VERSION') ?? 'v19.0';
    this.phoneNumberId = config.getOrThrow<string>('WHATSAPP_PHONE_NUMBER_ID');
    this.apiToken = config.getOrThrow<string>('WHATSAPP_API_TOKEN');
    this.apiUrl = `https://graph.facebook.com/${version}/${this.phoneNumberId}/messages`;
  }

  // ─────────────────────────────────────────
  // Enviar a múltiples destinatarios
  // ─────────────────────────────────────────

  async sendToRecipients(dto: SendWhatsappDto): Promise<WhatsappResponseDto> {
    const results = await Promise.allSettled(
      dto.recipients.map((recipient) =>
        this.sendToOne(dto.messageId, recipient, dto.message, dto.mediaUrl),
      ),
    );

    const errors = results
      .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
      .map((r, i) => ({
        recipient: dto.recipients[i],
        reason: r.reason instanceof Error ? r.reason.message : String(r.reason),
      }));

    const sentCount = results.filter((r) => r.status === 'fulfilled').length;
    const failedCount = errors.length;

    const overallStatus = this.resolveStatus(sentCount, failedCount);

    return {
      messageId: dto.messageId,
      status: overallStatus,
      sentCount,
      failedCount,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString(),
    };
  }

  // ─────────────────────────────────────────
  // Enviar a un destinatario individual
  // ─────────────────────────────────────────

  private async sendToOne(
    messageId: string,
    recipient: string,
    message: string,
    mediaUrl?: string | null,
  ): Promise<void> {
    // Persistir el intento en la BD
    const record = await this.prisma.waMessage.create({
      data: {
        id: uuidv4(),
        messageId,
        recipient,
        body: message,
        mediaUrl: mediaUrl ?? null,
        status: 'PENDING',
      },
    });

    try {
      const payload = this.buildMetaPayload(recipient, message, mediaUrl);

      this.logger.debug(
        `[sendToOne] Calling Meta API → URL: ${this.apiUrl} | recipient: ${recipient} | payload: ${JSON.stringify(payload)}`,
      );

      const response = await axios.post<MetaApiResponse>(this.apiUrl, payload, {
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json',
        },
      });

      const waMessageId = response.data.messages[0]?.id;

      await this.prisma.waMessage.update({
        where: { id: record.id },
        data: { status: 'SENT', waMessageId, sentAt: new Date() },
      });

      this.logger.log(`Sent to ${recipient} | waMessageId: ${waMessageId}`);
    } catch (error) {
      const { reason, detail } = this.extractErrorDetail(error);

      await this.prisma.waMessage.update({
        where: { id: record.id },
        data: { status: 'FAILED', errorReason: reason },
      });

      this.logger.error(
        `Failed to send to ${recipient}\n` +
          `  reason   : ${reason}\n` +
          `  ${detail}`,
      );
      throw new Error(reason);
    }
  }

  // ─────────────────────────────────────────
  // Helpers privados
  // ─────────────────────────────────────────

  private buildMetaPayload(
    recipient: string,
    message: string,
    mediaUrl?: string | null,
  ) {
    if (mediaUrl) {
      return {
        messaging_product: 'whatsapp',
        to: recipient,
        type: 'image',
        image: { link: mediaUrl, caption: message },
      };
    }

    return {
      messaging_product: 'whatsapp',
      to: recipient,
      type: 'text',
      text: { body: message },
    };
  }

  private resolveStatus(
    sent: number,
    failed: number,
  ): 'SENT' | 'FAILED' | 'PARTIAL' {
    if (failed === 0) return 'SENT';
    if (sent === 0) return 'FAILED';
    return 'PARTIAL';
  }

  private extractErrorDetail(error: unknown): { reason: string; detail: string } {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<MetaApiError>;
      const httpStatus = axiosError.response?.status ?? 'no-response';
      const metaError = axiosError.response?.data?.error;

      const reason = metaError?.message ?? axiosError.message;
      const detail =
        `httpStatus: ${httpStatus}\n` +
        `  metaCode : ${metaError?.code ?? 'n/a'}\n` +
        `  metaType : ${metaError?.type ?? 'n/a'}\n` +
        `  subcode  : ${metaError?.error_subcode ?? 'n/a'}\n` +
        `  traceId  : ${metaError?.fbtrace_id ?? 'n/a'}\n` +
        `  apiUrl   : ${this.apiUrl}\n` +
        `  rawBody  : ${JSON.stringify(axiosError.response?.data ?? null)}`;

      return { reason, detail };
    }

    const reason = error instanceof Error ? error.message : String(error);
    return { reason, detail: `(non-axios error) ${reason}` };
  }
}
