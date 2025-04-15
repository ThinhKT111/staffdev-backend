// src/assignments/dto/create-assignment.dto.ts
import { IsNotEmpty, IsString, IsNumber, IsDateString, IsOptional } from 'class-validator';

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

// src/assignments/dto/update-assignment.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateAssignmentDto } from './create-assignment.dto';

export class UpdateAssignmentDto extends PartialType(CreateAssignmentDto) {}

// src/assignments/dto/create-submission.dto.ts
import { IsNotEmpty, IsString, IsNumber } from 'class-validator';

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