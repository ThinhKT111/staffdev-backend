// src/notifications/dto/mark-as-read.dto.ts
import { IsBoolean, IsOptional } from 'class-validator';

export class MarkAsReadDto {
  @IsOptional()
  @IsBoolean()
  isRead?: boolean;
}