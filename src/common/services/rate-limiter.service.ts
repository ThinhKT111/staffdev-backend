// src/common/services/rate-limiter.service.ts
import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class RateLimiterService {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async isRateLimited(key: string, limit: number, windowSeconds: number): Promise<boolean> {
    const redisClient = this.cacheManager.store.client;
    const now = Date.now();
    
    // Sử dụng Redis Sorted Set để lưu timestamps
    const keyName = `ratelimit:${key}`;
    
    // Xóa timestamp cũ
    const windowStart = now - (windowSeconds * 1000);
    await redisClient.zremrangebyscore(keyName, 0, windowStart);
    
    // Đếm requests hiện tại trong window
    const count = await redisClient.zcard(keyName);
    
    // Nếu đã vượt quá giới hạn
    if (count >= limit) {
      return true;
    }
    
    // Thêm timestamp hiện tại
    await redisClient.zadd(keyName, now, `${now}-${Math.random()}`);
    
    // Set expiration để tự động xóa
    await redisClient.expire(keyName, windowSeconds);
    
    return false;
  }
}