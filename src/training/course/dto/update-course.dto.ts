// src/training/course/dto/update-course.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateCourseDto } from './create-course.dto';
import { IsOptional, IsString, IsNumber, IsBoolean } from 'class-validator';

export class UpdateCourseDto extends PartialType(CreateCourseDto) {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  trainingPathId?: number;

  @IsOptional()
  @IsString()
  type?: 'Online' | 'Offline' | 'Video' | 'Document';

  @IsOptional()
  @IsNumber()
  durationHours?: number;

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