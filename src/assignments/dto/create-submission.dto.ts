// src/assignments/dto/create-submission.dto.ts
import { IsNotEmpty, IsString, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSubmissionDto {
  @ApiProperty({ example: 1, description: 'ID bài tập' })
  @IsNotEmpty()
  @IsNumber()
  assignmentId: number;

  @ApiProperty({ example: 1, description: 'ID người dùng' })
  @IsNotEmpty()
  @IsNumber()
  userId: number;

  @ApiProperty({ example: 'function solution() {...}', description: 'Nội dung bài nộp' })
  @IsNotEmpty()
  @IsString()
  submissionContent: string;

  @ApiProperty({ example: 8, description: 'Số lượng test case đã vượt qua', required: false })
  @IsOptional()
  @IsNumber()
  testcasePassed?: number;

  @ApiProperty({ example: 10, description: 'Tổng số test case', required: false })
  @IsOptional()
  @IsNumber()
  totalTestcases?: number;
}