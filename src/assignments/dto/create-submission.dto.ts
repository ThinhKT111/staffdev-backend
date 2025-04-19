// src/assignments/dto/create-submission.dto.ts
import { IsNotEmpty, IsString, IsNumber, IsOptional } from 'class-validator';

export class CreateSubmissionDto {
  @IsNotEmpty()
  @IsNumber()
  assignmentId: number;

  @IsNotEmpty()
  @IsNumber()
  userId: number;

  @IsNotEmpty()
  @IsString()
  submissionContent: string;

  @IsOptional()
  @IsNumber()
  testcasePassed?: number;

  @IsOptional()
  @IsNumber()
  totalTestcases?: number;
}