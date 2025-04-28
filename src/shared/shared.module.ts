// src/shared/shared.module.ts
import { Module, Global } from '@nestjs/common';
import { FileUploadService } from './file-upload.service';
import { ConfigModule } from '@nestjs/config';
import { WebSocketClient } from './websocket.client';
import { RateLimiterService } from '../common/services/rate-limiter.service';
import { QueueService } from './services/queue.service';
import { OnlineUsersService } from './services/online-users.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    FileUploadService, 
    WebSocketClient, 
    RateLimiterService, 
    QueueService,
    OnlineUsersService
  ],
  exports: [
    FileUploadService, 
    WebSocketClient, 
    RateLimiterService, 
    QueueService,
    OnlineUsersService
  ],
})
export class SharedModule {}