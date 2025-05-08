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
import helmet from 'helmet'; // Sửa lỗi import

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
        synchronize: false, // Đảm bảo tắt đồng bộ hóa
        logging: configService.get('NODE_ENV') === 'development',
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
          
          // Thử kết nối Redis
          try {
            const Redis = require('redis');
            const client = Redis.createClient({
              host: redisHost,
              port: redisPort,
              socket: {
                connectTimeout: 1000, // Giảm timeout xuống 1 giây
              }
            });
            
            return new Promise((resolve, reject) => {
              client.on('connect', () => {
                client.quit();
                console.log('Redis connected successfully, using Redis store');
                resolve({
                  store: redisStore,
                  host: redisHost,
                  port: redisPort,
                  ttl: 60 * 60, // 1 giờ mặc định
                  max: 1000, // Số lượng items tối đa trong cache
                });
              });
              
              client.on('error', (err) => {
                console.warn(`Failed to connect to Redis: ${err.message}, falling back to memory store`);
                resolve({
                  ttl: 60 * 60, // 1 giờ mặc định
                  max: 1000, // Số lượng items tối đa trong cache
                });
              });
              
              // Timeout sau 1 giây
              setTimeout(() => {
                try {
                  client.quit().catch(() => {}); // Bắt lỗi nếu client đã đóng
                } catch (e) {
                  // Bỏ qua lỗi nếu client đã đóng
                }
                console.warn('Redis connection timeout, falling back to memory store');
                resolve({
                  ttl: 60 * 60, // 1 giờ mặc định
                  max: 1000, // Số lượng items tối đa trong cache
                });
              }, 1000);
            });
          } catch (error) {
            console.warn(`Error initializing Redis: ${error.message}, falling back to memory store`);
            return {
              ttl: 60 * 60, // 1 giờ mặc định
              max: 1000, // Số lượng items tối đa trong cache
            };
          }
        } catch (error) {
          console.warn(`Generic error in cache config: ${error.message}, falling back to memory store`);
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
  providers: [AppService, DatabaseService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(GlobalRateLimitMiddleware)
      .forRoutes('*');
  }
}