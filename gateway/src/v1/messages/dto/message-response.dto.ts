export class MessageResponseDto {
  id: string;
  accepted: boolean;
  channel: string;
  recipients: string[];
  message: string;
  status: 'PENDING' | 'SENT' | 'FAILED' | 'PARTIAL';
  createdAt: Date;
}
