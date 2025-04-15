// src/training/training.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TrainingPathService } from './training-path/training-path.service';
import { TrainingPathController } from './training-path/training-path.controller';
import { CourseService } from './course/course.service';
import { CourseController } from './course/course.controller';
import { TrainingPath } from '../entities/training-path.entity';
import { Course } from '../entities/course.entity';
import { UserCourse } from '../entities/user-course.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TrainingPath, Course, UserCourse])],
  providers: [TrainingPathService, CourseService],
  controllers: [TrainingPathController, CourseController]
})
export class TrainingModule {}