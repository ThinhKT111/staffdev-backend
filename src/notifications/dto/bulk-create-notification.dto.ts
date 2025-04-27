// src/notifications/dto/bulk-create-notification.dto.ts
import { IsNotEmpty, IsString, IsEnum, IsArray, IsNumber } from 'class-validator';

export class BulkCreateNotificationDto {
  @IsNotEmpty()
  @IsArray()
  userIds: number[];

  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsString()
  content: string;

  @IsNotEmpty()
  @IsEnum(['Task', 'Assignment', 'Training', 'General'])
  type: string;
}