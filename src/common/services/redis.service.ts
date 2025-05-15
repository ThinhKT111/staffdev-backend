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
      // Lấy địa chỉ IP từ config hoặc sử dụng IP tĩnh của WSL
      const redisHost = this.configService.get('REDIS_HOST') || '192.168.178.204';
      const redisPort = parseInt(this.configService.get('REDIS_PORT') || '6379');
      
      this.redisClient = createClient({
        socket: {
          host: redisHost,
          port: redisPort,
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
        this.logger.error(`Redis Client Error: ${err.message}`);
        this.redisReady = false;
      });

      this.redisClient.on('connect', () => {
        this.logger.log(`Redis connected to ${redisHost}:${redisPort}`);
      });

      this.redisClient.on('ready', () => {
        this.logger.log('Redis client ready');
        this.redisReady = true;
      });

      await this.redisClient.connect();
    } catch (error) {
      this.logger.error(`Failed to initialize Redis: ${error.message}`);
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
      this.logger.error(`Redis get error: ${error.message}`);
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
      this.logger.error(`Redis set error: ${error.message}`);
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
      this.logger.error(`Redis delete error: ${error.message}`);
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
