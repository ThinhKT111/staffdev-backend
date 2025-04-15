// src/user-courses/user-courses.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserCoursesService } from './user-courses.service';
import { UserCoursesController } from './user-courses.controller';
import { UserCourse } from '../entities/user-course.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UserCourse])],
  providers: [UserCoursesService],
  controllers: [UserCoursesController],
  exports: [UserCoursesService],
})
export class UserCoursesModule {}