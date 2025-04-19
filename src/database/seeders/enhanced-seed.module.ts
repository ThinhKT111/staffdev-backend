// src/database/seeders/enhanced-seed.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EnhancedSeedService } from './enhanced-seed.service';
import { User } from '../../entities/user.entity';
import { Department } from '../../entities/department.entity';
import { Profile } from '../../entities/profile.entity';
import { TrainingPath } from '../../entities/training-path.entity';
import { Course } from '../../entities/course.entity';
import { Task } from '../../entities/task.entity';
import { ForumPost } from '../../entities/forum-post.entity';
import { ForumComment } from '../../entities/forum-comment.entity';
import { UserCourse } from '../../entities/user-course.entity';
import { Attendance } from '../../entities/attendance.entity';
import { Notification } from '../../entities/notification.entity';
import { Assignment } from '../../entities/assignment.entity';
import { Submission } from '../../entities/submission.entity';
import { Document } from '../../entities/document.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User, 
      Department, 
      Profile, 
      TrainingPath, 
      Course, 
      Task,
      ForumPost,
      ForumComment,
      UserCourse,
      Attendance,
      Notification,
      Assignment,
      Submission,
      Document
    ])
  ],
  providers: [EnhancedSeedService],
  exports: [EnhancedSeedService],
})
export class EnhancedSeedModule {}