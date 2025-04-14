// src/auth/dto/login.dto.ts
import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: '034095000123', description: 'CCCD/CMND của người dùng' })
  @IsNotEmpty()
  @IsString()
  cccd: string;

  @ApiProperty({ example: 'password', description: 'Mật khẩu của người dùng' })
  @IsNotEmpty()
  @IsString()
  password: string;
}