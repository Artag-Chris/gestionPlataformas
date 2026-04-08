import { IsUUID } from 'class-validator';

/// DTO for getting a user
export class GetUserDto {
  /// User ID
  @IsUUID()
  userId: string;
}
