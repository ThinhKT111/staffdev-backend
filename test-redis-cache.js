/**
 * Script kiểm tra chức năng Redis cache
 */

const Redis = require('ioredis');
const { Client } = require('pg');

async function testRedisCache() {
  // Kết nối Redis
  const redis = new Redis({
    host: 'localhost',
    port: 6379
  });

  // Kết nối PostgreSQL
  const pgClient = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: '26121999',
    database: 'staffdev'
  });

  try {
    // Kết nối PostgreSQL
    await pgClient.connect();
    console.log('✅ Kết nối PostgreSQL thành công');

    // Kiểm tra kết nối Redis
    const ping = await redis.ping();
    console.log(`✅ Kết nối Redis thành công (${ping})`);

    // Test caching đơn giản
    console.log('\n📝 Thử nghiệm cache dữ liệu đơn giản:');
    const testKey = 'test:key';
    const testValue = 'Hello Redis Cache!';
    
    await redis.set(testKey, testValue, 'EX', 3600);
    console.log(`   ✍️ Đã lưu dữ liệu vào cache với key: ${testKey}`);
    
    const cachedValue = await redis.get(testKey);
    console.log(`   📖 Đọc dữ liệu từ cache: ${cachedValue}`);

    // Test caching dữ liệu từ database
    console.log('\n📝 Thử nghiệm cache dữ liệu từ database:');
    
    // 1. Thử lấy dữ liệu từ cache trước
    const cacheKey = 'forumposts:recent';
    const cachedPosts = await redis.get(cacheKey);
    
    if (cachedPosts) {
      // Dữ liệu đã được cache
      console.log('   🔄 Lấy dữ liệu từ cache...');
      console.log(`   📦 Cache hit! Đã tìm thấy ${JSON.parse(cachedPosts).length} bài viết trong cache`);
    } else {
      // Không có trong cache, lấy từ database
      console.log('   🔄 Cache miss! Lấy dữ liệu từ database...');
      const result = await pgClient.query('SELECT post_id, title, content, created_at FROM ForumPosts ORDER BY created_at DESC LIMIT 5');
      
      // Lưu vào cache
      await redis.set(cacheKey, JSON.stringify(result.rows), 'EX', 60); // cache 60s
      console.log(`   ✍️ Đã lưu ${result.rows.length} bài viết vào cache với key: ${cacheKey}`);
      
      // Lấy lại từ cache để kiểm tra
      const newCachedPosts = await redis.get(cacheKey);
      console.log(`   📖 Xác nhận dữ liệu trong cache: ${JSON.parse(newCachedPosts).length} bài viết`);
    }

    // Test cache với hash
    console.log('\n📝 Thử nghiệm cache dữ liệu sử dụng Redis Hash:');
    const hashKey = 'department:data';
    
    // Lấy dữ liệu từ database
    const deptResult = await pgClient.query('SELECT department_id, department_name FROM Departments LIMIT 3');
    
    // Lưu vào Redis Hash
    for (const dept of deptResult.rows) {
      await redis.hset(hashKey, dept.department_id.toString(), dept.department_name);
    }
    console.log(`   ✍️ Đã lưu ${deptResult.rows.length} phòng ban vào Redis Hash`);
    
    // Lấy tất cả dữ liệu từ hash
    const hashData = await redis.hgetall(hashKey);
    console.log('   📖 Dữ liệu từ Redis Hash:');
    for (const [id, name] of Object.entries(hashData)) {
      console.log(`   - ID: ${id}, Tên: ${name}`);
    }

    // Xóa cache để test lần sau
    await redis.del(cacheKey);
    console.log(`\n🗑️ Đã xóa cache key "${cacheKey}" để test lần sau`);

  } catch (err) {
    console.error(`❌ Lỗi: ${err.message}`);
  } finally {
    // Đóng kết nối
    redis.disconnect();
    await pgClient.end();
    console.log('\n✅ Đã đóng kết nối Redis và PostgreSQL');
  }
}

testRedisCache(); 