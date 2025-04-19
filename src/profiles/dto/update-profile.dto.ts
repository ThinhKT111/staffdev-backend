// src/profiles/dto/update-profile.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateProfileDto } from './create-profile.dto';
import { IsOptional, IsString, IsDateString } from 'class-validator';

export class UpdateProfileDto extends PartialType(CreateProfileDto) {
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  experience?: string;

  @IsOptional()
  @IsString()
  skills?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;
}