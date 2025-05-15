// src/notifications/services/unread-counter.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../common/services/redis.service';

@Injectable()
export class UnreadCounterService {
  private readonly logger = new Logger(UnreadCounterService.name);
  private memoryCounters: Map<number, number> = new Map(); // Fallback khi Redis không khả dụng

  constructor(private redisService: RedisService) {
    this.logger.log('UnreadCounterService initialized with RedisService');
  }

  // Tăng số lượng thông báo chưa đọc
  async increment(userId: number): Promise<number> {
    const redisClient = this.redisService.getClient();
    if (this.redisService.isReady() && redisClient) {
      try {
        return await redisClient.incr(`unread:${userId}`);
      } catch (error) {
        this.logger.error(`Redis increment error: ${error.message}`);
      }
    } else {
      this.logger.warn('Redis not available for unread counters, using memory store');
    }
    
    // Fallback to memory counter
    const currentCount = this.memoryCounters.get(userId) || 0;
    const newCount = currentCount + 1;
    this.memoryCounters.set(userId, newCount);
    return newCount;
  }

  // Giảm số lượng thông báo chưa đọc
  async decrement(userId: number): Promise<number> {
    const redisClient = this.redisService.getClient();
    if (this.redisService.isReady() && redisClient) {
      try {
        const count = await redisClient.decr(`unread:${userId}`);
        
        // Đảm bảo không âm
        if (count < 0) {
          await redisClient.set(`unread:${userId}`, 0);
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
    const redisClient = this.redisService.getClient();
    if (this.redisService.isReady() && redisClient) {
      try {
        const count = await redisClient.get(`unread:${userId}`);
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
    const redisClient = this.redisService.getClient();
    if (this.redisService.isReady() && redisClient) {
      try {
        await redisClient.set(`unread:${userId}`, 0);
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
    const redisClient = this.redisService.getClient();
    if (this.redisService.isReady() && redisClient) {
      try {
        await redisClient.set(`unread:${userId}`, count);
        return;
      } catch (error) {
        this.logger.error(`Redis sync error: ${error.message}`);
      }
    }
    
    // Fallback to memory counter
    this.memoryCounters.set(userId, count);
  }
}