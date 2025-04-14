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
    return this.configService.get('NODE_ENV') || 'development';
  }

  get databaseConfig() {
    return {
      type: 'postgres',
      host: this.configService.get('DB_HOST'),
      port: parseInt(this.configService.get('DB_PORT'), 10) || 5432,
      username: this.configService.get('DB_USERNAME'),
      password: this.configService.get('DB_PASSWORD'),
      database: this.configService.get('DB_NAME'),
      entities: [__dirname + '/../**/*.entity{.ts,.js}'],
      synchronize: this.isDevelopment,
    };
  }

  get jwtConfig() {
    return {
      secret: this.configService.get('JWT_SECRET'),
      expiresIn: '1d',
    };
  }

  get appConfig() {
    return {
      port: parseInt(this.configService.get('PORT'), 10) || 3000,
      uploadDir: this.configService.get('UPLOAD_DIR') || 'uploads',
    };
  }
}