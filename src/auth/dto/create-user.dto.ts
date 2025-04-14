// src/users/dto/create-user.dto.ts
import { IsEmail, IsNotEmpty, IsString, MinLength, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../entities/user.entity';

export class CreateUserDto {
  @ApiProperty({ example: '034095000123', description: 'CCCD/CMND của người dùng' })
  @IsNotEmpty()
  @IsString()
  cccd: string;

  @ApiProperty({ example: 'password123', description: 'Mật khẩu của người dùng' })
  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'user@example.com', description: 'Email của người dùng' })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({ example: '0912345678', description: 'Số điện thoại của người dùng' })
  @IsNotEmpty()
  @IsString()
  phone: string;

  @ApiProperty({ example: 'Nguyễn Văn A', description: 'Họ và tên đầy đủ của người dùng' })
  @IsNotEmpty()
  @IsString()
  fullName: string;

  @ApiProperty({ enum: UserRole, default: UserRole.EMPLOYEE, description: 'Vai trò của người dùng' })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @ApiProperty({ example: 1, description: 'ID phòng ban của người dùng' })
  @IsNotEmpty()
  departmentId: number;
}