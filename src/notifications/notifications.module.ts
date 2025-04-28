// src/notifications/notifications.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsGateway } from './notifications.gateway';
import { Notification } from '../entities/notification.entity';
import { User } from '../entities/user.entity';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { WebSocketRateLimiter } from '../shared/websocket-rate-limit';
import { UnreadCounterService } from './services/unread-counter.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, User]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'staffdev_secret_key',
        signOptions: { expiresIn: '1d' },
      }),
    }),
  ],
  providers: [
    NotificationsService, 
    NotificationsGateway, 
    WebSocketRateLimiter,
    UnreadCounterService
  ],
  controllers: [NotificationsController],
  exports: [NotificationsService, NotificationsGateway, UnreadCounterService],
})
export class NotificationsModule {}