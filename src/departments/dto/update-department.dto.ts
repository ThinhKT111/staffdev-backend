// src/departments/dto/update-department.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateDepartmentDto } from './create-department.dto';
import { IsOptional, IsString, IsNumber } from 'class-validator';

export class UpdateDepartmentDto extends PartialType(CreateDepartmentDto) {
  @IsOptional()
  @IsString()
  departmentName?: string;

  @IsOptional()
  @IsNumber()
  managerId?: number;

  @IsOptional()
  @IsString()
  description?: string;
}