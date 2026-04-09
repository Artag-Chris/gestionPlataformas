import { IsBoolean, IsNotEmpty } from 'class-validator';

/**
 * DTO for updating user AI settings
 * PATCH /api/v1/identity/users/:userId/ai-settings
 */
export class UpdateAISettingsDto {
  /**
   * Enable or disable AI responses for this user
   */
  @IsBoolean()
  @IsNotEmpty()
  aiEnabled: boolean;
}
