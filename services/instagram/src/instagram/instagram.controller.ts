import { Controller, Get } from '@nestjs/common';
import { InstagramService } from './instagram.service';

interface ConversationWithUser {
  conversationId: string;
  igsid: string;
  username?: string;
}

@Controller('conversations')
export class InstagramController {
  constructor(private readonly instagram: InstagramService) {}

  @Get()
  async getConversations(): Promise<ConversationWithUser[]> {
    return this.instagram.getConversations();
  }
}
