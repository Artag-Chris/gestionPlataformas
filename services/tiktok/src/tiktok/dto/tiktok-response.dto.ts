export interface TikTokPostError {
  recipient: string;
  reason: string;
}

export class TikTokResponseDto {
  messageId: string;
  status: 'PROCESSING' | 'PUBLISHED' | 'FAILED' | 'PARTIAL';
  sentCount: number;
  failedCount: number;
  errors?: TikTokPostError[];
  timestamp: string;
}
