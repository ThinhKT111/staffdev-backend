// src/user-courses/dto/enroll-course.dto.ts
import { IsNotEmpty, IsNumber } from 'class-validator';

export class EnrollCourseDto {
  @IsNotEmpty()
  @IsNumber()
  userId: number;

  @IsNotEmpty()
  @IsNumber()
  courseId: number;
}