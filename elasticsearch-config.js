/**
 * Elasticsearch Configuration and Connection Test
 * 
 * Hướng dẫn sử dụng:
 * 1. Đảm bảo Elasticsearch đã chạy (v9.0.0)
 * 2. Chạy file này bằng lệnh: node elasticsearch-config.js
 * 3. Kiểm tra kết quả kết nối và cấu hình index
 */

const { Client } = require('@elastic/elasticsearch');
const readline = require('readline');
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; // Important for self-signed certificates

// Cấu hình Elasticsearch mặc định
const ES_CONFIG = {
  node: 'https://localhost:9200',  // URL của Elasticsearch server với HTTPS
  auth: {
    username: 'elastic',  // Default username for Elasticsearch 9
    password: '26121999'  // Password we confirmed works in the test script
  },
  maxRetries: 5,
  requestTimeout: 60000,
  tls: {
    rejectUnauthorized: false
  }
};

// Create Elasticsearch client
const esClient = new Client({
  node: ES_CONFIG.node,
  auth: {
    username: ES_CONFIG.auth.username,
    password: ES_CONFIG.auth.password
  },
  maxRetries: ES_CONFIG.maxRetries,
  requestTimeout: ES_CONFIG.requestTimeout,
  tls: ES_CONFIG.tls
});

// Kiểm tra kết nối và cấu hình index
async function testElasticsearchConnection() {
  try {
    console.log('🔄 Đang kết nối đến Elasticsearch...');
    
    // Kiểm tra kết nối
    const info = await esClient.info();
    console.log('✅ Kết nối Elasticsearch thành công!');
    console.log(`📊 Elasticsearch version: ${info.version.number}`);
    console.log(`📍 Elasticsearch đang chạy tại: ${ES_CONFIG.node}`);
    
    // Kiểm tra các index hiện có
    const indices = await esClient.cat.indices({ format: 'json' });
    console.log('\n📋 Danh sách index hiện có:');
    if (!indices || indices.length === 0) {
      console.log('   Chưa có index nào.');
    } else {
      indices.forEach(index => {
        console.log(`   - ${index.index} (docs: ${index.docs?.count || 0}, size: ${index.store?.size || '0kb'})`);
      });
    }
    
    // Cấu hình index cho ứng dụng StaffDev
    await configureIndices();
    
  } catch (error) {
    console.error('❌ Lỗi kết nối Elasticsearch:', error.message);
    console.log('\n🔍 Khắc phục:');
    console.log('1. Đảm bảo Elasticsearch Server đã được khởi động');
    console.log('2. Kiểm tra địa chỉ trong cấu hình');
    console.log('3. Kiểm tra tường lửa có cho phép kết nối không');
    console.log('4. Kiểm tra thiết lập bảo mật của Elasticsearch (xem logs để biết thông tin đăng nhập)');
    console.log('5. Xác minh username/password trong cấu hình');
    process.exit(1);
  }
}

// Cấu hình các index cần thiết
async function configureIndices() {
  const requiredIndices = [
    {
      name: 'tasks',
      mappings: {
        properties: {
          task_id: { type: 'keyword' },
          title: { type: 'text', analyzer: 'vietnamese' },
          description: { type: 'text', analyzer: 'vietnamese' },
          assigned_to: { type: 'keyword' },
          status: { type: 'keyword' },
          deadline: { type: 'date' },
          created_at: { type: 'date' }
        }
      }
    },
    {
      name: 'documents',
      mappings: {
        properties: {
          document_id: { type: 'keyword' },
          title: { type: 'text', analyzer: 'vietnamese' },
          category: { type: 'keyword' },
          content: { type: 'text', analyzer: 'vietnamese' },
          uploaded_by: { type: 'keyword' },
          uploaded_at: { type: 'date' }
        }
      }
    },
    {
      name: 'notifications',
      mappings: {
        properties: {
          notification_id: { type: 'keyword' },
          user_id: { type: 'keyword' },
          title: { type: 'text', analyzer: 'vietnamese' },
          content: { type: 'text', analyzer: 'vietnamese' },
          type: { type: 'keyword' },
          is_read: { type: 'boolean' },
          created_at: { type: 'date' }
        }
      }
    },
    {
      name: 'forum_posts',
      mappings: {
        properties: {
          post_id: { type: 'keyword' },
          user_id: { type: 'keyword' },
          title: { type: 'text', analyzer: 'vietnamese' },
          content: { type: 'text', analyzer: 'vietnamese' },
          created_at: { type: 'date' },
          updated_at: { type: 'date' }
        }
      }
    }
  ];
  
  console.log('\n🔧 Đang cấu hình các index cần thiết...');
  
  for (const indexConfig of requiredIndices) {
    try {
      // Kiểm tra xem index đã tồn tại chưa
      const exists = await esClient.indices.exists({ index: indexConfig.name });
      
      if (!exists) {
        // Tạo index mới với mapping
        await esClient.indices.create({
          index: indexConfig.name,
          body: {
            settings: {
              number_of_shards: 1,
              number_of_replicas: 0,
              analysis: {
                analyzer: {
                  vietnamese: {
                    tokenizer: "standard",
                    filter: ["lowercase", "asciifolding"]
                  }
                }
              }
            },
            mappings: indexConfig.mappings
          }
        });
        console.log(`✅ Đã tạo index '${indexConfig.name}' thành công`);
      } else {
        console.log(`ℹ️ Index '${indexConfig.name}' đã tồn tại`);
      }
    } catch (error) {
      console.error(`❌ Lỗi khi cấu hình index '${indexConfig.name}':`, error.message);
    }
  }
  
  // Hướng dẫn cấu hình NestJS
  console.log('\n📝 Hướng dẫn cấu hình Elasticsearch trong NestJS:');
  console.log('1. Đảm bảo các biến môi trường đã được cài đặt trong .env:');
  console.log('   ELASTICSEARCH_NODE=https://localhost:9200');
  console.log('   ELASTICSEARCH_USERNAME=elastic');
  console.log('   ELASTICSEARCH_PASSWORD=26121999');
  console.log('2. Trong file src/elasticsearch/elasticsearch.module.ts, cập nhật cấu hình SSL và authentication');
  console.log('3. Thêm các service để đánh chỉ mục và tìm kiếm dữ liệu\n');
}

// Bắt đầu kiểm tra
testElasticsearchConnection(); 