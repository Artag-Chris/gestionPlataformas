export interface TikTokPostError {
  recipient: string;
  reason: string;
}

export class TikTokResponseDto {
  messageId: string;
  status: 'SENT' | 'FAILED' | 'PARTIAL';
  sentCount: number;
  failedCount: number;
  errors?: TikTokPostError[];
  timestamp: string;
}
