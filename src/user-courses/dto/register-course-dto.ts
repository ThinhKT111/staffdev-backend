// src/user-courses/dto/register-course-dto.ts
import { IsNotEmpty, IsNumber, IsOptional, IsDateString } from 'class-validator';

export class RegisterCourseDto {
  @IsOptional()
  @IsNumber()
  userId?: number;

  @IsNotEmpty()
  @IsNumber()
  courseId: number;
}

export class ConfirmAttendanceDto {
  @IsNotEmpty()
  @IsNumber()
  courseId: number;

  @IsNotEmpty()
  @IsDateString()
  date: string;
}