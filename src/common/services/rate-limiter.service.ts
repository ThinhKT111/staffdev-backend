// src/common/services/rate-limiter.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from './redis.service';

@Injectable()
export class RateLimiterService {
  private readonly logger = new Logger(RateLimiterService.name);
  private memoryRateLimits: Map<string, number[]> = new Map(); // Fallback khi Redis không khả dụng

  constructor(private redisService: RedisService) {
    this.logger.log('RateLimiterService initialized with RedisService');
  }

  async isRateLimited(key: string, limit: number, windowSeconds: number): Promise<boolean> {
    const redisClient = this.redisService.getClient();
    if (this.redisService.isReady() && redisClient) {
      try {
        const now = Date.now();
        
        // Sử dụng Redis Sorted Set để lưu timestamps
        const keyName = `ratelimit:${key}`;
        
        // Xóa timestamp cũ
        const windowStart = now - (windowSeconds * 1000);
        await redisClient.zRemRangeByScore(keyName, 0, windowStart);
        
        // Đếm requests hiện tại trong window
        const count = await redisClient.zCard(keyName);
        
        // Nếu đã vượt quá giới hạn
        if (count >= limit) {
          return true;
        }
        
        // Thêm timestamp hiện tại
        await redisClient.zAdd(keyName, { score: now, value: `${now}-${Math.random()}` });
        
        // Set expiration để tự động xóa
        await redisClient.expire(keyName, windowSeconds);
        
        return false;
      } catch (error) {
        this.logger.error(`Redis rate limiting error: ${error.message}`);
        // Fallback to memory rate limiting
      }
    } else {
      this.logger.warn('Redis client is not available for rate limiting, using memory store instead');
    }
    
    // Sử dụng memory rate limiting nếu Redis không khả dụng
    return this.memoryRateLimit(key, limit, windowSeconds);
  }

  private memoryRateLimit(key: string, limit: number, windowSeconds: number): boolean {
    const now = Date.now();
    const windowStart = now - (windowSeconds * 1000);
    
    // Lấy các timestamp hiện tại cho key
    let timestamps = this.memoryRateLimits.get(key) || [];
    
    // Loại bỏ timestamps cũ
    timestamps = timestamps.filter(timestamp => timestamp > windowStart);
    
    // Kiểm tra xem có vượt quá giới hạn không
    if (timestamps.length >= limit) {
      return true;
    }
    
    // Thêm timestamp mới
    timestamps.push(now);
    this.memoryRateLimits.set(key, timestamps);
    
    // Clean up các keys cũ định kỳ
    if (Math.random() < 0.01) { // 1% chance to run cleanup
      this.cleanupMemoryRateLimits();
    }
    
    return false;
  }

  private cleanupMemoryRateLimits(): void {
    const now = Date.now();
    // Giới hạn thời gian lưu trữ là 1 giờ
    const cutoff = now - (60 * 60 * 1000);
    
    for (const [key, timestamps] of this.memoryRateLimits.entries()) {
      // Loại bỏ timestamps cũ
      const validTimestamps = timestamps.filter(timestamp => timestamp > cutoff);
      
      if (validTimestamps.length === 0) {
        // Xóa key nếu không còn timestamps nào
        this.memoryRateLimits.delete(key);
      } else if (validTimestamps.length !== timestamps.length) {
        // Cập nhật mảng timestamps
        this.memoryRateLimits.set(key, validTimestamps);
      }
    }
  }
}