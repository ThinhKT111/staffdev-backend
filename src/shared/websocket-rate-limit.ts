// src/shared/websocket-rate-limit.ts
import { Injectable } from '@nestjs/common';

@Injectable()
export class WebSocketRateLimiter {
  private messageCounters: Map<string, number> = new Map();
  private lastResetTime: number = Date.now();
  private readonly WINDOW_MS = 60000; // 1 phút
  private readonly MAX_MESSAGES = 100; // 100 messages per minute
  
  isRateLimited(clientId: string): boolean {
    // Reset counters if window expired
    if (Date.now() - this.lastResetTime > this.WINDOW_MS) {
      this.messageCounters.clear();
      this.lastResetTime = Date.now();
    }
    
    // Get current count for this client
    const currentCount = this.messageCounters.get(clientId) || 0;
    
    // Check if limit exceeded
    if (currentCount >= this.MAX_MESSAGES) {
      return true;
    }
    
    // Increment counter
    this.messageCounters.set(clientId, currentCount + 1);
    return false;
  }
}