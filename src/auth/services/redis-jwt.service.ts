// src/auth/services/redis-jwt.service.ts
import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class RedisJwtService {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  // Tạo JWT token và lưu jti vào Redis
  async generateToken(payload: any): Promise<string> {
    const jti = uuidv4(); // JWT ID là unique
    const expiresIn = this.configService.get('JWT_EXPIRES_IN', '1d');
    
    const tokenPayload = {
      ...payload,
      jti, // Thêm JWT ID vào payload
    };
    
    const token = this.jwtService.sign(tokenPayload, { expiresIn });
    
    // Lưu jti vào Redis với thời gian sống tương đương với token
    const ttlSeconds = typeof expiresIn === 'string' 
      ? this.parseDuration(expiresIn) 
      : expiresIn;
    
    await this.cacheManager.set(`valid_jwt:${jti}`, true, ttlSeconds);
    
    return token;
  }

  // Kiểm tra token có hợp lệ không
  async validateToken(token: string): Promise<boolean> {
    try {
      const decoded = this.jwtService.verify(token);
      const jti = decoded.jti;
      
      if (!jti) {
        return false;
      }
      
      // Kiểm tra jti có tồn tại trong Redis không
      const isValid = await this.cacheManager.get(`valid_jwt:${jti}`);
      
      // Kiểm tra nếu user trong blacklist
      if (decoded.sub) {
        const userBlacklisted = await this.cacheManager.get(`user_blacklist:${decoded.sub}`);
        if (userBlacklisted) {
          return false;
        }
      }
      
      return !!isValid;
    } catch (error) {
      return false;
    }
  }

  // Thu hồi token bằng cách thêm vào blacklist
  async revokeToken(token: string): Promise<boolean> {
    try {
      const decoded = this.jwtService.verify(token);
      const jti = decoded.jti;
      
      if (!jti) {
        return false;
      }
      
      // Xóa jti khỏi danh sách token hợp lệ
      await this.cacheManager.del(`valid_jwt:${jti}`);
      
      return true;
    } catch (error) {
      return false;
    }
  }

  // Thu hồi tất cả token của một người dùng
  async revokeAllUserTokens(userId: number): Promise<void> {
    // Lưu timestamp vào blacklist để chặn tất cả token được tạo trước thời điểm này
    await this.cacheManager.set(`user_blacklist:${userId}`, Date.now(), 86400 * 7); // 7 ngày
  }

  // Chuyển đổi các định dạng thời gian thành giây
  private parseDuration(duration: string): number {
    const units = {
      s: 1,
      m: 60,
      h: 60 * 60,
      d: 24 * 60 * 60,
    };
    
    const match = duration.match(/^(\d+)([smhd])$/);
    if (match) {
      const value = parseInt(match[1], 10);
      const unit = match[2] as keyof typeof units;
      return value * units[unit];
    }
    
    return 3600; // Default 1 giờ
  }
}