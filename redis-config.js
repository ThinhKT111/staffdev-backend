/**
 * Redis Configuration and Connection Test
 * 
 * Hướng dẫn sử dụng:
 * 1. Đảm bảo Redis Server đã chạy (v7.0.15)
 * 2. Chạy file này bằng lệnh: node redis-config.js
 * 3. Kiểm tra kết quả kết nối
 */

const { createClient } = require('redis');

// Cấu hình Redis
const REDIS_CONFIG = {
  host: 'localhost',  // Đổi thành địa chỉ IP của Redis server nếu không chạy locally
  port: 6379          // Mặc định Redis port là 6379
};

// Tạo Redis client
const redisClient = createClient({
  socket: {
    host: REDIS_CONFIG.host,
    port: REDIS_CONFIG.port,
    connectTimeout: 10000 // 10 giây timeout
  }
});

// Xử lý sự kiện kết nối
redisClient.on('connect', () => {
  console.log('✅ Kết nối Redis thành công!');
  console.log(`📍 Redis đang chạy tại: ${REDIS_CONFIG.host}:${REDIS_CONFIG.port}`);
  
  // Kiểm tra phiên bản Redis
  redisClient.sendCommand(['INFO']).then(info => {
    const version = info.split('\r\n').find(line => line.startsWith('redis_version'));
    console.log(`📊 ${version}`);
    
    // Thử nghiệm ghi và đọc dữ liệu
    testRedisOperations();
  });
});

// Xử lý sự kiện lỗi
redisClient.on('error', (err) => {
  console.error('❌ Lỗi kết nối Redis:', err.message);
  console.log('\n🔍 Khắc phục:');
  console.log('1. Đảm bảo Redis Server đã được khởi động');
  console.log('2. Kiểm tra địa chỉ và cổng trong cấu hình');
  console.log('3. Kiểm tra tường lửa có cho phép kết nối không');
  process.exit(1);
});

// Hàm kiểm tra các thao tác cơ bản
async function testRedisOperations() {
  try {
    // Thử lưu giá trị
    await redisClient.set('test_key', 'Kết nối thành công');
    console.log('✅ Lưu dữ liệu thành công');
    
    // Đọc giá trị
    const value = await redisClient.get('test_key');
    console.log(`✅ Đọc dữ liệu thành công: ${value}`);
    
    // Hướng dẫn cấu hình NestJS
    console.log('\n📝 Hướng dẫn cấu hình Redis trong NestJS:');
    console.log('1. Đảm bảo các biến môi trường đã được cài đặt trong .env:');
    console.log('   REDIS_HOST=localhost');
    console.log('   REDIS_PORT=6379');
    console.log('2. Trong file app.module.ts, đảm bảo CacheModule được cấu hình đúng\n');
    
    // Đóng kết nối
    await redisClient.quit();
  } catch (error) {
    console.error('❌ Lỗi thao tác Redis:', error.message);
    process.exit(1);
  }
}

// Kết nối
async function connectToRedis() {
  try {
    console.log('🔄 Đang kết nối đến Redis...');
    await redisClient.connect();
  } catch (error) {
    console.error('❌ Lỗi kết nối Redis:', error.message);
    process.exit(1);
  }
}

// Bắt đầu kiểm tra
connectToRedis(); 