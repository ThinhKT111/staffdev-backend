// src/user-courses/dto/register-course.dto.ts
import { IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class RegisterCourseDto {
  @IsOptional()
  @IsNumber()
  userId?: number;

  @IsNotEmpty()
  @IsNumber()
  courseId: number;
}

// src/user-courses/dto/confirm-attendance.dto.ts
import { IsNotEmpty, IsNumber, IsDateString } from 'class-validator';

export class ConfirmAttendanceDto {
  @IsNotEmpty()
  @IsNumber()
  courseId: number;

  @IsNotEmpty()
  @IsDateString()
  date: string;
}