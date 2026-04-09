import {
  Controller,
  Post,
  Get,
  Delete,
  Patch,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { IdentityService } from './identity.service';
import { ResolveIdentityDto, MergeUsersDto, UpdateAISettingsDto } from './dto';

/**
 * Identity API Controller
 * All requests enter through the Gateway
 * Gateway forwards to identity-service via RabbitMQ (event-driven)
 */
@Controller('v1/identity')
export class IdentityController {
  constructor(private readonly identityService: IdentityService) {}

  /**
   * Resolve or create a user identity (Fire-and-forget)
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
   * 
   * Returns 202 ACCEPTED (event queued for processing)
   */
  @Post('resolve')
  @HttpCode(HttpStatus.ACCEPTED)
  async resolveIdentity(@Body() dto: ResolveIdentityDto): Promise<any> {
    return this.identityService.resolveIdentity(dto);
  }

  /**
   * Get all users (Request-Response pattern)
   * 
   * GET /api/v1/identity/users?channel=whatsapp&includeDeleted=false
   */
  @Get('users')
  async getAllUsers(
    @Query('channel') channel?: string,
    @Query('includeDeleted') includeDeleted?: string,
  ): Promise<any> {
    const filters = {
      channel: channel || undefined,
      includeDeleted: includeDeleted === 'true',
    };
    return this.identityService.getAllUsers(filters);
  }

  /**
   * Get a specific user with all related data (Request-Response pattern)
   * 
   * GET /api/v1/identity/users/:userId
   * Returns: { user, identities, contacts, nameHistory }
   */
  @Get('users/:userId')
  async getUser(@Param('userId') userId: string): Promise<any> {
    if (!userId) {
      throw new BadRequestException('userId is required');
    }
    return this.identityService.getUser(userId);
  }

  /**
   * Merge two users (Fire-and-forget)
   * 
   * POST /api/v1/identity/merge
   * Body: { primaryUserId, secondaryUserId, reason }
   * 
   * The secondary user is merged into the primary user.
   * All identities and contacts from secondary are moved to primary.
   * Secondary user is soft-deleted.
   * 
   * Returns 202 ACCEPTED (event queued for processing)
   */
  @Post('merge')
  @HttpCode(HttpStatus.ACCEPTED)
  async mergeUsers(@Body() dto: MergeUsersDto): Promise<any> {
    return this.identityService.mergeUsers(dto);
  }

  /**
   * Delete a user (soft delete) (Fire-and-forget)
   * 
   * DELETE /api/v1/identity/users/:userId
   * 
   * Returns 202 ACCEPTED (event queued for processing)
   */
  @Delete('users/:userId')
  @HttpCode(HttpStatus.ACCEPTED)
  async deleteUser(@Param('userId') userId: string): Promise<any> {
    if (!userId) {
      throw new BadRequestException('userId is required');
    }
    return this.identityService.deleteUser(userId);
  }

  /**
   * Get identity report (Request-Response pattern)
   * 
   * GET /api/v1/identity/report
   * Returns: { totalUsers, usersByChannel, report, ... }
   */
  @Get('report')
  async getReport(): Promise<any> {
    return this.identityService.getReport();
  }

  /**
   * Update user AI settings (Fire-and-forget)
   * 
   * PATCH /api/v1/identity/users/:userId/ai-settings
   * Body: { aiEnabled: boolean }
   * 
   * Example:
   * {
   *   "aiEnabled": false
   * }
   * 
   * Returns 202 ACCEPTED (event queued for processing)
   */
  @Patch('users/:userId/ai-settings')
  @HttpCode(HttpStatus.ACCEPTED)
  async updateAISettings(
    @Param('userId') userId: string,
    @Body() dto: UpdateAISettingsDto,
  ): Promise<any> {
    if (!userId) {
      throw new BadRequestException('userId is required');
    }
    return this.identityService.updateAISettings(userId, dto);
  }
}
