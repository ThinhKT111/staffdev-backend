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

@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private webSocketClient: WebSocketClient,
    private queueService: QueueService,
    private unreadCounterService: UnreadCounterService,
  ) {}
  
  // Khởi động worker khi service được khởi tạo
  onModuleInit() {
    this.queueService.startWorker('notification', this.processNotification.bind(this));
    this.queueService.startWorker('bulk_notification', this.processBulkNotification.bind(this));
  }

  // Xử lý thông báo từ queue
  private async processNotification(data: any): Promise<Notification> {
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
      
      return savedNotification;
    } catch (error) {
      this.logger.error(`Failed to process notification: ${error.message}`);
      throw error;
    }
  }

  // Xử lý thông báo hàng loạt từ queue
  private async processBulkNotification(data: any): Promise<any[]> {
    const { userIds, title, content, type } = data;
    const results = [];
    
    for (const userId of userIds) {
      try {
        // Thêm vào hàng đợi thông báo riêng lẻ
        const jobId = await this.queueService.enqueue('notification', {
          userId,
          title,
          content,
          type,
        });
        
        results.push({ userId, jobId, status: 'enqueued' } as any);
      } catch (error) {
        this.logger.error(`Failed to queue notification for user ${userId}: ${error.message}`);
        results.push({ userId, error: error.message, status: 'failed' } as any);
      }
    }
    
    return results;
  }

  async findAll(): Promise<Notification[]> {
    return this.notificationRepository.find({
      relations: ['user'],
      order: { created_at: 'DESC' },
    });
  }

  async findByUser(userId: number, limit?: number): Promise<Notification[]> {
    const queryBuilder = this.notificationRepository.createQueryBuilder('notification')
      .where('notification.user_id = :userId', { userId })
      .orderBy('notification.created_at', 'DESC');
    
    if (limit) {
      queryBuilder.limit(limit);
    }
    
    return queryBuilder.getMany();
  }

  async findOne(id: number): Promise<Notification> {
    const notification = await this.notificationRepository.findOne({
      where: { notification_id: id },
      relations: ['user'],
    });
    
    if (!notification) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }
    
    return notification;
  }
 
  // Sửa đổi phương thức create để sử dụng queue
  async create(createNotificationDto: CreateNotificationDto): Promise<any> {
    const jobId = await this.queueService.enqueue('notification', {
      userId: createNotificationDto.userId,
      title: createNotificationDto.title,
      content: createNotificationDto.content,
      type: createNotificationDto.type,
    });
    
    return {
      message: 'Notification has been enqueued',
      jobId,
    };
  }
 
  // Sửa đổi phương thức tạo thông báo hàng loạt
  async createBulk(bulkCreateDto: BulkCreateNotificationDto): Promise<any> {
    const jobId = await this.queueService.enqueue('bulk_notification', {
      userIds: bulkCreateDto.userIds,
      title: bulkCreateDto.title,
      content: bulkCreateDto.content,
      type: bulkCreateDto.type,
    });
    
    return {
      message: `Bulk notifications for ${bulkCreateDto.userIds.length} users have been enqueued`,
      jobId,
    };
  }
 
  async markAsRead(id: number, markAsReadDto: MarkAsReadDto): Promise<Notification> {
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
    
    return this.notificationRepository.save(notification);
  }
 
  async markAllAsRead(userId: number): Promise<void> {
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
  }
 
  async remove(id: number): Promise<void> {
    const notification = await this.findOne(id);
    await this.notificationRepository.remove(notification);
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
    return this.queueService.getJob(jobId);
  }

  async getUnreadCount(userId: number): Promise<{ count: number }> {
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
  }

  async syncAllUnreadCounters(): Promise<void> {
    // Lấy danh sách người dùng
    const users = await this.userRepository.find({ select: ['user_id'] });
    
    for (const user of users) {
      const count = await this.notificationRepository.count({
        where: { user_id: user.user_id, is_read: false }
      });
      
      await this.unreadCounterService.sync(user.user_id, count);
    }
  }
}