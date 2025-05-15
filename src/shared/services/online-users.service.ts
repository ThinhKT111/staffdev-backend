// src/shared/services/online-users.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../common/services/redis.service';

@Injectable()
export class OnlineUsersService {
  private readonly logger = new Logger(OnlineUsersService.name);
  private memoryOnlineUsers: Set<number> = new Set(); // Fallback khi Redis không khả dụng

  constructor(private redisService: RedisService) {
    this.logger.log('OnlineUsersService initialized with RedisService');
  }

  // Đánh dấu user online
  async addOnlineUser(userId: number): Promise<number> {
    const redisClient = this.redisService.getClient();
    if (this.redisService.isReady() && redisClient) {
      try {
        await redisClient.sAdd('online_users', userId.toString());
        return await redisClient.sCard('online_users');
      } catch (error) {
        this.logger.error(`Redis add online user error: ${error.message}`);
      }
    } else {
      this.logger.warn('Redis not available for online users, using memory store');
    }
    
    // Fallback to memory store
    this.memoryOnlineUsers.add(userId);
    return this.memoryOnlineUsers.size;
  }

  // Đánh dấu user offline
  async removeOnlineUser(userId: number): Promise<number> {
    const redisClient = this.redisService.getClient();
    if (this.redisService.isReady() && redisClient) {
      try {
        await redisClient.sRem('online_users', userId.toString());
        return await redisClient.sCard('online_users');
      } catch (error) {
        this.logger.error(`Redis remove online user error: ${error.message}`);
      }
    }
    
    // Fallback to memory store
    this.memoryOnlineUsers.delete(userId);
    return this.memoryOnlineUsers.size;
  }

  // Đếm số người dùng online
  async countOnlineUsers(): Promise<number> {
    const redisClient = this.redisService.getClient();
    if (this.redisService.isReady() && redisClient) {
      try {
        return await redisClient.sCard('online_users');
      } catch (error) {
        this.logger.error(`Redis count online users error: ${error.message}`);
      }
    }
    
    // Fallback to memory store
    return this.memoryOnlineUsers.size;
  }

  // Lấy danh sách người dùng đang online
  async getOnlineUsers(): Promise<number[]> {
    const redisClient = this.redisService.getClient();
    if (this.redisService.isReady() && redisClient) {
      try {
        const members = await redisClient.sMembers('online_users');
        return members.map(userId => parseInt(userId, 10));
      } catch (error) {
        this.logger.error(`Redis get online users error: ${error.message}`);
      }
    }
    
    // Fallback to memory store
    return Array.from(this.memoryOnlineUsers);
  }

  // Kiểm tra một người dùng có online không
  async isUserOnline(userId: number): Promise<boolean> {
    const redisClient = this.redisService.getClient();
    if (this.redisService.isReady() && redisClient) {
      try {
        return !!(await redisClient.sIsMember('online_users', userId.toString()));
      } catch (error) {
        this.logger.error(`Redis check user online error: ${error.message}`);
      }
    }
    
    // Fallback to memory store
    return this.memoryOnlineUsers.has(userId);
  }
}