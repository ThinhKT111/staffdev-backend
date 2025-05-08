const { createClient } = require('redis');

async function checkRedisConnection() {
  try {
    console.log('Kiểm tra kết nối Redis...');
    
    // IP và cổng của Redis trên WSL
    const client = createClient({
      url: 'redis://192.168.178.204:6379',
      socket: {
        connectTimeout: 5000,
      }
    });
    
    client.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });
    
    await client.connect();
    const ping = await client.ping();
    console.log('Redis Connection Test:', ping);
    
    // Thử đọc/ghi
    await client.set('test-key', 'hello-redis');
    const value = await client.get('test-key');
    console.log('Đọc lại giá trị:', value);
    
    await client.disconnect();
    console.log('Kết nối Redis hoạt động tốt!');
    return true;
  } catch (error) {
    console.error('Kiểm tra kết nối Redis thất bại:', error.message);
    return false;
  }
}

checkRedisConnection().catch(console.error);