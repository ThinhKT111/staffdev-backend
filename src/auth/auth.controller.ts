// src/auth/auth.controller.ts
import { Controller, Post, UseGuards, Request, Body, Patch } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginWithDeviceDto } from './dto/login-with-device.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { CreateUserDto } from './dto/create-user.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Request() req, @Body('token2FA') token2FA?: string) {
    return this.authService.login(req.user, token2FA);
  }

  @Patch('change-password')
  @UseGuards(JwtAuthGuard)
  async changePassword(@Request() req, @Body() changePasswordDto: ChangePasswordDto) {
    return this.authService.changePassword(
      req.user.userId,
      changePasswordDto.currentPassword,
      changePasswordDto.newPassword
    );
  }

  @UseGuards(LocalAuthGuard)
  @Post('login-with-device')
  async loginWithDevice(@Request() req, @Body() loginDeviceDto: LoginWithDeviceDto) {
    const result = await this.authService.login(req.user);
    
    // Lưu thông tin thiết bị nếu có
    if (loginDeviceDto.deviceId && loginDeviceDto.deviceName) {
      await this.authService.recordDeviceLogin(
        req.user.user_id,
        loginDeviceDto.deviceId,
        loginDeviceDto.deviceName
      );
    }
  
    return result;
  }

  @Post('forgot-password')
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto.email);
  }

  @Post('reset-password')
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(
      resetPasswordDto.token,
      resetPasswordDto.newPassword
    );
  }

  @Post('register')
  async register(@Body() createUserDto: CreateUserDto) {
    return this.authService.register(createUserDto);
  }
}