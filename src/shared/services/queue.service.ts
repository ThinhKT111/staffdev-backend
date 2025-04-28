// src/shared/services/queue.service.ts
import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { v4 as uuidv4 } from 'uuid';

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface Job {
  id: string;
  type: string;
  data: any;
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
  
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  // Thêm job vào hàng đợi
  async enqueue(type: string, data: any): Promise<string> {
    const jobId = uuidv4();
    
    const job: Job = {
      id: jobId,
      type,
      data,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    // Lưu thông tin job
    await this.cacheManager.set(`job:${jobId}`, job);
    
    // Thêm job vào hàng đợi
    const redisClient = this.cacheManager.store.getClient();
    await redisClient.lpush(`queue:${type}`, jobId);
    
    this.logger.debug(`Added job ${jobId} to queue ${type}`);
    
    return jobId;
  }

  // Lấy thông tin của job
  async getJob(jobId: string): Promise<Job | null> {
    return this.cacheManager.get<Job>(`job:${jobId}`);
  }

  // Xử lý job trong hàng đợi
  async processQueue(type: string, processor: (data: any) => Promise<any>): Promise<boolean> {
    const redisClient = this.cacheManager.store.getClient();
    const queueKey = `queue:${type}`;
    
    // Lấy job từ cuối hàng đợi
    const jobId = await redisClient.rpop(queueKey);
    
    if (!jobId) {
      return false;
    }
    
    const job = await this.cacheManager.get<Job>(`job:${jobId}`);
    
    if (!job) {
      this.logger.warn(`Job ${jobId} not found`);
      return false;
    }
    
    try {
      // Cập nhật trạng thái
      job.status = 'processing';
      job.updatedAt = new Date().toISOString();
      await this.cacheManager.set(`job:${jobId}`, job);
      
      // Thực thi processor
      const result = await processor(job.data);
      
      // Cập nhật kết quả
      job.status = 'completed';
      job.result = result;
      job.updatedAt = new Date().toISOString();
      
      await this.cacheManager.set(`job:${jobId}`, job, 86400); // Lưu 1 ngày
      
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

  // Khởi động worker để xử lý jobs liên tục
  startWorker(type: string, processor: (data: any) => Promise<any>, interval: number = 1000): void {
    if (this.workers.has(type)) {
      this.logger.warn(`Worker for queue ${type} is already running`);
      return;
    }
    
    this.logger.log(`Starting worker for queue ${type}`);
    
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