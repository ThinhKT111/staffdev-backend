// src/attendance/dto/request-leave.dto.ts
import { IsNotEmpty, IsNumber, IsString, IsDateString } from 'class-validator';

export class RequestLeaveDto {
  @IsNotEmpty()
  @IsNumber()
  userId: number;

  @IsNotEmpty()
  @IsString()
  leaveType: 'Annual' | 'Sick' | 'Unpaid';

  @IsNotEmpty()
  @IsDateString()
  date: string;

  @IsNotEmpty()
  @IsString()
  reason: string;
}