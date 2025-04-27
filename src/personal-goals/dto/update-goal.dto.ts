// src/personal-goals/dto/update-goal.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { IsOptional, IsString } from 'class-validator';
import { CreateGoalDto } from './create-goal.dto';

export class UpdateGoalDto extends PartialType(CreateGoalDto) {
  @IsOptional()
  @IsString()
  status?: 'Pending' | 'InProgress' | 'Completed' | 'Rejected';
}