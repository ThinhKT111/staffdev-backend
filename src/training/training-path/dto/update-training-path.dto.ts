// src/training/training-path/dto/update-training-path.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateTrainingPathDto } from './create-training-path.dto';
import { IsOptional, IsString, IsNumber, IsBoolean } from 'class-validator';

export class UpdateTrainingPathDto extends PartialType(CreateTrainingPathDto) {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  departmentId?: number;

  @IsOptional()
  @IsString()
  duration?: 'ShortTerm' | 'LongTerm';

  @IsOptional()
  @IsNumber()
  totalCourses?: number;

  @IsOptional()
  @IsNumber()
  durationInWeeks?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}