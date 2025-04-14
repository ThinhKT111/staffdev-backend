// src/attendance/dto/check-in.dto.ts
import { IsNotEmpty, IsNumber } from 'class-validator';

export class CheckInDto {
  @IsNotEmpty()
  @IsNumber()
  userId: number;
}