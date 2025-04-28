// src/forum/services/comment-counter.service.ts
import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ForumComment } from '../../entities/forum-comment.entity';

@Injectable()
export class CommentCounterService {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @InjectRepository(ForumComment)
    private commentsRepository: Repository<ForumComment>,
  ) {}

  // Tăng số lượng comment của post
  async increment(postId: number): Promise<number> {
    const redisClient = (this.cacheManager.store as any).getClient();
    return redisClient.incr(`post_comments:${postId}`);
  }

  // Giảm số lượng comment của post
  async decrement(postId: number): Promise<number> {
    const redisClient = (this.cacheManager.store as any).getClient();
    const count = await redisClient.decr(`post_comments:${postId}`);
    
    // Đảm bảo không âm
    if (count < 0) {
      await redisClient.set(`post_comments:${postId}`, 0);
      return 0;
    }
    
    return count;
  }

  // Lấy số lượng comment của post
  async getCount(postId: number): Promise<number> {
    const redisClient = (this.cacheManager.store as any).getClient();
    const count = await redisClient.get(`post_comments:${postId}`);
    return count ? parseInt(count, 10) : 0;
  }

  // Đặt số lượng comment
  async setCount(postId: number, count: number): Promise<void> {
    const redisClient = (this.cacheManager.store as any).getClient();
    await redisClient.set(`post_comments:${postId}`, count);
  }

  // Xóa counter
  async removeCount(postId: number): Promise<void> {
    const redisClient = (this.cacheManager.store as any).getClient();
    await redisClient.del(`post_comments:${postId}`);
  }

  // Khởi tạo counters cho tất cả bài viết
  async initializeCounters(postIds: number[]): Promise<void> {
    const pipeline = (this.cacheManager.store as any).client.pipeline();
    
    for (const postId of postIds) {
      // Đếm số lượng comment thực tế
      const commentCount = await this.commentsRepository.count({
        where: { post_id: postId }
      });
      
      pipeline.set(`post_comments:${postId}`, commentCount);
    }
    
    await pipeline.exec();
  }
}