// src/assignments/dto/create-assignment.dto.ts
import { IsNotEmpty, IsString, IsNumber, IsDateString } from 'class-validator';

export class CreateAssignmentDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsString()
  description: string;

  @IsNotEmpty()
  @IsNumber()
  courseId: number;

  @IsNotEmpty()
  @IsNumber()
  maxSubmissions: number;

  @IsNotEmpty()
  @IsDateString()
  deadline: string;
}