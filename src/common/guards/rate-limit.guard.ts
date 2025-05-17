// src/common/guards/rate-limit.guard.ts
import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RateLimiterService } from '../services/rate-limiter.service';
import { RATE_LIMIT_KEY, RATE_LIMIT_WINDOW_KEY } from '../decorators/rate-limit.decorator';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private rateLimiterService: RateLimiterService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Lấy limit từ decorator
    const limit = this.reflector.get<number>(RATE_LIMIT_KEY, context.getHandler()) || 60;
    const windowSeconds = this.reflector.get<number>(RATE_LIMIT_WINDOW_KEY, context.getHandler()) || 60;
    
    const request = context.switchToHttp().getRequest();
    
    // Xác định key dựa trên IP hoặc userId
    let key = request.ip || request.headers['x-forwarded-for'] || 'anonymous';
    
    // Kiểm tra cả userId và sub để đảm bảo hoạt động đúng với token JWT
    if (request.user) {
      const userId = request.user.userId || request.user.sub;
      if (userId) {
        key = `user:${userId}`;
      }
    }
    
    // Thêm endpoint vào key để tách biệt rate limit
    const endpoint = `${request.method}:${request.route?.path || request.url}`;
    key = `${key}:${endpoint}`;
    
    const isLimited = await this.rateLimiterService.isRateLimited(key, limit, windowSeconds);
    
    if (isLimited) {
      throw new HttpException({
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        message: 'Quá nhiều yêu cầu, vui lòng thử lại sau',
        error: 'Too Many Requests',
      }, HttpStatus.TOO_MANY_REQUESTS);
    }
    
    return true;
  }
}