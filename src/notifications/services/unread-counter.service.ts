// src/notifications/services/unread-counter.service.ts
import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class UnreadCounterService {
  private readonly logger = new Logger(UnreadCounterService.name);
  private redisAvailable: boolean = false;
  private redisClient: any = null;
  private memoryCounters: Map<number, number> = new Map(); // Fallback khi Redis không khả dụng

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
        this.logger.log('Redis is available for unread counters');
      } else {
        this.redisAvailable = false;
        this.redisClient = null;
        this.logger.warn('Redis client is not available for unread counters, using memory store instead');
      }
    } catch (error) {
      this.redisAvailable = false;
      this.redisClient = null;
      this.logger.error(`Redis connection failed for unread counters: ${error.message}`);
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

  // Tăng số lượng thông báo chưa đọc
  async increment(userId: number): Promise<number> {
    if (this.redisAvailable && this.redisClient) {
      try {
        return await this.redisClient.incr(`unread:${userId}`);
      } catch (error) {
        this.logger.error(`Redis increment error: ${error.message}`);
      }
    }
    
    // Fallback to memory counter
    const currentCount = this.memoryCounters.get(userId) || 0;
    const newCount = currentCount + 1;
    this.memoryCounters.set(userId, newCount);
    return newCount;
  }

  // Giảm số lượng thông báo chưa đọc
  async decrement(userId: number): Promise<number> {
    if (this.redisAvailable && this.redisClient) {
      try {
        const count = await this.redisClient.decr(`unread:${userId}`);
        
        // Đảm bảo không âm
        if (count < 0) {
          await this.redisClient.set(`unread:${userId}`, 0);
          return 0;
        }
        
        return count;
      } catch (error) {
        this.logger.error(`Redis decrement error: ${error.message}`);
      }
    }
    
    // Fallback to memory counter
    const currentCount = this.memoryCounters.get(userId) || 0;
    const newCount = Math.max(0, currentCount - 1);
    this.memoryCounters.set(userId, newCount);
    return newCount;
  }

  // Lấy số lượng thông báo chưa đọc
  async getCount(userId: number): Promise<number> {
    if (this.redisAvailable && this.redisClient) {
      try {
        const count = await this.redisClient.get(`unread:${userId}`);
        return count ? parseInt(count, 10) : 0;
      } catch (error) {
        this.logger.error(`Redis get count error: ${error.message}`);
      }
    }
    
    // Fallback to memory counter
    return this.memoryCounters.get(userId) || 0;
  }

  // Đặt lại counter về 0
  async reset(userId: number): Promise<void> {
    if (this.redisAvailable && this.redisClient) {
      try {
        await this.redisClient.set(`unread:${userId}`, 0);
        return;
      } catch (error) {
        this.logger.error(`Redis reset error: ${error.message}`);
      }
    }
    
    // Fallback to memory counter
    this.memoryCounters.set(userId, 0);
  }

  // Đồng bộ counter với số thực tế trong database
  async sync(userId: number, count: number): Promise<void> {
    if (this.redisAvailable && this.redisClient) {
      try {
        await this.redisClient.set(`unread:${userId}`, count);
        return;
      } catch (error) {
        this.logger.error(`Redis sync error: ${error.message}`);
      }
    }
    
    // Fallback to memory counter
    this.memoryCounters.set(userId, count);
  }
}