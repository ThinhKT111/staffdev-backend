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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
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
        synchronize: false,
      }),
    }),
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        try {
          // Kiểm tra Redis config
          const redisHost = configService.get('REDIS_HOST');
          const redisPort = configService.get('REDIS_PORT');
          
          if (!redisHost || !redisPort) {
            console.warn('Redis configuration missing, falling back to memory store');
            return {
              ttl: 60 * 60, // 1 giờ mặc định
              max: 1000, // Số lượng items tối đa trong cache
            };
          }
          
          // Cố gắng kết nối Redis
          const redis = require('redis');
          const client = redis.createClient({
            host: redisHost,
            port: redisPort,
          });
          
          // Kiểm tra kết nối Redis
          await new Promise((resolve, reject) => {
            client.on('connect', resolve);
            client.on('error', reject);
            // Timeout sau 3 giây
            setTimeout(() => reject(new Error('Redis connection timeout')), 3000);
          });
          
          // Nếu đến đây, Redis đã kết nối thành công
          console.log('Redis connected successfully, using Redis store');
          client.quit();
          
          return {
            store: redisStore,
            host: redisHost,
            port: redisPort,
            ttl: 60 * 60, // 1 giờ mặc định
            max: 1000, // Số lượng items tối đa trong cache
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
  ],
  controllers: [AppController, DatabaseController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(GlobalRateLimitMiddleware)
      .forRoutes('*');
  }
}