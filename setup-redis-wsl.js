/**
 * WSL Redis Connection Test and Setup Script
 * 
 * This script:
 * 1. Tests connection to Redis on WSL
 * 2. Creates a .env file with correct Redis config
 * 3. Provides instructions for fixing Redis in WSL
 */

const fs = require('fs');
const { createClient } = require('redis');
const { execSync } = require('child_process');

// WSL2 Redis settings - this IP will be different for each setup
const WSL_REDIS_HOST = '192.168.178.204'; // Your WSL IP
const REDIS_PORT = 6379;

async function testRedisConnection() {
  console.log('🔄 Testing Redis connection to WSL...');
  
  const redisClient = createClient({
    socket: {
      host: WSL_REDIS_HOST,
      port: REDIS_PORT,
      connectTimeout: 5000
    }
  });
  
  try {
    redisClient.on('error', (err) => {
      console.error(`❌ Redis connection error: ${err.message}`);
    });
    
    await redisClient.connect();
    const pingResult = await redisClient.ping();
    
    if (pingResult === 'PONG') {
      console.log('✅ Successfully connected to Redis on WSL!');
      await redisClient.disconnect();
      return true;
    }
    
    await redisClient.disconnect();
    return false;
  } catch (error) {
    console.error(`❌ Failed to connect to Redis: ${error.message}`);
    return false;
  }
}

function createEnvFile() {
  console.log('📝 Creating/updating .env file with WSL Redis settings...');
  
  const envContent = `# Server
PORT=3000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=26121999
DB_NAME=staffdev
DB_SYNCHRONIZE=false

# JWT Auth
JWT_SECRET=staffdev_secret_key
JWT_EXPIRES_IN=7d

# File Upload
MAX_FILE_SIZE=5242880
UPLOAD_DIR=./uploads

# Node Environment
NODE_ENV=development

# Redis Configuration
REDIS_HOST=${WSL_REDIS_HOST}
REDIS_PORT=${REDIS_PORT}
REDIS_TTL=3600
REDIS_MAX_OBJECTS=1000

# Allowed Origins (CORS)
ALLOWED_ORIGINS=http://localhost,http://localhost:80,http://localhost:3000

# Elasticsearch Configuration
ELASTICSEARCH_NODE=https://localhost:9200
ELASTICSEARCH_USERNAME=elastic
ELASTICSEARCH_PASSWORD=26121999
NODE_TLS_REJECT_UNAUTHORIZED=0

# Admin User
ADMIN_EMAIL=admin@staffdev.com
ADMIN_PASSWORD=adminpassword`;

  try {
    fs.writeFileSync('.env', envContent);
    console.log('✅ .env file created successfully');
  } catch (error) {
    console.error(`❌ Failed to create .env file: ${error.message}`);
  }
}

function printWslRedisInstructions() {
  console.log('\n📋 Instructions for fixing Redis in WSL:');
  console.log('1. Open a WSL terminal');
  console.log('2. Run these commands to install Redis without authentication:');
  console.log('   sudo apt update');
  console.log('   sudo apt install redis-server');
  console.log('3. Edit Redis config to bind to all interfaces:');
  console.log('   sudo nano /etc/redis/redis.conf');
  console.log('   Change "bind 127.0.0.1" to "bind 0.0.0.0"');
  console.log('   Set "protected-mode no"');
  console.log('4. Restart Redis service:');
  console.log('   sudo systemctl restart redis-server');
  console.log('5. Check Redis status:');
  console.log('   sudo systemctl status redis-server');
  console.log('   redis-cli ping (should return PONG)');
  console.log('\n❗️ Security note: This configuration disables Redis authentication and');
  console.log('   allows connections from any IP. Only use in development environment.');
}

async function main() {
  console.log('🚀 WSL Redis Setup Helper');
  
  const connected = await testRedisConnection();
  
  if (connected) {
    console.log('👍 Redis is already properly configured!');
    createEnvFile();
  } else {
    console.log('⚠️ Cannot connect to Redis on WSL');
    printWslRedisInstructions();
    createEnvFile();
  }
  
  console.log('\n✨ Setup complete. After fixing Redis in WSL, restart your NestJS application.');
}

main().catch(console.error); 