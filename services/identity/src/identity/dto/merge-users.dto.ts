import { IsString, IsUUID } from 'class-validator';

/// DTO for merging two users
export class MergeUsersDto {
  /// Primary user ID (the one to keep)
  @IsString()
  @IsUUID()
  primaryUserId: string;

  /// Secondary user ID (the one to merge into primary)
  @IsString()
  @IsUUID()
  secondaryUserId: string;

  /// Reason for the merge
  @IsString()
  reason: string;
}
