// src/app.module.ts
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TrainingModule } from './training/training.module';
import { ForumModule } from './forum/forum.module';
import { TasksModule } from './tasks/tasks.module';
import { AttendanceModule } from './attendance/attendance.module';
import { DocumentsModule } from './documents/documents.module';
import { DepartmentsModule } from './departments/departments.module';
import { AssignmentsModule } from './assignments/assignments.module';
import { UserCoursesModule } from './user-courses/user-courses.module';
import { NotificationsModule } from './notifications/notifications.module';
import { DatabaseController } from './database.controller';
import { SeedModule } from './database/seeders/seed.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SharedModule } from './shared/shared.module';
import { ProfilesModule } from './profiles/profiles.module';
import { CacheModule } from '@nestjs/cache-manager';
import * as redisStore from 'cache-manager-redis-store';
import { GlobalRateLimitMiddleware } from './common/middlewares/global-rate-limit.middleware';
import { DatabaseService } from './database/database.service';
import { AppElasticsearchModule } from './elasticsearch/elasticsearch.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST') || 'localhost',
        port: +configService.get<number>('DB_PORT', 5432),
        username: configService.get('DB_USERNAME') || 'postgres',
        password: configService.get('DB_PASSWORD') || 'password',
        database: configService.get('DB_NAME') || 'staffdev',
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: false, // Ensure synchronize is turned off
        logging: configService.get('NODE_ENV') === 'development',
      }),
    }),
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        try {
          const redisHost = configService.get('REDIS_HOST', '192.168.178.204');
          const redisPort = parseInt(configService.get('REDIS_PORT', '6379'), 10);
          
          console.log(`Attempting to connect to Redis at ${redisHost}:${redisPort}`);
          
          // Sử dụng client Redis phiên bản mới
          const { createClient } = require('redis');
          const client = createClient({
            url: `redis://${redisHost}:${redisPort}`,
            socket: {
              connectTimeout: 5000, // Tăng timeout lên 5 giây
              reconnectStrategy: (retries) => Math.min(retries * 50, 2000), // Chiến lược kết nối lại
            }
          });
    
          // Thử kết nối
          await client.connect();
          const pingResult = await client.ping();
          console.log('Redis connection test:', pingResult);
          await client.disconnect();
          
          // Trả về cấu hình Redis nếu kết nối thành công
          return {
            store: redisStore,
            host: redisHost,
            port: redisPort,
            ttl: 60 * 60, // 1 giờ mặc định
            max: 5000, // Tăng số lượng items tối đa trong cache
            // Không cần password vì Redis trong WSL không có mật khẩu
          };
        } catch (error) {
          console.warn(`Failed to connect to Redis: ${error.message}, falling back to memory store`);
          return {
            ttl: 60 * 60, // 1 giờ mặc định
            max: 1000, // Số lượng items tối đa trong cache
          };
        }
      },
      inject: [ConfigService],
    }),
    AuthModule,
    UsersModule,
    TrainingModule,
    ForumModule,
    TasksModule,
    AttendanceModule,
    DocumentsModule,
    DepartmentsModule,
    AssignmentsModule,
    UserCoursesModule,
    NotificationsModule,
    SeedModule,
    SharedModule,
    ProfilesModule,
    AppElasticsearchModule
  ],
  controllers: [AppController, DatabaseController],
  providers: [AppService, DatabaseService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(GlobalRateLimitMiddleware)
      .forRoutes('*');
  }
}