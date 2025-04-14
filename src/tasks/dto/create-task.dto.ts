// src/tasks/dto/create-task.dto.ts
import { IsNotEmpty, IsString, IsNumber, IsOptional, IsDateString } from 'class-validator';

export class CreateTaskDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsString()
  description: string;

  @IsNotEmpty()
  @IsNumber()
  assignedTo: number;

  @IsNotEmpty()
  @IsNumber()
  assignedBy: number;

  @IsNotEmpty()
  @IsDateString()
  deadline: string;

  @IsOptional()
  @IsString()
  status?: 'Pending' | 'InProgress' | 'Completed' | 'Rejected';
}