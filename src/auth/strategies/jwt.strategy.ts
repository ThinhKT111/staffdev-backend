import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisJwtService } from '../services/redis-jwt.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private configService: ConfigService,
    private redisJwtService: RedisJwtService
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'staffdev_secret_key',
      passReqToCallback: true,
    });
  }

  async validate(req: any, payload: any) {
    try {
      // Lấy token từ header
      const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
      
      // Kiểm tra token có trong blacklist không
      if (token) {
        try {
          const isValid = await this.redisJwtService.validateToken(token);
          
          if (!isValid) {
            throw new UnauthorizedException('Token đã bị thu hồi hoặc không hợp lệ');
          }
        } catch (error) {
          this.logger.warn(`Error validating token: ${error.message}`);
          // Tiếp tục nếu có lỗi Redis (vì đã xử lý trong RedisJwtService)
        }
      } else {
        throw new UnauthorizedException('Token không hợp lệ');
      }
      
      return { 
        userId: payload.sub, 
        sub: payload.sub,
        cccd: payload.cccd, 
        role: payload.role 
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error(`JWT validation error: ${error.message}`);
      throw new UnauthorizedException('Lỗi xác thực JWT');
    }
  }
}