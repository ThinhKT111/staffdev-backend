/**
 * Redis Configuration Update for Windows-WSL Integration
 */

const fs = require('fs');
const { execSync } = require('child_process');

// Try to get the WSL IP address from PowerShell
function getWslIp() {
  try {
    const wslOutput = execSync('wsl -d Ubuntu -- hostname -I').toString().trim();
    console.log(`🔍 Detected WSL IP: ${wslOutput}`);
    return wslOutput.split(' ')[0]; // Get the first IP if multiple
  } catch (error) {
    console.error(`❌ Failed to get WSL IP: ${error.message}`);
    return '127.0.0.1'; // Fallback to localhost
  }
}

// Update the src/common/services/redis.service.ts file
function updateRedisServiceFile() {
  const wslIp = getWslIp();
  
  try {
    if (!fs.existsSync('src/common/services')) {
      fs.mkdirSync('src/common/services', { recursive: true });
    }
    
    const redisServiceContent = `
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from 'redis';

@Injectable()
export class RedisService {
  private readonly logger = new Logger(RedisService.name);
  private redisClient;
  private redisReady = false;

  constructor(private configService: ConfigService) {
    this.initializeRedis();
  }

  private async initializeRedis() {
    try {
      // Hard-coded connection to WSL Redis for reliable development
      this.redisClient = createClient({
        socket: {
          host: '${wslIp}',
          port: 6379,
          connectTimeout: 10000, // 10s timeout
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              this.logger.error('Max Redis reconnection attempts reached');
              return new Error('Max reconnection attempts reached');
            }
            return Math.min(retries * 100, 3000); // Increasing delay between retries
          }
        }
      });

      this.redisClient.on('error', (err) => {
        this.logger.error(\`Redis Client Error: \${err.message}\`);
        this.redisReady = false;
      });

      this.redisClient.on('connect', () => {
        this.logger.log(\`Redis connected to \${wslIp}:6379\`);
      });

      this.redisClient.on('ready', () => {
        this.logger.log('Redis client ready');
        this.redisReady = true;
      });

      await this.redisClient.connect();
    } catch (error) {
      this.logger.error(\`Failed to initialize Redis: \${error.message}\`);
    }
  }

  async get(key: string): Promise<string | null> {
    if (!this.redisReady || !this.redisClient) {
      this.logger.warn('Redis not ready, skipping get operation');
      return null;
    }
    
    try {
      return await this.redisClient.get(key);
    } catch (error) {
      this.logger.error(\`Redis get error: \${error.message}\`);
      return null;
    }
  }

  async set(key: string, value: string, ttl?: number): Promise<boolean> {
    if (!this.redisReady || !this.redisClient) {
      this.logger.warn('Redis not ready, skipping set operation');
      return false;
    }
    
    try {
      if (ttl) {
        await this.redisClient.set(key, value, { EX: ttl });
      } else {
        await this.redisClient.set(key, value);
      }
      return true;
    } catch (error) {
      this.logger.error(\`Redis set error: \${error.message}\`);
      return false;
    }
  }

  async delete(key: string): Promise<boolean> {
    if (!this.redisReady || !this.redisClient) {
      this.logger.warn('Redis not ready, skipping delete operation');
      return false;
    }
    
    try {
      await this.redisClient.del(key);
      return true;
    } catch (error) {
      this.logger.error(\`Redis delete error: \${error.message}\`);
      return false;
    }
  }

  getClient() {
    return this.redisClient;
  }

  isReady(): boolean {
    return this.redisReady;
  }
}
`;

    fs.writeFileSync('src/common/services/redis.service.ts', redisServiceContent);
    console.log('✅ RedisService created successfully');
    
    return true;
  } catch (error) {
    console.error(`❌ Failed to update Redis service: ${error.message}`);
    return false;
  }
}

// Update the shared.module.ts file to include RedisService
function updateSharedModule() {
  try {
    if (fs.existsSync('src/shared/shared.module.ts')) {
      let sharedModuleContent = fs.readFileSync('src/shared/shared.module.ts', 'utf8');
      
      // Check if RedisService is already imported
      if (!sharedModuleContent.includes('RedisService')) {
        // Add import for RedisService
        sharedModuleContent = sharedModuleContent.replace(
          'import {',
          'import { RedisService } from \'../common/services/redis.service\';\nimport {'
        );
        
        // Add RedisService to providers
        sharedModuleContent = sharedModuleContent.replace(
          'providers: [',
          'providers: [RedisService, '
        );
        
        // Add RedisService to exports
        sharedModuleContent = sharedModuleContent.replace(
          'exports: [',
          'exports: [RedisService, '
        );
        
        fs.writeFileSync('src/shared/shared.module.ts', sharedModuleContent);
        console.log('✅ SharedModule updated to include RedisService');
      } else {
        console.log('ℹ️ RedisService already added to SharedModule');
      }
    } else {
      console.warn('⚠️ src/shared/shared.module.ts not found');
    }
    
    return true;
  } catch (error) {
    console.error(`❌ Failed to update SharedModule: ${error.message}`);
    return false;
  }
}

// Create a .env file with the correct Redis configuration
function updateEnvFile() {
  const wslIp = getWslIp();
  
  try {
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

# Redis Configuration - Using WSL IP for reliable connection
REDIS_HOST=${wslIp}
REDIS_PORT=6379
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

    fs.writeFileSync('.env', envContent);
    console.log('✅ .env file created successfully with WSL IP');
    
    return true;
  } catch (error) {
    console.error(`❌ Failed to create .env file: ${error.message}`);
    return false;
  }
}

// Create a test script for the Redis connection
function createRedisTestScript() {
  const wslIp = getWslIp();
  
  try {
    const testScriptContent = `
const { createClient } = require('redis');

// Create a Redis client with the WSL IP
const client = createClient({
  socket: {
    host: '${wslIp}',
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
`;

    fs.writeFileSync('test-redis-wsl.js', testScriptContent);
    console.log('✅ Redis test script created: test-redis-wsl.js');
    
    return true;
  } catch (error) {
    console.error(`❌ Failed to create Redis test script: ${error.message}`);
    return false;
  }
}

function printInstructions() {
  console.log('\n📋 Follow these steps to fix Redis in WSL:');
  console.log('1. Open a WSL terminal (wsl -d Ubuntu)');
  console.log('2. Run these commands:');
  console.log('   sudo apt update && sudo apt install -y redis-server');
  console.log('   sudo sed -i \'s/bind 127.0.0.1/bind 0.0.0.0/g\' /etc/redis/redis.conf');
  console.log('   sudo sed -i \'s/protected-mode yes/protected-mode no/g\' /etc/redis/redis.conf');
  console.log('   sudo systemctl restart redis-server');
  console.log('   redis-cli ping');
  console.log('\n3. Test Redis from Windows:');
  console.log('   node test-redis-wsl.js');
  console.log('\n4. Restart your NestJS application:');
  console.log('   npm run start:dev');
}

// Main function
async function main() {
  console.log('🚀 Redis WSL Configuration Helper');
  
  updateRedisServiceFile();
  updateSharedModule();
  updateEnvFile();
  createRedisTestScript();
  
  printInstructions();
}

// Run the main function
main().catch(console.error); 