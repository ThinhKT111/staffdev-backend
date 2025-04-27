// src/personal-goals/dto/create-goal.dto.ts
import { IsNotEmpty, IsString, IsDateString } from 'class-validator';

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