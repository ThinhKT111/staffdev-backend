// src/shared/services/queue.service.ts
import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { v4 as uuidv4 } from 'uuid';

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface Job<T = any> {
  id: string;
  type: string;
  data: T;
  status: JobStatus;
  createdAt: string;
  updatedAt: string;
  result?: any;
  error?: string;
}

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);
  private readonly workers: Map<string, NodeJS.Timeout> = new Map();
  private redisAvailable: boolean = false;

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {
    // Kiểm tra xem Redis có khả dụng không
    this.checkRedisAvailability();
  }

  private async checkRedisAvailability(): Promise<void> {
    try {
      const redisClient = this.getRedisClient();
      if (redisClient) {
        // Thử ping Redis để kiểm tra kết nối
        await redisClient.ping();
        this.redisAvailable = true;
        this.logger.log('Redis is available');
      } else {
        this.redisAvailable = false;
        this.logger.warn('Redis client is not available');
      }
    } catch (error) {
      this.redisAvailable = false;
      this.logger.error(`Redis connection failed: ${error.message}`);
    }
  }

  // Lấy Redis client một cách an toàn
  private getRedisClient(): any {
    try {
      const store = (this.cacheManager as any).store;
      if (store && typeof store.getClient === 'function') {
        return store.getClient();
      }
      return null;
    } catch (error) {
      this.logger.error(`Failed to get Redis client: ${error.message}`);
      return null;
    }
  }

  // Thêm job vào hàng đợi
  async enqueue<T = any>(type: string, data: T): Promise<string> {
    const jobId = uuidv4();
    
    const job: Job<T> = {
      id: jobId,
      type,
      data,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    // Lưu thông tin job vào cache
    await this.cacheManager.set(`job:${jobId}`, job, 86400); // 1 day TTL
    
    // Thêm job vào hàng đợi nếu Redis khả dụng
    if (this.redisAvailable) {
      const redisClient = this.getRedisClient();
      if (redisClient) {
        try {
          await redisClient.lpush(`queue:${type}`, jobId);
          this.logger.debug(`Added job ${jobId} to queue ${type}`);
        } catch (error) {
          this.logger.error(`Failed to add job to Redis queue: ${error.message}`);
          // Xử lý job ngay lập tức nếu không thể thêm vào queue
          setTimeout(() => this.processJob(type, jobId), 0);
        }
      } else {
        // Xử lý job ngay lập tức nếu không có Redis client
        setTimeout(() => this.processJob(type, jobId), 0);
      }
    } else {
      // Xử lý job ngay lập tức nếu Redis không khả dụng
      setTimeout(() => this.processJob(type, jobId), 0);
    }
    
    return jobId;
  }

  // Lấy thông tin của job
  async getJob<T = any>(jobId: string): Promise<Job<T> | null> {
    return this.cacheManager.get<Job<T>>(`job:${jobId}`);
  }

  // Xử lý một job cụ thể
  private async processJob<T = any>(type: string, jobId: string): Promise<boolean> {
    const job = await this.getJob<T>(jobId);
    
    if (!job) {
      this.logger.warn(`Job ${jobId} not found`);
      return false;
    }
    
    // Lấy worker function đã đăng ký
    const workerFunction = this.workerFunctions.get(type);
    if (!workerFunction) {
      this.logger.warn(`No worker registered for queue ${type}`);
      return false;
    }
    
    try {
      // Cập nhật trạng thái
      job.status = 'processing';
      job.updatedAt = new Date().toISOString();
      await this.cacheManager.set(`job:${jobId}`, job, 86400);
      
      // Thực thi processor
      const result = await workerFunction(job.data);
      
      // Cập nhật kết quả
      job.status = 'completed';
      job.result = result;
      job.updatedAt = new Date().toISOString();
      
      await this.cacheManager.set(`job:${jobId}`, job, 86400);
      
      this.logger.debug(`Job ${jobId} completed successfully`);
      return true;
    } catch (error) {
      // Xử lý lỗi
      job.status = 'failed';
      job.error = error.message;
      job.updatedAt = new Date().toISOString();
      
      await this.cacheManager.set(`job:${jobId}`, job, 86400);
      
      this.logger.error(`Job ${jobId} failed: ${error.message}`);
      return false;
    }
  }

  // Map để lưu trữ các worker function
  private workerFunctions = new Map<string, (data: any) => Promise<any>>();

  // Xử lý job trong hàng đợi
  async processQueue<T = any, R = any>(
    type: string, 
    processor: (data: T) => Promise<R>
  ): Promise<boolean> {
    if (!this.redisAvailable) {
      return false;
    }
    
    const redisClient = this.getRedisClient();
    if (!redisClient) {
      return false;
    }
    
    const queueKey = `queue:${type}`;
    
    try {
      // Lấy job từ cuối hàng đợi
      const jobId = await redisClient.rpop(queueKey);
      
      if (!jobId) {
        return false;
      }
      
      return await this.processJob(type, jobId);
    } catch (error) {
      this.logger.error(`Error processing queue ${type}: ${error.message}`);
      return false;
    }
  }

  // Khởi động worker để xử lý jobs liên tục
  startWorker<T = any, R = any>(
    type: string, 
    processor: (data: T) => Promise<R>, 
    interval: number = 1000
  ): void {
    if (this.workers.has(type)) {
      this.logger.warn(`Worker for queue ${type} is already running`);
      return;
    }
    
    this.logger.log(`Starting worker for queue ${type}`);
    
    // Lưu worker function vào map
    this.workerFunctions.set(type, processor);
    
    const processNext = async () => {
      try {
        // Xử lý job từ hàng đợi
        const processed = await this.processQueue(type, processor);
        
        // Nếu xử lý thành công, tiếp tục ngay lập tức
        if (processed) {
          setImmediate(processNext);
        }
      } catch (error) {
        this.logger.error(`Error processing queue ${type}: ${error.message}`);
      }
    };
    
    // Bắt đầu xử lý 
    processNext();
    
    // Đặt interval để kiểm tra hàng đợi định kỳ
    const workerId = setInterval(processNext, interval);
    this.workers.set(type, workerId);
  }

  // Dừng worker
  stopWorker(type: string): boolean {
    const workerId = this.workers.get(type);
    
    if (workerId) {
      clearInterval(workerId);
      this.workers.delete(type);
      this.logger.log(`Stopped worker for queue ${type}`);
      return true;
    }
    
    return false;
  }
}