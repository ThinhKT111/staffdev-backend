// src/enhanced-seed.ts
import { NestFactory } from '@nestjs/core';
import { EnhancedSeedModule } from './database/seeders/enhanced-seed.module';
import { EnhancedSeedService } from './database/seeders/enhanced-seed.service';

async function bootstrap() {
  try {
    console.log('Bắt đầu khởi tạo dữ liệu với EnhancedSeedService...');
    
    // Tạo ứng dụng NestJS với module EnhancedSeedModule
    const app = await NestFactory.createApplicationContext(EnhancedSeedModule);

    // Lấy service EnhancedSeedService từ ứng dụng
    const seedService = app.get(EnhancedSeedService);
    
    // Chạy hàm seed để tạo dữ liệu mẫu
    await seedService.seed();
    
    console.log('Khởi tạo dữ liệu thành công!');
    
    // Đóng ứng dụng khi hoàn thành
    await app.close();
    
    process.exit(0);
  } catch (error) {
    console.error('Lỗi khi khởi tạo dữ liệu:', error);
    process.exit(1);
  }
}

// Chạy hàm bootstrap
bootstrap();