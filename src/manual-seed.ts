// src/manual-seed.ts
import { NestFactory } from '@nestjs/core';
import { SeedModule } from './database/seeders/seed.module';
import { SeedService } from './database/seeders/seed.service';

async function bootstrap() {
  // Tạo ứng dụng NestJS với module SeedModule
  const app = await NestFactory.createApplicationContext(SeedModule);

  try {
    // Lấy service SeedService từ ứng dụng
    const seedService = app.get(SeedService);
    
    console.log('Bắt đầu seed dữ liệu...');
    
    // Chạy hàm seed để tạo dữ liệu mẫu
    await seedService.seed();
    
    console.log('Seed dữ liệu thành công!');
  } catch (error) {
    console.error('Lỗi khi seed dữ liệu:', error);
  } finally {
    // Đóng ứng dụng khi hoàn thành
    await app.close();
  }
}

// Chạy hàm bootstrap
bootstrap();