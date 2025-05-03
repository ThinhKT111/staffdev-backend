// src/forum/services/comment-counter.service.ts
import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ForumComment } from '../../entities/forum-comment.entity';

@Injectable()
export class CommentCounterService {
  private readonly logger = new Logger(CommentCounterService.name);
  private redisAvailable: boolean = false;
  private memoryCache: Map<number, number> = new Map(); // Fallback cache khi Redis không khả dụng

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @InjectRepository(ForumComment)
    private commentsRepository: Repository<ForumComment>,
  ) {
    // Kiểm tra xem Redis có khả dụng không
    this.checkRedisAvailability();
  }

  private async checkRedisAvailability(): Promise<void> {
    try {
      const redisClient = this.getRedisClient();
      if (redisClient) {
        // Thử ping Redis để kiểm tra kết nối
        await redisClient.ping();
        this.redisAvailable = true;
        this.logger.log('Redis is available for comment counters');
      } else {
        this.redisAvailable = false;
        this.logger.warn('Redis client is not available for comment counters, using memory cache instead');
      }
    } catch (error) {
      this.redisAvailable = false;
      this.logger.error(`Redis connection failed for comment counters: ${error.message}`);
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

  // Tăng số lượng comment của post
  async increment(postId: number): Promise<number> {
    if (this.redisAvailable) {
      const redisClient = this.getRedisClient();
      if (redisClient) {
        try {
          return await redisClient.incr(`post_comments:${postId}`);
        } catch (error) {
          this.logger.error(`Redis increment error: ${error.message}`);
        }
      }
    }
    
    // Fallback to memory cache
    const currentCount = this.memoryCache.get(postId) || 0;
    const newCount = currentCount + 1;
    this.memoryCache.set(postId, newCount);
    return newCount;
  }

  // Giảm số lượng comment của post
  async decrement(postId: number): Promise<number> {
    if (this.redisAvailable) {
      const redisClient = this.getRedisClient();
      if (redisClient) {
        try {
          const count = await redisClient.decr(`post_comments:${postId}`);
          
          // Đảm bảo không âm
          if (count < 0) {
            await redisClient.set(`post_comments:${postId}`, 0);
            return 0;
          }
          
          return count;
        } catch (error) {
          this.logger.error(`Redis decrement error: ${error.message}`);
        }
      }
    }
    
    // Fallback to memory cache
    const currentCount = this.memoryCache.get(postId) || 0;
    const newCount = Math.max(0, currentCount - 1);
    this.memoryCache.set(postId, newCount);
    return newCount;
  }

  // Lấy số lượng comment của post
  async getCount(postId: number): Promise<number> {
    if (this.redisAvailable) {
      const redisClient = this.getRedisClient();
      if (redisClient) {
        try {
          const count = await redisClient.get(`post_comments:${postId}`);
          return count ? parseInt(count, 10) : 0;
        } catch (error) {
          this.logger.error(`Redis get count error: ${error.message}`);
        }
      }
    }
    
    // Fallback to memory cache
    return this.memoryCache.get(postId) || 0;
  }

  // Đặt số lượng comment
  async setCount(postId: number, count: number): Promise<void> {
    if (this.redisAvailable) {
      const redisClient = this.getRedisClient();
      if (redisClient) {
        try {
          await redisClient.set(`post_comments:${postId}`, count);
          return;
        } catch (error) {
          this.logger.error(`Redis set count error: ${error.message}`);
        }
      }
    }
    
    // Fallback to memory cache
    this.memoryCache.set(postId, count);
  }

  // Xóa counter
  async removeCount(postId: number): Promise<void> {
    if (this.redisAvailable) {
      const redisClient = this.getRedisClient();
      if (redisClient) {
        try {
          await redisClient.del(`post_comments:${postId}`);
        } catch (error) {
          this.logger.error(`Redis remove count error: ${error.message}`);
        }
      }
    }
    
    // Fallback to memory cache
    this.memoryCache.delete(postId);
  }

  // Khởi tạo counters cho tất cả bài viết
  async initializeCounters(postIds: number[]): Promise<void> {
    // Sync với DB - đếm comment cho mỗi post
    const results = [];
    
    for (const postId of postIds) {
      try {
        // Đếm số lượng comment thực tế
        const commentCount = await this.commentsRepository.count({
          where: { post_id: postId }
        });
        
        // Cập nhật counter
        await this.setCount(postId, commentCount);
        results.push({ postId, commentCount, success: true });
      } catch (error) {
        this.logger.error(`Failed to initialize counter for post ${postId}: ${error.message}`);
        results.push({ postId, success: false, error: error.message });
      }
    }
    
    this.logger.debug(`Initialized ${results.filter(r => r.success).length}/${postIds.length} comment counters`);
  }
}