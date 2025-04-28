// src/auth/strategies/jwt.strategy.ts
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisJwtService } from '../services/redis-jwt.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
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
    // Lấy token từ header
    const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
    
    // Kiểm tra token có trong blacklist không
    const isValid = await this.redisJwtService.validateToken(token);
    
    if (!isValid) {
      throw new UnauthorizedException('Token đã bị thu hồi hoặc không hợp lệ');
    }
    
    return { 
      userId: payload.sub, 
      cccd: payload.cccd, 
      role: payload.role 
    };
  }
}