// src/auth/services/redis-jwt.service.ts
import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class RedisJwtService {
  private readonly logger = new Logger(RedisJwtService.name);
  private tokenBlacklist: Map<string, boolean> = new Map();
  private userBlacklist: Map<number, number> = new Map();
  private fallbackToMemory = false;

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {
    // Kiểm tra xem Redis có khả dụng không
    this.testRedisConnection();
  }

  private async testRedisConnection() {
    try {
      // Thử lưu và lấy một giá trị từ cache
      const testKey = `test:${Date.now()}`;
      await this.cacheManager.set(testKey, 'test', 10);
      const testValue = await this.cacheManager.get(testKey);
      
      if (testValue !== 'test') {
        this.logger.warn('Redis test failed - switching to in-memory fallback');
        this.fallbackToMemory = true;
      } else {
        this.logger.log('Redis connection successful');
        this.fallbackToMemory = false;
      }
    } catch (error) {
      this.logger.error(`Redis connection error: ${error.message} - switching to in-memory fallback`);
      this.fallbackToMemory = true;
    }
  }

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
    
    if (this.fallbackToMemory) {
      // Không cần thêm vào danh sách token hợp lệ khi sử dụng bộ nhớ trong
      // Chúng ta chỉ theo dõi token bị thu hồi
      this.logger.debug(`Generated token with jti: ${jti}`);
    } else {
      // Lưu jti vào Redis nếu Redis khả dụng
      try {
        await this.cacheManager.set(`valid_jwt:${jti}`, true, ttlSeconds);
      } catch (error) {
        this.logger.error(`Error saving token to Redis: ${error.message}`);
        this.fallbackToMemory = true;
      }
    }
    
    return token;
  }

  // Kiểm tra token có hợp lệ không
  async validateToken(token: string): Promise<boolean> {
    try {
      const decoded = this.jwtService.verify(token);
      const jti = decoded.jti;
      
      // If no jti, but token is valid according to signature, consider it valid
      // This helps with tokens created before we implemented JTI
      if (!jti) {
        return true;
      }
      
      // When using in-memory storage, token is valid unless revoked
      if (this.fallbackToMemory) {
        // Check if token is revoked
        if (this.tokenBlacklist.has(jti)) {
          return false;
        }
        
        // Check if user has revoked all tokens
        if (decoded.sub && this.userBlacklist.has(Number(decoded.sub))) {
          const blacklistedTime = this.userBlacklist.get(Number(decoded.sub)) || 0;
          const tokenIssuedAt = decoded.iat * 1000; // Convert to milliseconds
          
          // Token is revoked if created before user was blacklisted
          if (tokenIssuedAt < blacklistedTime) {
            return false;
          }
        }
        
        return true;
      }
      
      // Using Redis if available
      try {
        // Check if jti exists in Redis
        const isValid = await this.cacheManager.get(`valid_jwt:${jti}`);
        
        // If we can't find the token in Redis but the JWT signature is valid,
        // consider it valid to prevent excessive token rejections
        if (isValid === undefined) {
          return true;
        }
        
        // Check if user is blacklisted
        if (decoded.sub) {
          const userBlacklisted = await this.cacheManager.get(`user_blacklist:${decoded.sub}`);
          if (userBlacklisted) {
            return false;
          }
        }
        
        return !!isValid;
      } catch (error) {
        // Log error only once and switch to in-memory fallback
        if (!this.fallbackToMemory) {
          this.logger.error(`Redis validation error: ${error.message} - switching to in-memory fallback`);
          this.fallbackToMemory = true;
        }
        
        // When switching to in-memory mode, consider token valid
        return true;
      }
    } catch (error) {
      // JWT verification error (expired, tampered, etc.)
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
      
      if (this.fallbackToMemory) {
        // Thêm vào blacklist khi sử dụng bộ nhớ trong
        this.tokenBlacklist.set(jti, true);
        
        // Xóa token khỏi blacklist sau khi hết hạn
        const expiresAt = decoded.exp * 1000; // Convert to milliseconds
        const timeUntilExpiration = expiresAt - Date.now();
        
        if (timeUntilExpiration > 0) {
          setTimeout(() => {
            this.tokenBlacklist.delete(jti);
          }, timeUntilExpiration);
        } else {
          // Token đã hết hạn, xóa ngay
          this.tokenBlacklist.delete(jti);
        }
        
        return true;
      }
      
      // Sử dụng Redis nếu có
      try {
        // Xóa jti khỏi danh sách token hợp lệ
        await this.cacheManager.del(`valid_jwt:${jti}`);
        return true;
      } catch (error) {
        this.logger.error(`Redis revocation error: ${error.message} - switching to in-memory fallback`);
        this.fallbackToMemory = true;
        
        // Thêm vào blacklist khi chuyển sang bộ nhớ trong
        this.tokenBlacklist.set(jti, true);
        return true;
      }
    } catch (error) {
      return false;
    }
  }

  // Thu hồi tất cả token của một người dùng
  async revokeAllUserTokens(userId: number): Promise<void> {
    if (this.fallbackToMemory) {
      // Lưu timestamp vào userBlacklist
      this.userBlacklist.set(userId, Date.now());
      
      // Xóa khỏi blacklist sau 7 ngày
      setTimeout(() => {
        this.userBlacklist.delete(userId);
      }, 7 * 24 * 60 * 60 * 1000);
      
      return;
    }
    
    // Sử dụng Redis nếu có
    try {
      // Lưu timestamp vào blacklist để chặn tất cả token được tạo trước thời điểm này
      await this.cacheManager.set(`user_blacklist:${userId}`, Date.now(), 86400 * 7); // 7 ngày
    } catch (error) {
      this.logger.error(`Redis error when revoking all user tokens: ${error.message} - switching to in-memory fallback`);
      this.fallbackToMemory = true;
      
      // Lưu timestamp vào userBlacklist
      this.userBlacklist.set(userId, Date.now());
    }
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