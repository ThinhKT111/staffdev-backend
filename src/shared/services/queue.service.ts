// src/shared/services/queue.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { RedisService } from '../../common/services/redis.service';

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
  private memoryJobs: Map<string, Job> = new Map(); // Fallback khi Redis không khả dụng
  private memoryQueues: Map<string, string[]> = new Map(); // Fallback queues

  constructor(private redisService: RedisService) {
    this.logger.log('QueueService initialized with RedisService');
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
    
    const redisClient = this.redisService.getClient();
    if (this.redisService.isReady() && redisClient) {
      // Lưu thông tin job vào Redis cache
      try {
        await redisClient.set(`job:${jobId}`, JSON.stringify(job), { EX: 86400 }); // 1 day TTL
        
        // Thêm job vào hàng đợi Redis
        await redisClient.lPush(`queue:${type}`, [jobId]);
        this.logger.debug(`Added job ${jobId} to Redis queue ${type}`);
      } catch (error) {
        this.logger.error(`Failed to add job to Redis: ${error.message}`);
        // Fallback to memory processing
        this.memoryJobs.set(jobId, job);
        const queueIds = this.memoryQueues.get(type) || [];
        queueIds.push(jobId);
        this.memoryQueues.set(type, queueIds);
        setTimeout(() => this.processJob(type, jobId), 0);
      }
    } else {
      // Xử lý job ngay lập tức nếu Redis không khả dụng
      this.logger.warn('Redis not available, using memory queue');
      this.memoryJobs.set(jobId, job);
      const queueIds = this.memoryQueues.get(type) || [];
      queueIds.push(jobId);
      this.memoryQueues.set(type, queueIds);
      setTimeout(() => this.processJob(type, jobId), 0);
    }
    
    return jobId;
  }

  // Lấy thông tin của job
  async getJob<T = any>(jobId: string): Promise<Job<T> | null> {
    const redisClient = this.redisService.getClient();
    if (this.redisService.isReady() && redisClient) {
      try {
        const jobStr = await redisClient.get(`job:${jobId}`);
        if (jobStr) {
          return JSON.parse(jobStr);
        }
      } catch (error) {
        this.logger.error(`Error getting job from Redis: ${error.message}`);
      }
    }
    
    // Fallback to memory cache
    return this.memoryJobs.get(jobId) as Job<T> || null;
  }

  // Các phương thức khác giữ nguyên...
  
  // Map để lưu trữ các worker function
  private workerFunctions = new Map<string, (data: any) => Promise<any>>();

  // Xử lý job trong hàng đợi
  async processQueue<T = any, R = any>(
    type: string, 
    processor: (data: T) => Promise<R>
  ): Promise<boolean> {
    const redisClient = this.redisService.getClient();
    if (this.redisService.isReady() && redisClient) {
      try {
        // Lấy job từ cuối hàng đợi
        const jobId = await redisClient.rPop(`queue:${type}`);
        
        if (!jobId) {
          return false;
        }
        
        return await this.processJob(type, jobId);
      } catch (error) {
        this.logger.error(`Error processing Redis queue ${type}: ${error.message}`);
      }
    }
    
    // Fallback to memory queue
    const queueIds = this.memoryQueues.get(type) || [];
    if (queueIds.length === 0) {
      return false;
    }
    
    const jobId = queueIds.pop();
    this.memoryQueues.set(type, queueIds);
    
    if (!jobId) {
      return false;
    }
    
    return await this.processJob(type, jobId);
  }

  // Xử lý một job cụ thể
  private async processJob<T = any>(type: string, jobId: string): Promise<boolean> {
    let job: Job<T> | null = null;
    const redisClient = this.redisService.getClient();
    
    if (this.redisService.isReady() && redisClient) {
      try {
        const jobStr = await redisClient.get(`job:${jobId}`);
        if (jobStr) {
          job = JSON.parse(jobStr);
        }
      } catch (error) {
        this.logger.error(`Error getting job from Redis: ${error.message}`);
      }
    }
    
    if (!job) {
      job = this.memoryJobs.get(jobId) as Job<T>;
    }
    
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
      
      if (this.redisService.isReady() && redisClient) {
        try {
          await redisClient.set(`job:${jobId}`, JSON.stringify(job), { EX: 86400 });
        } catch (error) {
          this.logger.error(`Error updating job in Redis: ${error.message}`);
        }
      }
      this.memoryJobs.set(jobId, job);
      
      // Thực thi processor
      const result = await workerFunction(job.data);
      
      // Cập nhật kết quả
      job.status = 'completed';
      job.result = result;
      job.updatedAt = new Date().toISOString();
      
      if (this.redisService.isReady() && redisClient) {
        try {
          await redisClient.set(`job:${jobId}`, JSON.stringify(job), { EX: 86400 });
        } catch (error) {
          this.logger.error(`Error updating job result in Redis: ${error.message}`);
        }
      }
      this.memoryJobs.set(jobId, job);
      
      this.logger.debug(`Job ${jobId} completed successfully`);
      return true;
    } catch (error) {
      // Xử lý lỗi
      job.status = 'failed';
      job.error = error.message;
      job.updatedAt = new Date().toISOString();
      
      if (this.redisService.isReady() && redisClient) {
        try {
          await redisClient.set(`job:${jobId}`, JSON.stringify(job), { EX: 86400 });
        } catch (err) {
          this.logger.error(`Error updating job error in Redis: ${err.message}`);
        }
      }
      this.memoryJobs.set(jobId, job);
      
      this.logger.error(`Job ${jobId} failed: ${error.message}`);
      return false;
    }
  }

  // Khởi động worker để xử lý job
  startWorker<T = any, R = any>(
    type: string, 
    processor: (data: T) => Promise<R>, 
    interval: number = 1000
  ): void {
    // Đăng ký processor
    this.workerFunctions.set(type, processor);
    
    // Dừng worker cũ nếu đã tồn tại
    this.stopWorker(type);
    
    const processNext = async () => {
      try {
        const processed = await this.processQueue(type, processor);
        if (processed) {
          // Nếu có job được xử lý, tiếp tục ngay lập tức
          setImmediate(() => processNext());
        }
      } catch (error) {
        this.logger.error(`Error in worker ${type}: ${error.message}`);
      }
    };
    
    // Khởi động worker mới
    const worker = setInterval(processNext, interval);
    this.workers.set(type, worker);
    
    this.logger.log(`Started worker for queue ${type}`);
  }

  // Dừng worker
  stopWorker(type: string): boolean {
    const worker = this.workers.get(type);
    if (worker) {
      clearInterval(worker);
      this.workers.delete(type);
      this.logger.log(`Stopped worker for queue ${type}`);
      return true;
    }
    return false;
  }
}