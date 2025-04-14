// src/training/course/dto/create-course.dto.ts
import { IsNotEmpty, IsString, IsOptional, IsNumber, IsBoolean } from 'class-validator';

export class CreateCourseDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsString()
  description: string;

  @IsNotEmpty()
  @IsNumber()
  trainingPathId: number;

  @IsNotEmpty()
  @IsString()
  type: 'Online' | 'Offline' | 'Video' | 'Document';

  @IsNotEmpty()
  @IsNumber()
  durationHours: number;

  @IsOptional()
  @IsString()
  level?: 'beginner' | 'intermediate' | 'advanced';

  @IsOptional()
  @IsNumber()
  totalLessons?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}