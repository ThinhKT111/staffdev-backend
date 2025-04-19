// src/assignments/dto/create-assignment.dto.ts
import { IsNotEmpty, IsString, IsNumber, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAssignmentDto {
  @ApiProperty({ example: 'Bài tập về biến và kiểu dữ liệu', description: 'Tiêu đề bài tập' })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty({ example: 'Làm các bài tập về khai báo biến...', description: 'Mô tả chi tiết bài tập' })
  @IsNotEmpty()
  @IsString()
  description: string;

  @ApiProperty({ example: 1, description: 'ID khóa học' })
  @IsNotEmpty()
  @IsNumber()
  courseId: number;

  @ApiProperty({ example: 3, description: 'Số lượng lần nộp bài tối đa' })
  @IsNotEmpty()
  @IsNumber()
  maxSubmissions: number;

  @ApiProperty({ example: '2023-12-31T23:59:59', description: 'Hạn nộp bài' })
  @IsNotEmpty()
  @IsDateString()
  deadline: string;
}