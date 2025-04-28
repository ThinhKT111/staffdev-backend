// src/common/middlewares/global-rate-limit.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { RateLimiterService } from '../services/rate-limiter.service';

@Injectable()
export class GlobalRateLimitMiddleware implements NestMiddleware {
  constructor(private rateLimiterService: RateLimiterService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const ip = req.ip || req.headers['x-forwarded-for'] || 'anonymous';
    
    // Rate limit tổng thể: 1000 request mỗi IP mỗi phút
    const isLimited = await this.rateLimiterService.isRateLimited(`global:${ip}`, 1000, 60);
    
    if (isLimited) {
      return res.status(429).json({
        statusCode: 429,
        message: 'Quá nhiều yêu cầu, vui lòng thử lại sau',
        error: 'Too Many Requests',
      });
    }
    
    next();
  }
}