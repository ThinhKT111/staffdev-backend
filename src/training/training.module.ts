import { Module } from '@nestjs/common';
import { TrainingPathService } from './training-path/training-path.service';
import { TrainingPathController } from './training-path/training-path.controller';
import { CourseService } from './course/course.service';
import { CourseController } from './course/course.controller';

@Module({
  providers: [TrainingPathService, CourseService],
  controllers: [TrainingPathController, CourseController]
})
export class TrainingModule {}
