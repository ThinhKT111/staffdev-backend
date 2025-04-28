// src/common/interceptors/http-cache.interceptor.ts
import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Inject } from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Request } from 'express';

@Injectable()
export class HttpCacheInterceptor implements NestInterceptor {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest<Request>();
    
    // Bỏ qua cache cho các method không phải GET
    if (request.method !== 'GET') {
      return next.handle();
    }
    
    const cacheKey = `http_cache:${request.originalUrl}`;
    const cachedResponse = await this.cacheManager.get(cacheKey);
    
    if (cachedResponse) {
      return of(cachedResponse);
    }
    
    return next.handle().pipe(
      tap(async (response) => {
        // Lưu response vào cache với thời gian 30 phút
        await this.cacheManager.set(cacheKey, response, 1800);
      }),
    );
  }
}