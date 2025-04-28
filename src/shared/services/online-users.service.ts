// src/shared/services/online-users.service.ts
import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class OnlineUsersService {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  // Đánh dấu user online
  async addOnlineUser(userId: number): Promise<number> {
    const redisClient = (this.cacheManager as any).store.getClient();
    await redisClient.sadd('online_users', userId.toString());
    return this.countOnlineUsers();
  }

  // Đánh dấu user offline
  async removeOnlineUser(userId: number): Promise<number> {
    const redisClient = (this.cacheManager as any).store.getClient();
    await redisClient.srem('online_users', userId.toString());
    return this.countOnlineUsers();
  }

  // Đếm số người dùng online
  async countOnlineUsers(): Promise<number> {
    const redisClient = (this.cacheManager as any).store.getClient();
    return redisClient.scard('online_users');
  }

  // Lấy danh sách người dùng đang online
  async getOnlineUsers(): Promise<number[]> {
    const redisClient = (this.cacheManager as any).store.getClient();
    const members = await redisClient.smembers('online_users');
    return members.map(userId => parseInt(userId, 10));
  }

  // Kiểm tra một người dùng có online không
  async isUserOnline(userId: number): Promise<boolean> {
    const redisClient = (this.cacheManager as any).store.getClient();
    return !!(await redisClient.sismember('online_users', userId.toString()));
  }
}