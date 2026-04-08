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
  private readonly apiVersion: string;
  private readonly templateName: string;
  private readonly templateLanguage: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.apiVersion = config.get<string>('WHATSAPP_API_VERSION') ?? 'v19.0';
    this.phoneNumberId = config.getOrThrow<string>('WHATSAPP_PHONE_NUMBER_ID');
    this.apiToken = config.getOrThrow<string>('WHATSAPP_API_TOKEN');
    this.apiUrl = `https://graph.facebook.com/${this.apiVersion}/${this.phoneNumberId}/messages`;
    this.templateName = config.get<string>('WHATSAPP_TEMPLATE_NAME') ?? 'presentacion_de_ia';
    this.templateLanguage = config.get<string>('WHATSAPP_TEMPLATE_LANGUAGE') ?? 'en';
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
        templateUsed: false,
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
      const { reason, detail, errorCode } = this.extractErrorDetail(error);

      this.logger.warn(
        `Failed to send normal message to ${recipient} | errorCode: ${errorCode} | reason: ${reason}\n` +
          `  Attempting template fallback...`,
      );

      try {
        // Intentar enviar con la plantilla como fallback
        await this.sendTemplate(recipient, record.id, messageId);
        return; // Éxito con plantilla
      } catch (templateError) {
        const { reason: templateReason, detail: templateDetail } = this.extractErrorDetail(templateError);

        await this.prisma.waMessage.update({
          where: { id: record.id },
          data: {
            status: 'FAILED',
            errorReason: `[Template fallback failed] ${templateReason} | [Original error] ${reason}`,
            templateUsed: true,
          },
        });

        this.logger.error(
          `Template fallback FAILED for ${recipient}\n` +
            `  [Original error] ${reason}\n` +
            `  [Template error] ${templateReason}\n` +
            `  ${templateDetail}`,
        );

        throw new Error(`${reason} + template fallback also failed: ${templateReason}`);
      }
    }
  }

  // ─────────────────────────────────────────
  // Enviar plantilla como fallback
  // ─────────────────────────────────────────

  private async sendTemplate(recipient: string, recordId: string, messageId: string): Promise<void> {
    const templatePayload = {
      messaging_product: 'whatsapp',
      to: recipient,
      type: 'template',
      template: {
        name: this.templateName,
        language: {
          code: this.templateLanguage,
        },
      },
    };

    this.logger.debug(
      `[sendTemplate] Calling Meta API with template → URL: ${this.apiUrl} | recipient: ${recipient} | template: ${this.templateName}`,
    );

    const response = await axios.post<MetaApiResponse>(this.apiUrl, templatePayload, {
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
      },
    });

    const waMessageId = response.data.messages[0]?.id;

    await this.prisma.waMessage.update({
      where: { id: recordId },
      data: {
        status: 'SENT',
        waMessageId,
        sentAt: new Date(),
        templateUsed: true,
      },
    });

    this.logger.log(
      `Sent template to ${recipient} | waMessageId: ${waMessageId} | template: ${this.templateName}`,
    );
  }

  // ─────────────────────────────────────────
  // Enviar plantilla por fallo de Re-engagement
  // ─────────────────────────────────────────

  /**
   * Enviar plantilla a un número que tuvo fallo por Re-engagement (24h sin respuesta)
   * Incluye reintentos automáticos
   * @param recipient - Número de teléfono que falló
   */
  async sendTemplateToFailedRecipient(recipient: string): Promise<void> {
    const maxRetries = 2;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.logger.log(
          `Sending fallback template to ${recipient} [Attempt ${attempt}/${maxRetries}] | template: ${this.templateName}`,
        );

        const templatePayload = {
          messaging_product: 'whatsapp',
          to: recipient,
          type: 'template',
          template: {
            name: this.templateName, // 'presentacion_de_ia'
            language: {
              code: this.templateLanguage, // 'en'
            },
          },
        };

        const response = await axios.post<MetaApiResponse>(
          this.apiUrl,
          templatePayload,
          {
            headers: {
              Authorization: `Bearer ${this.apiToken}`,
              'Content-Type': 'application/json',
            },
          },
        );

        const waMessageId = response.data.messages[0]?.id;

        this.logger.log(
          `✅ Fallback template sent to ${recipient} [Attempt ${attempt}/${maxRetries}] | wamid: ${waMessageId}`,
        );

        return; // Éxito, salir
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        const { reason } = this.extractErrorDetail(error);

        if (attempt < maxRetries) {
          this.logger.warn(
            `Attempt ${attempt}/${maxRetries} failed for ${recipient}: ${reason}. Retrying in 2 seconds...`,
          );
          // Esperar 2 segundos antes de reintentar
          await new Promise((resolve) => setTimeout(resolve, 2000));
        } else {
          this.logger.error(
            `❌ Fallback template failed after ${maxRetries} attempts for ${recipient}: ${reason}`,
          );
        }
      }
    }

    // Si llegamos aquí, todos los intentos fallaron
    throw lastError || new Error('Unknown error sending fallback template');
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

  private extractErrorDetail(error: unknown): { reason: string; detail: string; errorCode?: number } {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<MetaApiError>;
      const httpStatus = axiosError.response?.status ?? 'no-response';
      const metaError = axiosError.response?.data?.error;

      const reason = metaError?.message ?? axiosError.message;
      const errorCode = metaError?.code;
      const detail =
        `httpStatus: ${httpStatus}\n` +
        `  metaCode : ${metaError?.code ?? 'n/a'}\n` +
        `  metaType : ${metaError?.type ?? 'n/a'}\n` +
        `  subcode  : ${metaError?.error_subcode ?? 'n/a'}\n` +
        `  traceId  : ${metaError?.fbtrace_id ?? 'n/a'}\n` +
        `  apiUrl   : ${this.apiUrl}\n` +
        `  rawBody  : ${JSON.stringify(axiosError.response?.data ?? null)}`;

      return { reason, detail, errorCode };
    }

    const reason = error instanceof Error ? error.message : String(error);
    return { reason, detail: `(non-axios error) ${reason}` };
  }
}
