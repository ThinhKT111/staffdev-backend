// src/config/config.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppConfigService {
  constructor(private configService: ConfigService) {}

  get isDevelopment(): boolean {
    return this.nodeEnv === 'development';
  }

  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }

  get nodeEnv(): string {
    return this.configService.get<string>('NODE_ENV') || 'development';
  }

  get databaseConfig() {
    return {
      type: 'postgres',
      host: this.configService.get<string>('DB_HOST') || 'localhost',
      port: parseInt(this.configService.get<string>('DB_PORT') || '5432', 10),
      username: this.configService.get<string>('DB_USERNAME') || 'postgres',
      password: this.configService.get<string>('DB_PASSWORD') || 'password',
      database: this.configService.get<string>('DB_NAME') || 'staffdev',
      entities: [__dirname + '/../**/*.entity{.ts,.js}'],
      synchronize: this.isDevelopment,
    };
  }

  get jwtConfig() {
    return {
      secret: this.configService.get<string>('JWT_SECRET') || 'staffdev_secret_key',
      expiresIn: '1d',
    };
  }

  get appConfig() {
    return {
      port: parseInt(this.configService.get<string>('PORT') || '3000', 10),
      uploadDir: this.configService.get<string>('UPLOAD_DIR') || 'uploads',
    };
  }
}