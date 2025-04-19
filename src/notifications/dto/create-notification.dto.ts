// src/notifications/dto/create-notification.dto.ts
import { IsNotEmpty, IsString, IsNumber, IsEnum } from 'class-validator';

export class CreateNotificationDto {
  @IsNotEmpty()
  @IsNumber()
  userId: number;

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