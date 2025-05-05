// src/notifications/notifications.service.ts
import { Injectable, NotFoundException, Logger, Inject, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Notification, NotificationType } from '../entities/notification.entity';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { MarkAsReadDto } from './dto/mark-as-read.dto';
import { BulkCreateNotificationDto } from './dto/bulk-create-notification.dto';
import { User } from '../entities/user.entity';
import { WebSocketClient } from '../shared/websocket.client';
import { NotificationEvents } from './dto/notification-event.dto';
import { QueueService } from '../shared/services/queue.service';
import { UnreadCounterService } from './services/unread-counter.service';
import { ElasticsearchService } from '../elasticsearch/elasticsearch.service';
import { Cron, CronExpression } from '@nestjs/schedule';

interface NotificationJobData {
  userId: number;
  title: string;
  content: string;
  type: string;
}

interface BulkNotificationJobData {
  userIds: number[];
  title: string;
  content: string;
  type: string;
}

@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly logger = new Logger(NotificationsService.name);
  private isElasticsearchAvailable = false;

  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private webSocketClient: WebSocketClient,
    private queueService: QueueService,
    private unreadCounterService: UnreadCounterService,
    private elasticsearchService: ElasticsearchService,
  ) {}
  
  // Khởi động worker khi service được khởi tạo
  async onModuleInit() {
    this.queueService.startWorker('notification', this.processNotification.bind(this));
    this.queueService.startWorker('bulk_notification', this.processBulkNotification.bind(this));
    
    // Kiểm tra Elasticsearch có khả dụng không
    try {
      await this.elasticsearchService.checkHealth().available;
      this.isElasticsearchAvailable = true;
      this.logger.log('Elasticsearch khả dụng cho NotificationsService');
      
      // Đồng bộ dữ liệu notifications vào Elasticsearch
      this.syncNotificationsToElasticsearch();
    } catch (error) {
      this.isElasticsearchAvailable = false;
      this.logger.warn('Elasticsearch không khả dụng cho NotificationsService');
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async syncNotificationsToElasticsearch() {
    if (!this.isElasticsearchAvailable) {
      this.logger.warn('Elasticsearch không khả dụng. Bỏ qua đồng bộ dữ liệu thông báo.');
      return;
    }

    try {
      this.logger.log('Bắt đầu đồng bộ dữ liệu thông báo với Elasticsearch...');
      
      // Lấy tất cả thông báo từ database
      const notifications = await this.notificationRepository.find();
      
      for (const notification of notifications) {
        // Chuẩn bị dữ liệu cho Elasticsearch
        const esNotification = {
          notification_id: notification.notification_id,
          user_id: notification.user_id,
          title: notification.title,
          content: notification.content,
          type: notification.type,
          is_read: notification.is_read,
          created_at: notification.created_at,
        };
        
        // Index vào Elasticsearch
        await this.elasticsearchService.indexNotification(esNotification);
      }
      
      this.logger.log(`Đã đồng bộ ${notifications.length} thông báo vào Elasticsearch`);
    } catch (error) {
      this.logger.error(`Lỗi khi đồng bộ dữ liệu thông báo: ${error.message}`);
    }
  }

  // Xử lý thông báo từ queue
  private async processNotification(data: NotificationJobData): Promise<Notification> {
    const { userId, title, content, type } = data;
    
    try {
      // Tạo thông báo mới
      const notification = this.notificationRepository.create({
        user_id: userId,
        title,
        content,
        type: this.mapNotificationType(type),
        is_read: false,
        created_at: new Date(),
      });
      
      const savedNotification = await this.notificationRepository.save(notification);
      
      // Tăng counter thông báo chưa đọc
      const unreadCount = await this.unreadCounterService.increment(userId);
      
      // Gửi thông báo qua WebSocket với số lượng chưa đọc
      this.webSocketClient.sendToUser(
        userId,
        NotificationEvents.NEW_NOTIFICATION,
        {
          ...savedNotification,
          unreadCount,
        }
      );
      
      // Nếu Elasticsearch khả dụng, index notification
      if (this.isElasticsearchAvailable) {
        try {
          const esNotification = {
            notification_id: savedNotification.notification_id,
            user_id: savedNotification.user_id,
            title: savedNotification.title,
            content: savedNotification.content,
            type: savedNotification.type,
            is_read: savedNotification.is_read,
            created_at: savedNotification.created_at,
          };
          
          await this.elasticsearchService.indexNotification(esNotification);
        } catch (error) {
          this.logger.error(`Lỗi khi index thông báo vào Elasticsearch: ${error.message}`);
        }
      }
      
      return savedNotification;
    } catch (error) {
      this.logger.error(`Failed to process notification: ${error.message}`);
      throw error;
    }
  }

  // Xử lý thông báo hàng loạt từ queue
  private async processBulkNotification(data: BulkNotificationJobData): Promise<any[]> {
    const { userIds, title, content, type } = data;
    // Explicitly type the results array 
    const results: Array<{userId: number; jobId?: string; error?: any; status: string}> = [];
    
    for (const userId of userIds) {
      try {
        // Thêm vào hàng đợi thông báo riêng lẻ
        const jobId = await this.queueService.enqueue<NotificationJobData>('notification', {
          userId,
          title,
          content,
          type,
        });
        
        results.push({ userId, jobId, status: 'enqueued' });
      } catch (error) {
        this.logger.error(`Failed to queue notification for user ${userId}: ${error.message}`);
        results.push({ userId, error: error.message, status: 'failed' });
      }
    }
    
    return results;
  }

  async findAll(): Promise<Notification[]> {
    try {
      return this.notificationRepository.find({
        relations: ['user'],
        order: { created_at: 'DESC' },
      });
    } catch (error) {
      this.logger.error(`Lỗi khi lấy tất cả thông báo: ${error.message}`);
      return [];
    }
  }

  async findByUser(userId: number, limit?: number): Promise<Notification[]> {
    try {
      const queryBuilder = this.notificationRepository.createQueryBuilder('notification')
        .where('notification.user_id = :userId', { userId })
        .orderBy('notification.created_at', 'DESC');
      
      if (limit) {
        queryBuilder.limit(limit);
      }
      
      return queryBuilder.getMany();
    } catch (error) {
      this.logger.error(`Lỗi khi lấy thông báo của người dùng ${userId}: ${error.message}`);
      return [];
    }
  }

  async findOne(id: number): Promise<Notification> {
    try {
      const notification = await this.notificationRepository.findOne({
        where: { notification_id: id },
        relations: ['user'],
      });
      
      if (!notification) {
        throw new NotFoundException(`Notification with ID ${id} not found`);
      }
      
      return notification;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Lỗi khi lấy thông báo ${id}: ${error.message}`);
      throw new NotFoundException(`Error fetching notification ${id}`);
    }
  }
 
  // Sửa đổi phương thức create để sử dụng queue
  async create(createNotificationDto: CreateNotificationDto): Promise<any> {
    try {
      const jobId = await this.queueService.enqueue<NotificationJobData>('notification', {
        userId: createNotificationDto.userId,
        title: createNotificationDto.title,
        content: createNotificationDto.content,
        type: createNotificationDto.type,
      });
      
      return {
        message: 'Notification has been enqueued',
        jobId,
      };
    } catch (error) {
      this.logger.error(`Lỗi khi tạo thông báo: ${error.message}`);
      throw error;
    }
  }
 
  // Sửa đổi phương thức tạo thông báo hàng loạt
  async createBulk(bulkCreateDto: BulkCreateNotificationDto): Promise<any> {
    try {
      const jobId = await this.queueService.enqueue<BulkNotificationJobData>('bulk_notification', {
        userIds: bulkCreateDto.userIds,
        title: bulkCreateDto.title,
        content: bulkCreateDto.content,
        type: bulkCreateDto.type,
      });
      
      return {
        message: `Bulk notifications for ${bulkCreateDto.userIds.length} users have been enqueued`,
        jobId,
      };
    } catch (error) {
      this.logger.error(`Lỗi khi tạo thông báo hàng loạt: ${error.message}`);
      throw error;
    }
  }
 
  async markAsRead(id: number, markAsReadDto: MarkAsReadDto): Promise<Notification> {
    try {
      const notification = await this.findOne(id);
      
      // Nếu đang chưa đọc và bây giờ đánh dấu đã đọc
      if (!notification.is_read && markAsReadDto.isRead !== false) {
        // Giảm counter
        const unreadCount = await this.unreadCounterService.decrement(notification.user_id);
        
        // Thông báo qua WebSocket
        this.webSocketClient.sendToUser(
          notification.user_id,
          NotificationEvents.UNREAD_COUNT,
          { unreadCount }
        );
      }
      
      notification.is_read = markAsReadDto.isRead !== undefined ? markAsReadDto.isRead : true;
      
      const savedNotification = await this.notificationRepository.save(notification);
      
      // Nếu Elasticsearch khả dụng, update notification
      if (this.isElasticsearchAvailable) {
        try {
          const esNotification = {
            notification_id: savedNotification.notification_id,
            is_read: savedNotification.is_read,
          };
          
          await this.elasticsearchService.updateNotification(esNotification);
        } catch (error) {
          this.logger.error(`Lỗi khi update thông báo trong Elasticsearch: ${error.message}`);
        }
      }
      
      return savedNotification;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Lỗi khi đánh dấu đã đọc thông báo ${id}: ${error.message}`);
      throw error;
    }
  }
 
  async markAllAsRead(userId: number): Promise<void> {
    try {
      await this.notificationRepository.update(
        { user_id: userId, is_read: false },
        { is_read: true }
      );
      
      // Reset counter về 0
      await this.unreadCounterService.reset(userId);
      
      // Thông báo qua WebSocket
      this.webSocketClient.sendToUser(
        userId,
        NotificationEvents.ALL_NOTIFICATIONS_READ,
        { unreadCount: 0 }
      );
      
      // Nếu Elasticsearch khả dụng, update tất cả notifications
      if (this.isElasticsearchAvailable) {
        try {
          // Lấy tất cả thông báo của người dùng chưa đọc
          const notifications = await this.notificationRepository.find({
            where: { user_id: userId, is_read: false },
          });
          
          // Update từng thông báo trong Elasticsearch
          for (const notification of notifications) {
            const esNotification = {
              notification_id: notification.notification_id,
              is_read: true,
            };
            
            await this.elasticsearchService.updateNotification(esNotification);
          }
        } catch (error) {
          this.logger.error(`Lỗi khi update tất cả thông báo trong Elasticsearch: ${error.message}`);
        }
      }
    } catch (error) {
      this.logger.error(`Lỗi khi đánh dấu đã đọc tất cả thông báo của người dùng ${userId}: ${error.message}`);
      throw error;
    }
  }
 
  async remove(id: number): Promise<void> {
    try {
      const notification = await this.findOne(id);
      
      await this.notificationRepository.remove(notification);
      
      // Nếu Elasticsearch khả dụng, delete notification
      if (this.isElasticsearchAvailable) {
        try {
          await this.elasticsearchService.deleteNotification(id);
        } catch (error) {
          this.logger.error(`Lỗi khi xóa thông báo khỏi Elasticsearch: ${error.message}`);
        }
      }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Lỗi khi xóa thông báo ${id}: ${error.message}`);
      throw error;
    }
  }
 
  // Helper để convert string type sang enum
  private mapNotificationType(type: string): NotificationType {
    switch (type) {
      case 'Task':
        return NotificationType.TASK;
      case 'Assignment':
        return NotificationType.ASSIGNMENT;
      case 'Training':
        return NotificationType.TRAINING;
      default:
        return NotificationType.GENERAL;
    }
  }
 
  // Thêm phương thức để kiểm tra trạng thái thông báo
  async getNotificationStatus(jobId: string): Promise<any> {
    try {
      return this.queueService.getJob(jobId);
    } catch (error) {
      this.logger.error(`Lỗi khi lấy trạng thái thông báo: ${error.message}`);
      throw error;
    }
  }

  async getUnreadCount(userId: number): Promise<{ count: number }> {
    try {
      // Lấy từ Redis cache trước
      let count = await this.unreadCounterService.getCount(userId);
      
      // Nếu counter là 0, kiểm tra lại với database (đề phòng mất đồng bộ)
      if (count === 0) {
        const dbCount = await this.notificationRepository.count({
          where: { user_id: userId, is_read: false }
        });
        
        if (dbCount > 0) {
          // Nếu có sự khác biệt, đồng bộ lại counter
          await this.unreadCounterService.sync(userId, dbCount);
          count = dbCount;
        }
      }
      
      return { count };
    } catch (error) {
      this.logger.error(`Lỗi khi lấy số lượng thông báo chưa đọc: ${error.message}`);
      return { count: 0 };
    }
  }

  async syncAllUnreadCounters(): Promise<void> {
    try {
      // Lấy danh sách người dùng
      const users = await this.userRepository.find({ select: ['user_id'] });
      
      for (const user of users) {
        const count = await this.notificationRepository.count({
          where: { user_id: user.user_id, is_read: false }
        });
        
        await this.unreadCounterService.sync(user.user_id, count);
      }
    } catch (error) {
      this.logger.error(`Lỗi khi đồng bộ tất cả unread counters: ${error.message}`);
      throw error;
    }
  }
  
  // Phương thức tìm kiếm thông báo với Elasticsearch
  async searchNotifications(query: string, userId: number, page: number = 1, size: number = 10): Promise<any> {
    if (!this.isElasticsearchAvailable) {
      // Fallback to regular search if Elasticsearch is not available
      try {
        const [notifications, total] = await this.notificationRepository.createQueryBuilder('notification')
          .where('notification.user_id = :userId', { userId })
          .andWhere('(notification.title ILIKE :query OR notification.content ILIKE :query)', { query: `%${query}%` })
          .orderBy('notification.created_at', 'DESC')
          .skip((page - 1) * size)
          .take(size)
          .getManyAndCount();
        
        return {
          results: notifications,
          pagination: {
            total,
            page,
            size,
            pages: Math.ceil(total / size),
          },
        };
      } catch (error) {
        this.logger.error(`Lỗi khi tìm kiếm thông báo: ${error.message}`);
        return {
          results: [],
          pagination: {
            total: 0,
            page,
            size,
            pages: 0,
          },
        };
      }
    }
    
    // Use Elasticsearch
    return this.elasticsearchService.searchNotifications(query, userId, page, size);
  }
}