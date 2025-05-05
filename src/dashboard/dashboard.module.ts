// src/dashboard/dashboard.module.ts
import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { ElasticsearchService } from '../elasticsearch/elasticsearch.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { Task } from '../entities/task.entity';
import { Attendance } from '../entities/attendance.entity';
import { UserCourse } from '../entities/user-course.entity';
import { Course } from '../entities/course.entity';
import { ForumPost } from '../entities/forum-post.entity';
import { AppElasticsearchModule } from '../elasticsearch/elasticsearch.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Task,
      Attendance,
      UserCourse,
      Course,
      ForumPost,
    ]),
    AppElasticsearchModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}