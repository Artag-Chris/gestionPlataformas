import { IsString, IsUUID } from 'class-validator';

export class MergeUsersDto {
  @IsString()
  @IsUUID()
  primaryUserId: string;

  @IsString()
  @IsUUID()
  secondaryUserId: string;

  @IsString()
  reason: string;
}
