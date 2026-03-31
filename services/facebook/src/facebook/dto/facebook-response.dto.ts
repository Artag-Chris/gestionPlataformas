export interface FacebookMessageError {
  recipient: string;
  reason: string;
}

export class FacebookResponseDto {
  messageId: string;
  status: 'SENT' | 'FAILED' | 'PARTIAL';
  sentCount: number;
  failedCount: number;
  errors?: FacebookMessageError[];
  timestamp: string;
}
