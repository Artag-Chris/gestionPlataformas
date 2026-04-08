import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { IdentityService } from './identity.service';
import { ResolveIdentityDto, MergeUsersDto } from './dto';

/**
 * Identity API Controller
 * All requests enter through the Gateway
 * Gateway forwards to identity-service via RabbitMQ
 */
@Controller('v1/identity')
export class IdentityController {
  constructor(private readonly identityService: IdentityService) {}

  /**
   * Resolve or create a user identity
   * 
   * POST /api/v1/identity/resolve
   * Body: { channel, channelUserId, displayName?, phone?, email?, username?, ... }
   * 
   * Example:
   * {
   *   "channel": "whatsapp",
   *   "channelUserId": "+1234567890",
   *   "displayName": "John Doe",
   *   "phone": "+1234567890"
   * }
   */
  @Post('resolve')
  @HttpCode(HttpStatus.ACCEPTED)
  async resolveIdentity(@Body() dto: ResolveIdentityDto): Promise<any> {
    return this.identityService.resolveIdentity(dto);
  }

  /**
   * Get all users
   * 
   * GET /api/v1/identity/users
   * Query params: ?channel=whatsapp&includeDeleted=false
   */
  @Get('users')
  async getAllUsers(
    @Body() filters?: { channel?: string; includeDeleted?: boolean },
  ): Promise<any> {
    return this.identityService.getAllUsers(filters);
  }

  /**
   * Get a specific user with all related data
   * 
   * GET /api/v1/identity/users/:userId
   * Returns: { user, identities, contacts, nameHistory }
   */
  @Get('users/:userId')
  async getUser(@Param('userId') userId: string): Promise<any> {
    return this.identityService.getUser(userId);
  }

  /**
   * Merge two users
   * 
   * POST /api/v1/identity/merge
   * Body: { primaryUserId, secondaryUserId, reason }
   * 
   * The secondary user is merged into the primary user.
   * All identities and contacts from secondary are moved to primary.
   * Secondary user is soft-deleted.
   */
  @Post('merge')
  @HttpCode(HttpStatus.ACCEPTED)
  async mergeUsers(@Body() dto: MergeUsersDto): Promise<any> {
    return this.identityService.mergeUsers(dto);
  }

  /**
   * Delete a user (soft delete)
   * 
   * DELETE /api/v1/identity/users/:userId
   */
  @Delete('users/:userId')
  @HttpCode(HttpStatus.ACCEPTED)
  async deleteUser(@Param('userId') userId: string): Promise<any> {
    return this.identityService.deleteUser(userId);
  }

  /**
   * Get identity report
   * 
   * GET /api/v1/identity/report
   * Returns: { totalUsers, usersByChannel, duplicates, etc }
   */
  @Get('report')
  async getReport(): Promise<any> {
    return this.identityService.getReport();
  }
}
