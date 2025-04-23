// src/app.module.ts
import { Module } from '@nestjs/common';
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
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        store: redisStore,
        host: configService.get('REDIS_HOST', 'localhost'),
        port: configService.get('REDIS_PORT', 6379),
        ttl: 60 * 60, // 1 giờ
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AppController, DatabaseController],
  providers: [AppService],
})
export class AppModule {}