import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { RabbitMQService } from '../../rabbitmq/rabbitmq.service';
import { RequestResponseManager } from '../../identity/services/request-response.manager';
import { ROUTING_KEYS } from '../../rabbitmq/constants/queues';
import { ResolveIdentityDto, MergeUsersDto, UpdateAISettingsDto } from './dto';

/**
 * Gateway Identity Service
 * Toda comunicación con identity-service es event-driven via RabbitMQ
 */
@Injectable()
export class IdentityService {
  private readonly logger = new Logger(IdentityService.name);

  constructor(
    private rabbitmq: RabbitMQService,
    private requestResponseManager: RequestResponseManager,
  ) {}

  /**
   * Resolve an identity (create or link)
   * Fire-and-forget: no espera respuesta
   */
  async resolveIdentity(dto: ResolveIdentityDto): Promise<{ success: boolean; message: string }> {
    if (!dto.channel || !dto.channelUserId) {
      throw new BadRequestException('Channel and channelUserId are required');
    }

    this.logger.log(
      `Publishing resolve identity - Channel: ${dto.channel}, ID: ${dto.channelUserId}`,
    );

    await this.rabbitmq.publish(ROUTING_KEYS.IDENTITY_RESOLVE, {
      channel: dto.channel,
      channelUserId: dto.channelUserId,
      displayName: dto.displayName,
      phone: dto.phone,
      email: dto.email,
      username: dto.username,
      avatarUrl: dto.avatarUrl,
      trustScore: dto.trustScore,
      metadata: dto.metadata,
    });

    return {
      success: true,
      message: 'Identity resolution queued',
    };
  }

  /**
   * Get all users - Request-Response pattern
   * Espera respuesta de identity-service
   */
  async getAllUsers(filters?: { channel?: string; includeDeleted?: boolean }): Promise<any> {
    this.logger.log('Publishing get all users request');

    const { correlationId, promise } = this.requestResponseManager.createRequest();

    await this.rabbitmq.publish(ROUTING_KEYS.IDENTITY_GET_ALL_USERS, {
      correlationId,
      filters,
    });

    try {
      const response = await promise;
      return response.users || [];
    } catch (error) {
      this.logger.error(`Error getting users: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get a specific user - Request-Response pattern
   */
  async getUser(userId: string): Promise<any> {
    this.logger.log(`Publishing get user ${userId} request`);

    const { correlationId, promise } = this.requestResponseManager.createRequest();

    await this.rabbitmq.publish(ROUTING_KEYS.IDENTITY_GET_USER, {
      correlationId,
      userId,
    });

    try {
      const response = await promise;
      return response.user || null;
    } catch (error) {
      this.logger.error(`Error getting user: ${error.message}`);
      throw error;
    }
  }

  /**
   * Merge two users - Fire-and-forget
   */
  async mergeUsers(dto: MergeUsersDto): Promise<{ success: boolean; message: string }> {
    if (!dto.primaryUserId || !dto.secondaryUserId) {
      throw new BadRequestException('Both user IDs are required');
    }

    this.logger.log(
      `Publishing merge users - Primary: ${dto.primaryUserId}, Secondary: ${dto.secondaryUserId}`,
    );

    await this.rabbitmq.publish(ROUTING_KEYS.IDENTITY_MERGE_USERS, {
      primaryUserId: dto.primaryUserId,
      secondaryUserId: dto.secondaryUserId,
      reason: dto.reason,
    });

    return {
      success: true,
      message: 'User merge queued',
    };
  }

  /**
   * Delete a user - Fire-and-forget
   */
  async deleteUser(userId: string): Promise<{ success: boolean; message: string }> {
    this.logger.log(`Publishing delete user ${userId} request`);

    await this.rabbitmq.publish(ROUTING_KEYS.IDENTITY_DELETE_USER, {
      userId,
    });

    return {
      success: true,
      message: 'User deletion queued',
    };
  }

  /**
   * Get identity report - Request-Response pattern
   */
  async getReport(): Promise<any> {
    this.logger.log('Publishing get report request');

    const { correlationId, promise } = this.requestResponseManager.createRequest();

    await this.rabbitmq.publish(ROUTING_KEYS.IDENTITY_GET_REPORT, {
      correlationId,
    });

    try {
      const response = await promise;
      return response.report || {};
    } catch (error) {
      this.logger.error(`Error getting report: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update user AI settings - Fire-and-forget
   */
  async updateAISettings(
    userId: string,
    dto: UpdateAISettingsDto,
  ): Promise<{ success: boolean; message: string }> {
    if (!userId) {
      throw new BadRequestException('userId is required');
    }

    this.logger.log(`Publishing update AI settings for user ${userId} - aiEnabled: ${dto.aiEnabled}`);

    await this.rabbitmq.publish(ROUTING_KEYS.IDENTITY_UPDATE_AI_SETTINGS, {
      userId,
      aiEnabled: dto.aiEnabled,
      timestamp: Date.now(),
    });

    return {
      success: true,
      message: 'AI settings update queued',
    };
  }
}
