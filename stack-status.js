/**
 * Kiểm tra trạng thái các dịch vụ backend
 * 
 * Chạy lệnh: node stack-status.js
 */

const { Client } = require('pg');
const Redis = require('ioredis');
const { Client: ElasticsearchClient } = require('@elastic/elasticsearch');
const http = require('http');

// Disable TLS certificate verification for testing
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Cấu hình
const config = {
  postgres: {
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: '26121999',
    database: 'staffdev'
  },
  redis: {
    host: 'localhost',
    port: 6379
  },
  elasticsearch: {
    node: 'https://localhost:9200',
    auth: {
      username: 'elastic',
      password: '26121999'
    },
    tls: {
      rejectUnauthorized: false
    }
  },
  backend: {
    url: 'http://localhost:3000',
    apiEndpoint: '/api'
  }
};

// Kiểm tra PostgreSQL
async function checkPostgres() {
  const client = new Client(config.postgres);
  
  try {
    console.log('🔄 Kiểm tra kết nối PostgreSQL...');
    await client.connect();
    const result = await client.query('SELECT version()');
    console.log('✅ PostgreSQL đang hoạt động');
    console.log(`📊 Phiên bản: ${result.rows[0].version.split(',')[0]}`);
    return true;
  } catch (error) {
    console.error('❌ Không thể kết nối đến PostgreSQL:', error.message);
    return false;
  } finally {
    await client.end();
  }
}

// Kiểm tra Redis
async function checkRedis() {
  const redis = new Redis(config.redis);
  
  try {
    console.log('\n🔄 Kiểm tra kết nối Redis...');
    const ping = await redis.ping();
    const info = await redis.info();
    const version = info.split('\n').find(line => line.startsWith('redis_version')).split(':')[1];
    
    console.log('✅ Redis đang hoạt động');
    console.log(`📊 Phiên bản: ${version.trim()}`);
    return true;
  } catch (error) {
    console.error('❌ Không thể kết nối đến Redis:', error.message);
    return false;
  } finally {
    redis.disconnect();
  }
}

// Kiểm tra Elasticsearch
async function checkElasticsearch() {
  const client = new ElasticsearchClient(config.elasticsearch);
  
  try {
    console.log('\n🔄 Kiểm tra kết nối Elasticsearch...');
    const info = await client.info();
    
    console.log('✅ Elasticsearch đang hoạt động');
    console.log(`📊 Phiên bản: ${info.version.number}`);
    
    // Kiểm tra các index đã được tạo
    const indices = await client.cat.indices({ format: 'json' });
    const requiredIndices = ['tasks', 'documents', 'notifications', 'forum_posts'];
    const foundIndices = indices.map(index => index.index);
    
    console.log('\n📋 Kiểm tra các index:');
    for (const index of requiredIndices) {
      if (foundIndices.includes(index)) {
        console.log(`   ✅ Index "${index}" đã tồn tại`);
      } else {
        console.log(`   ❌ Index "${index}" chưa được tạo`);
      }
    }
    
    return true;
  } catch (error) {
    console.error('❌ Không thể kết nối đến Elasticsearch:', error.message);
    if (error.meta && error.meta.body) {
      console.error('   Chi tiết:', JSON.stringify(error.meta.body, null, 2));
    }
    return false;
  }
}

// Kiểm tra Backend API
function checkBackendAPI() {
  return new Promise((resolve) => {
    console.log('\n🔄 Kiểm tra backend NestJS...');
    
    const url = `${config.backend.url}${config.backend.apiEndpoint}`;
    http.get(url, (res) => {
      if (res.statusCode === 200) {
        console.log('✅ Backend API đang hoạt động');
        console.log(`📊 API documentation: ${url}`);
        resolve(true);
      } else {
        console.log(`❌ Backend API trả về mã lỗi: ${res.statusCode}`);
        resolve(false);
      }
    }).on('error', (error) => {
      console.error('❌ Không thể kết nối đến backend:', error.message);
      console.log('   Đảm bảo ứng dụng backend đã được khởi động (npm run start:dev)');
      resolve(false);
    });
  });
}

// Báo cáo tổng quan
async function generateSummary(status) {
  console.log('\n📝 Báo cáo tổng quan:');
  
  const totalServices = Object.keys(status).length;
  const runningServices = Object.values(status).filter(Boolean).length;
  
  console.log(`🔢 Tổng số dịch vụ: ${totalServices}`);
  console.log(`✅ Đang hoạt động: ${runningServices}`);
  console.log(`❌ Không hoạt động: ${totalServices - runningServices}`);
  
  if (runningServices === totalServices) {
    console.log('\n✨ Tất cả dịch vụ đều đang hoạt động tốt!');
  } else {
    console.log('\n⚠️ Một số dịch vụ không hoạt động. Kiểm tra nguyên nhân và khởi động lại nếu cần.');
  }
  
  // Hiển thị trạng thái chi tiết
  console.log('\n📊 Trạng thái chi tiết:');
  for (const [service, isRunning] of Object.entries(status)) {
    console.log(`   ${isRunning ? '✅' : '❌'} ${service}`);
  }
  
  // Hướng dẫn khởi động
  console.log('\n🚀 Hướng dẫn khởi động dịch vụ:');
  if (!status.postgresql) {
    console.log('   - PostgreSQL: Khởi động dịch vụ PostgreSQL trên máy của bạn');
  }
  if (!status.redis) {
    console.log('   - Redis: Chạy redis-server hoặc khởi động dịch vụ Redis');
  }
  if (!status.elasticsearch) {
    console.log('   - Elasticsearch: Chạy elasticsearch.bat trong thư mục bin của Elasticsearch');
  }
  if (!status.backend) {
    console.log('   - Backend: Chạy lệnh "npm run start:dev" trong thư mục dự án');
  }
}

// Kiểm tra tất cả dịch vụ
async function checkAllServices() {
  try {
    const postgresStatus = await checkPostgres();
    const redisStatus = await checkRedis();
    const elasticsearchStatus = await checkElasticsearch();
    const backendStatus = await checkBackendAPI();
    
    const status = {
      postgresql: postgresStatus,
      redis: redisStatus,
      elasticsearch: elasticsearchStatus,
      backend: backendStatus
    };
    
    await generateSummary(status);
    
  } catch (error) {
    console.error('❌ Lỗi:', error.message);
  }
}

// Bắt đầu kiểm tra
checkAllServices(); 