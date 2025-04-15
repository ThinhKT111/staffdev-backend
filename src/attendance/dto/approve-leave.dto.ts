// src/attendance/dto/approve-leave.dto.ts
import { IsNotEmpty, IsNumber, IsString, IsOptional } from 'class-validator';

export class ApproveLeaveDto {
  @IsNotEmpty()
  @IsNumber()
  leaveId: number;

  @IsOptional()
  @IsString()
  note?: string;
}