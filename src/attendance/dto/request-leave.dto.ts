// src/attendance/dto/request-leave.dto.ts
import { IsNotEmpty, IsNumber, IsString, IsDateString, IsOptional } from 'class-validator';

export class RequestLeaveDto {
  @IsOptional()
  @IsNumber()
  userId?: number;

  @IsNotEmpty()
  @IsString()
  leaveType: 'Annual' | 'Sick' | 'Unpaid';

  @IsNotEmpty()
  @IsDateString()
  date: string;

  @IsOptional()
  @IsString()
  note?: string;

  // Thêm trường để tương thích với test-api.js
  @IsOptional()
  @IsString()
  get leave_type(): string {
    return this.leaveType;
  }

  set leave_type(value: string) {
    this.leaveType = value as any;
  }

  @IsOptional()
  @IsString()
  get leave_date(): string {
    return this.date;
  }

  set leave_date(value: string) {
    this.date = value;
  }
}