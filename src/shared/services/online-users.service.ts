// src/shared/services/online-users.service.ts
import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class OnlineUsersService {
  private readonly logger = new Logger(OnlineUsersService.name);
  private redisAvailable: boolean = false;
  private redisClient: any = null;
  private memoryOnlineUsers: Set<number> = new Set(); // Fallback khi Redis không khả dụng

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {
    // Kiểm tra xem Redis có khả dụng không
    this.checkRedisAvailability();
  }

  private async checkRedisAvailability(): Promise<void> {
    try {
      this.redisClient = this.getRedisClient();
      if (this.redisClient) {
        // Thử ping Redis để kiểm tra kết nối
        await this.redisClient.ping();
        this.redisAvailable = true;
        this.logger.log('Redis is available for online users tracking');
      } else {
        this.redisAvailable = false;
        this.redisClient = null;
        this.logger.warn('Redis client is not available for online users tracking, using memory store instead');
      }
    } catch (error) {
      this.redisAvailable = false;
      this.redisClient = null;
      this.logger.error(`Redis connection failed for online users tracking: ${error.message}`);
    }
  }

  // Lấy Redis client một cách an toàn
  private getRedisClient(): any {
    try {
      const store = (this.cacheManager as any).store;
      if (store && typeof store.getClient === 'function') {
        return store.getClient();
      }
      return null;
    } catch (error) {
      this.logger.error(`Failed to get Redis client: ${error.message}`);
      return null;
    }
  }

  // Đánh dấu user online
  async addOnlineUser(userId: number): Promise<number> {
    if (this.redisAvailable && this.redisClient) {
      try {
        await this.redisClient.sadd('online_users', userId.toString());
        return await this.redisClient.scard('online_users');
      } catch (error) {
        this.logger.error(`Redis add online user error: ${error.message}`);
      }
    }
    
    // Fallback to memory store
    this.memoryOnlineUsers.add(userId);
    return this.memoryOnlineUsers.size;
  }

  // Đánh dấu user offline
  async removeOnlineUser(userId: number): Promise<number> {
    if (this.redisAvailable && this.redisClient) {
      try {
        await this.redisClient.srem('online_users', userId.toString());
        return await this.redisClient.scard('online_users');
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
    if (this.redisAvailable && this.redisClient) {
      try {
        return await this.redisClient.scard('online_users');
      } catch (error) {
        this.logger.error(`Redis count online users error: ${error.message}`);
      }
    }
    
    // Fallback to memory store
    return this.memoryOnlineUsers.size;
  }

  // Lấy danh sách người dùng đang online
  async getOnlineUsers(): Promise<number[]> {
    if (this.redisAvailable && this.redisClient) {
      try {
        const members = await this.redisClient.smembers('online_users');
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
    if (this.redisAvailable && this.redisClient) {
      try {
        return !!(await this.redisClient.sismember('online_users', userId.toString()));
      } catch (error) {
        this.logger.error(`Redis check user online error: ${error.message}`);
      }
    }
    
    // Fallback to memory store
    return this.memoryOnlineUsers.has(userId);
  }
}