import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { setupSwagger } from './swagger.config';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import * as fs from 'fs';
import * as path from 'path';
import { IoAdapter } from '@nestjs/platform-socket.io';
import * as compression from 'compression';
import * as helmet from 'helmet';

// Custom WebSocket adapter cho Nginx proxy
class CustomIoAdapter extends IoAdapter {
  createIOServer(port: number, options?: any): any {
    const server = super.createIOServer(port, {
      ...options,
      cors: {
        origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
        methods: ['GET', 'POST'],
        credentials: true,
      },
      allowEIO3: true, // Cho phép Engine.IO phiên bản 3
      path: '/notifications/socket.io', // Path nhất quán cho WebSocket
      transports: ['websocket', 'polling'], // Hỗ trợ cả hai phương thức
      pingInterval: 25000, // 25 giây
      pingTimeout: 20000, // 20 giây
    });
    
    return server;
  }
}

async function bootstrap() {
  try {
    const app = await NestFactory.create(AppModule);
    
    // Thêm middleware compression để giảm kích thước phản hồi
    app.use(compression());
    app.use(helmet());
    
    // Kiểm tra thư mục uploads tồn tại chưa
    const uploadsDir = process.env.UPLOAD_DIR || 'uploads';
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
      console.log(`Created uploads directory: ${uploadsDir}`);
    }
    
    // Tạo thư mục con trong uploads
    const subDirs = ['documents', 'avatars', 'reports'];
    for (const dir of subDirs) {
      const fullPath = path.join(uploadsDir, dir);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
        console.log(`Created directory: ${fullPath}`);
      }
    }
    
    // Sử dụng adapter tùy chỉnh cho WebSocket
    app.useWebSocketAdapter(new CustomIoAdapter(app));
    
    // Apply validation pipe
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }));
    
    // Apply global exception filter
    app.useGlobalFilters(new HttpExceptionFilter());
    
    // Enable CORS
    app.enableCors({
      origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
      credentials: true,
    });
    
    // Set global prefix
    app.setGlobalPrefix('api');
    
    // Setup Swagger
    setupSwagger(app);
    
    // Lấy trust proxy để đọc IP thực từ X-Forwarded-For
    const expressApp = app.getHttpAdapter().getInstance();
    expressApp.set('trust proxy', true);
    
    // Start application
    const port = process.env.PORT || 3000;
    await app.listen(port);
    console.log(`Application is running on: http://localhost:${port}`);
    console.log(`API documentation is available at: http://localhost:${port}/api`);
  } catch (error) {
    console.error('Error starting the application:', error);
    
    // Kiểm tra xem có phải lỗi liên quan đến database không
    if (error.message && error.message.includes('database')) {
      console.log('\n---------------------------------------------');
      console.log('DATABASE CONNECTION ERROR');
      console.log('---------------------------------------------');
      console.log('Please make sure PostgreSQL is running and the database exists.');
      console.log('You can create the database by running:');
      console.log('npm run create-db');
      console.log('Then initialize tables with:');
      console.log('npm run setup-db');
      console.log('---------------------------------------------\n');
    }
    
    process.exit(1);
  }
}
bootstrap();