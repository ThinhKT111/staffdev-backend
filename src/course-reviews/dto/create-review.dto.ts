// src/course-reviews/dto/create-review.dto.ts
import { IsNotEmpty, IsNumber, IsString, IsOptional, Min, Max } from 'class-validator';

export class CreateReviewDto {
  @IsNotEmpty()
  @IsNumber()
  courseId: number;

  @IsNotEmpty()
  @IsString()
  review: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  score?: number;
}