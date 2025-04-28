// src/notifications/services/unread-counter.service.ts
import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class UnreadCounterService {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  // Tăng số lượng thông báo chưa đọc
  async increment(userId: number): Promise<number> {
    const redisClient = this.cacheManager.store.getClient();
    return redisClient.incr(`unread:${userId}`);
  }

  // Giảm số lượng thông báo chưa đọc
  async decrement(userId: number): Promise<number> {
    const redisClient = this.cacheManager.store.getClient();
    const count = await redisClient.decr(`unread:${userId}`);
    
    // Đảm bảo không âm
    if (count < 0) {
      await redisClient.set(`unread:${userId}`, 0);
      return 0;
    }
    
    return count;
  }

  // Lấy số lượng thông báo chưa đọc
  async getCount(userId: number): Promise<number> {
    const redisClient = this.cacheManager.store.getClient();
    const count = await redisClient.get(`unread:${userId}`);
    return count ? parseInt(count, 10) : 0;
  }

  // Đặt lại counter về 0
  async reset(userId: number): Promise<void> {
    const redisClient = this.cacheManager.store.getClient();
    await redisClient.set(`unread:${userId}`, 0);
  }

  // Đồng bộ counter với số thực tế trong database
  async sync(userId: number, count: number): Promise<void> {
    const redisClient = this.cacheManager.store.getClient();
    await redisClient.set(`unread:${userId}`, count);
  }
}