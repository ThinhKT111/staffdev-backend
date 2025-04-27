// src/personal-goals/dto/create-goal.dto.ts
import { IsNotEmpty, IsString, IsDateString, IsOptional } from 'class-validator';

export class CreateGoalDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsString()
  description: string;

  @IsNotEmpty()
  @IsDateString()
  deadline: string;
}

// src/personal-goals/dto/update-goal.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { IsOptional, IsString, IsDateString } from 'class-validator';
import { CreateGoalDto } from './create-goal.dto';

export class UpdateGoalDto extends PartialType(CreateGoalDto) {
  @IsOptional()
  @IsString()
  status?: 'Pending' | 'InProgress' | 'Completed' | 'Rejected';
}