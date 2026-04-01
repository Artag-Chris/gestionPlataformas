import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { SendInstagramDto } from './dto/send-instagram.dto';
import { InstagramResponseDto } from './dto/instagram-response.dto';
import { v4 as uuidv4 } from 'uuid';

interface MetaApiResponse {
  recipient_id: string;
  message_id: string;
}

interface MetaApiError {
  error: { message: string; code: number };
}

@Injectable()
export class InstagramService {
  private readonly logger = new Logger(InstagramService.name);
  private readonly apiUrl: string;
  private readonly accessToken: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    const version = config.get<string>('INSTAGRAM_API_VERSION') ?? 'v19.0';
    const pageId = config.getOrThrow<string>('INSTAGRAM_PAGE_ID');
    this.accessToken = config.getOrThrow<string>('INSTAGRAM_ACCESS_TOKEN');
    // Instagram Messaging uses the same Graph API endpoint as Facebook Messenger
    this.apiUrl = `https://graph.facebook.com/${version}/${pageId}/messages`;
  }

  async sendToRecipients(dto: SendInstagramDto): Promise<InstagramResponseDto> {
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

    return {
      messageId: dto.messageId,
      status: this.resolveStatus(sentCount, failedCount),
      sentCount,
      failedCount,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString(),
    };
  }

   private async sendToOne(
     messageId: string,
     recipient: string,
     message: string,
     mediaUrl?: string | null,
   ): Promise<void> {
      const record = await this.prisma.igMessage.create({
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
        const payload = this.buildPayload(recipient, message, mediaUrl);
        console.log(`[INSTAGRAM] Sending to ${recipient} | URL: ${this.apiUrl}`);
        const response = await axios.post<MetaApiResponse>(this.apiUrl, payload, {
          params: { access_token: this.accessToken },
          headers: { 'Content-Type': 'application/json' },
        });

        await this.prisma.igMessage.update({
          where: { id: record.id },
          data: { status: 'SENT', igMessageId: response.data.message_id, sentAt: new Date() },
        });

        this.logger.log(`Sent to ${recipient} | igMessageId: ${response.data.message_id}`);
      } catch (error) {
        const reason = this.extractError(error);
        console.error(`[INSTAGRAM_ERROR] Failed to send to ${recipient}:`, reason);
        if (axios.isAxiosError(error)) {
          console.error(`[INSTAGRAM_API_ERROR]`, {
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
          });
        }

        await this.prisma.igMessage.update({
          where: { id: record.id },
          data: { status: 'FAILED', errorReason: reason },
        });

        this.logger.error(`Failed to send to ${recipient}: ${reason}`);
        throw new Error(reason);
      }
   }

  private buildPayload(recipient: string, message: string, mediaUrl?: string | null) {
    if (mediaUrl) {
      return {
        recipient: { id: recipient },
        message: {
          attachment: {
            type: 'image',
            payload: { url: mediaUrl, is_reusable: true },
          },
        },
        messaging_type: 'RESPONSE',
      };
    }

    return {
      recipient: { id: recipient },
      message: { text: message },
      messaging_type: 'RESPONSE',
    };
  }

  private resolveStatus(sent: number, failed: number): 'SENT' | 'FAILED' | 'PARTIAL' {
    if (failed === 0) return 'SENT';
    if (sent === 0) return 'FAILED';
    return 'PARTIAL';
  }

  private extractError(error: unknown): string {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<MetaApiError>;
      return axiosError.response?.data?.error?.message ?? axiosError.message;
    }
    return error instanceof Error ? error.message : String(error);
  }

   /**
    * Send a message to a single Instagram user by IGSID.
    * This is used when you already know the IGSID of the recipient.
    */
   async sendToInstagramUser(igsid: string, message: string, mediaUrl?: string): Promise<{
     messageId: string;
     igsid: string;
     status: 'SENT' | 'FAILED';
     timestamp: string;
   }> {
     const messageId = uuidv4();
     try {
       await this.sendToOne(messageId, igsid, message, mediaUrl);
       return {
         messageId,
         igsid,
         status: 'SENT',
         timestamp: new Date().toISOString(),
       };
     } catch (error) {
       return {
         messageId,
         igsid,
         status: 'FAILED',
         timestamp: new Date().toISOString(),
       };
     }
   }

   async getConversations(): Promise<Array<{ conversationId: string; igsid: string; username?: string }>> {
     try {
       const businessAccountId = this.config.get<string>('INSTAGRAM_BUSINESS_ACCOUNT_ID');
       console.log(`[INSTAGRAM] Fetching conversations for Business Account ID: ${businessAccountId}`);
       
       const url = `https://graph.facebook.com/v19.0/${businessAccountId}/conversations`;
       console.log(`[INSTAGRAM] API URL: ${url}`);
       
       const response = await axios.get(url, {
         params: {
           access_token: this.accessToken,
           fields: 'id,senders,participants,message',
           user_id: businessAccountId,
         },
       });

       console.log(`[INSTAGRAM] API Response:`, JSON.stringify(response.data));
       
       const conversations = response.data.data || [];
       const result = conversations.map((conv: any) => ({
         conversationId: conv.id,
         igsid: conv.senders?.[0]?.id || conv.id,
         username: conv.senders?.[0]?.name,
       }));
       
       console.log(`[INSTAGRAM] Returning ${result.length} conversations`);
       return result;
     } catch (error) {
       const errorMsg = this.extractError(error);
       console.error(`[INSTAGRAM_ERROR] Failed to fetch conversations:`, errorMsg);
       this.logger.error(`Failed to fetch conversations: ${errorMsg}`);
       throw error;
     }
   }
}
