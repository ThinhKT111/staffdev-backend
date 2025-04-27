// src/auth/dto/login-with-device.dto.ts
import { IsNotEmpty, IsString, IsOptional } from 'class-validator';
import { LoginDto } from './login.dto';

export class LoginWithDeviceDto extends LoginDto {
  @IsOptional()
  @IsString()
  deviceName?: string;

  @IsOptional()
  @IsString()
  deviceId?: string;
}