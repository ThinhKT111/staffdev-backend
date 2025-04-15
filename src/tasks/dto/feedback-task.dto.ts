// src/tasks/dto/feedback-task.dto.ts
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class FeedbackTaskDto {
  @IsNotEmpty()
  @IsNumber()
  score: number;

  @IsNotEmpty()
  @IsString()
  feedback: string;
}