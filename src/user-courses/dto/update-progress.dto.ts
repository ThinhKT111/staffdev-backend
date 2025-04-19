// src/user-courses/dto/update-progress.dto.ts
import { IsNotEmpty, IsEnum, IsOptional, IsNumber, IsDateString } from 'class-validator';

export class UpdateProgressDto {
  @IsNotEmpty()
  @IsEnum(['NotStarted', 'InProgress', 'Completed'])
  status: string;

  @IsOptional()
  @IsDateString()
  completionDate?: string;

  @IsOptional()
  @IsNumber()
  score?: number;
}