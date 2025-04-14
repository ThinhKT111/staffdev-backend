// src/training/training-path/dto/create-training-path.dto.ts
import { IsNotEmpty, IsString, IsOptional, IsNumber, IsBoolean } from 'class-validator';

export class CreateTrainingPathDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsString()
  description: string;

  @IsOptional()
  @IsNumber()
  departmentId?: number;

  @IsNotEmpty()
  @IsString()
  duration: 'ShortTerm' | 'LongTerm';

  @IsNotEmpty()
  @IsNumber()
  createdBy: number;

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