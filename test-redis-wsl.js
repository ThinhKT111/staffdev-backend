
const { createClient } = require('redis');

// Create a Redis client with the WSL IP
const client = createClient({
  socket: {
    host: '192.168.178.204',
    port: 6379,
    connectTimeout: 10000 // 10s timeout
  }
});

client.on('error', (err) => {
  console.error('Redis Client Error:', err);
});

client.on('connect', () => {
  console.log('Redis Client Connected');
});

client.on('ready', () => {
  console.log('Redis Client Ready');
});

async function testRedis() {
  try {
    console.log('Connecting to Redis...');
    await client.connect();
    
    console.log('Setting test value...');
    await client.set('test-key', 'Hello from Windows!');
    
    console.log('Getting test value...');
    const value = await client.get('test-key');
    console.log('Retrieved value:', value);
    
    await client.disconnect();
    console.log('Test completed successfully!');
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testRedis();
