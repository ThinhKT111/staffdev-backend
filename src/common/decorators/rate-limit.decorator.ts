// src/common/decorators/rate-limit.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const RATE_LIMIT_KEY = 'rate_limit';
export const RATE_LIMIT_WINDOW_KEY = 'rate_limit_window';

export const RateLimit = (limit: number, windowSeconds: number = 60) => {
  return (target: any, key: string, descriptor: PropertyDescriptor) => {
    SetMetadata(RATE_LIMIT_KEY, limit)(target, key, descriptor);
    SetMetadata(RATE_LIMIT_WINDOW_KEY, windowSeconds)(target, key, descriptor);
    return descriptor;
  };
};