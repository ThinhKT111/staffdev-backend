// src/elasticsearch/dto/search-query.dto.ts
import { IsString, IsOptional, IsNumber, Min, Max, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';
import { UserRole } from '../../entities/user.entity';

export class BaseSearchQueryDto {
  @IsString()
  @IsOptional()
  query?: string;

  @IsNumber()
  @Min(1)
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  page?: number = 1;

  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  size?: number = 10;
}

export class ForumSearchQueryDto extends BaseSearchQueryDto {}

export class CommentSearchQueryDto extends BaseSearchQueryDto {
  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  postId?: number;
}

export class DocumentSearchQueryDto extends BaseSearchQueryDto {
  @IsString()
  @IsOptional()
  category?: string;
}

export class NotificationSearchQueryDto extends BaseSearchQueryDto {
  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  userId?: number;
}

export class TaskSearchQueryDto extends BaseSearchQueryDto {
  @IsString()
  @IsOptional()
  status?: string;

  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  userId?: number;
}

export class UserSearchQueryDto extends BaseSearchQueryDto {
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  departmentId?: number;
}

export class SystemLogQueryDto extends BaseSearchQueryDto {
  @IsString()
  @IsOptional()
  level?: string;

  @IsString()
  @IsOptional()
  startDate?: string;

  @IsString()
  @IsOptional()
  endDate?: string;
}