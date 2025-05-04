// src/auth/auth.controller.ts
import { Controller, Post, UseGuards, Request, Body, Patch, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginWithDeviceDto } from './dto/login-with-device.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { AuthCreateUserDto } from './dto/create-user.dto';

import { RateLimit } from '../common/decorators/rate-limit.decorator';
import { RateLimitGuard } from '../common/guards/rate-limit.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @UseGuards(LocalAuthGuard, RateLimitGuard)
  @RateLimit(5, 60) // 5 requests/minute
  @Post('login')
  async login(@Request() req, @Body() loginDto: LoginDto, @Body('token2FA') token2FA?: string) {
    return this.authService.login(req.user, token2FA);
  }

  @UseGuards(RateLimitGuard)
  @RateLimit(3, 300) // 3 requests/5 minutes
  @Post('forgot-password')
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto.email);
  }

  @UseGuards(RateLimitGuard)
  @RateLimit(3, 300) // 3 requests/5 minutes
  @Post('reset-password')
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(
      resetPasswordDto.token,
      resetPasswordDto.newPassword
    );
  }

  @Post('register')
  @UseGuards(RateLimitGuard)
  @RateLimit(5, 300) // 5 requests/5 minutes
  async register(@Body() createUserDto: AuthCreateUserDto) {
    return this.authService.register(createUserDto);
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
  
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@Request() req) {
    const token = this.extractTokenFromRequest(req);
    
    if (!token) {
      throw new UnauthorizedException('Token không hợp lệ');
    }
    
    const success = await this.authService.logout(token);
    
    return { 
      success, 
      message: success ? 'Đăng xuất thành công' : 'Đăng xuất thất bại' 
    };
  }
  
  @Post('device/logout')
  @UseGuards(JwtAuthGuard)
  async logoutFromDevice(@Request() req, @Body('deviceId') deviceId: string) {
    const success = await this.authService.logoutFromDevice(req.user.userId, deviceId);
    
    return {
      success,
      message: success ? 'Đã đăng xuất từ thiết bị' : 'Không thể đăng xuất từ thiết bị'
    };
  }
  
  @Post('devices')
  @UseGuards(JwtAuthGuard)
  async getUserDevices(@Request() req) {
    const devices = await this.authService.getUserDevices(req.user.userId);
    
    return { devices };
  }
  
  private extractTokenFromRequest(req: any): string | null {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    
    return authHeader.substring(7);
  }
}