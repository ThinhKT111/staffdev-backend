// src/notifications/notifications.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType } from '../entities/notification.entity';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { MarkAsReadDto } from './dto/mark-as-read.dto';
import { NotificationsGateway } from './notifications.gateway';
import { BulkCreateNotificationDto } from './dto/bulk-create-notification.dto';
import { User } from '../entities/user.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private notificationsGateway: NotificationsGateway,
  ) {}

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

  // Thêm phương thức tìm kiếm với phân trang
  async findByUserPaginated(userId: number, page: number = 1, pageSize: number = 10): Promise<{
    notifications: Notification[],
    total: number,
    page: number,
    pageSize: number,
    pageCount: number
  }> {
    const skip = (page - 1) * pageSize;
    
    const [notifications, total] = await this.notificationRepository.findAndCount({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
      skip,
      take: pageSize
    });
    
    return {
      notifications,
      total,
      page,
      pageSize,
      pageCount: Math.ceil(total / pageSize)
    };
  }

  // Thêm phương thức tìm theo loại
  async findByType(userId: number, type: NotificationType): Promise<Notification[]> {
    return this.notificationRepository.find({
      where: {
        user_id: userId,
        type
      },
      order: { created_at: 'DESC' }
    });
  }

  // Thêm phương thức batch mark as read
  async markMultipleAsRead(userId: number, notificationIds: number[]): Promise<void> {
    await this.notificationRepository.update(
      { 
        user_id: userId,
        notification_id: In(notificationIds)  // Sử dụng typeorm In operator
      },
      { is_read: true }
    );
  }

  async create(createNotificationDto: CreateNotificationDto): Promise<Notification> {
    // Map type string to enum
    let type: NotificationType;
    switch (createNotificationDto.type) {
      case 'Task':
        type = NotificationType.TASK;
        break;
      case 'Assignment':
        type = NotificationType.ASSIGNMENT;
        break;
      case 'Training':
        type = NotificationType.TRAINING;
        break;
      default:
        type = NotificationType.GENERAL;
    }
  
    const notification = this.notificationRepository.create({
      user_id: createNotificationDto.userId,
      title: createNotificationDto.title,
      content: createNotificationDto.content,
      type: type,
      is_read: false,
      created_at: new Date(),
    });
    
    const savedNotification = await this.notificationRepository.save(notification);
    
    // Send realtime notification through WebSocket
    this.notificationsGateway.sendNotificationToUser(
      createNotificationDto.userId,
      savedNotification
    );
    
    return savedNotification;
  }

  async markAsRead(id: number, markAsReadDto: MarkAsReadDto): Promise<Notification> {
    const notification = await this.findOne(id);
    
    notification.is_read = markAsReadDto.isRead !== undefined ? markAsReadDto.isRead : true;
    
    return this.notificationRepository.save(notification);
  }

  async markAllAsRead(userId: number): Promise<void> {
    await this.notificationRepository.update(
      { user_id: userId, is_read: false },
      { is_read: true }
    );
  }

  async remove(id: number): Promise<void> {
    const notification = await this.findOne(id);
    await this.notificationRepository.remove(notification);
  }

  async createBulk(bulkCreateDto: BulkCreateNotificationDto): Promise<any> {
    const { userIds, title, content, type } = bulkCreateDto;
    const createdNotifications: Notification[] = [];
    
    // Tạo thông báo cho mỗi người dùng
    for (const userId of userIds) {
      try {
        const notification = await this.create({
          userId,
          title,
          content,
          type,
        });
        createdNotifications.push(notification);
      } catch (error) {
        console.error(`Lỗi khi tạo thông báo cho người dùng ${userId}:`, error);
      }
    }
    
    return {
      message: `Đã tạo ${createdNotifications.length} thông báo từ tổng số ${userIds.length} người dùng`,
      notifications: createdNotifications,
    };
  }

  async createForDepartment(
    departmentId: number,
    title: string,
    content: string,
    type: string
  ): Promise<any> {
    // Lấy tất cả người dùng trong phòng ban
    const users = await this.userRepository.find({
      where: { department_id: departmentId },
    });
    
    if (users.length === 0) {
      throw new NotFoundException(`Không tìm thấy người dùng trong phòng ban ID ${departmentId}`);
    }
    
    const userIds = users.map(user => user.user_id);
    
    // Gọi hàm createBulk để tạo thông báo cho tất cả người dùng
    return this.createBulk({
      userIds,
      title,
      content,
      type,
    });
  }

  async getUnreadCount(userId: number): Promise<number> {
    const count = await this.notificationRepository.count({
      where: {
        user_id: userId,
        is_read: false
      }
    });
    
    return count;
  }

  async createSystemNotification(event: string, userId: number, data: any): Promise<Notification> {
    // Tạo thông báo dựa trên sự kiện
    let title: string;
    let content: string;
    let type: NotificationType;
    
    switch (event) {
      case 'task_assigned':
        title = 'Nhiệm vụ mới';
        content = `Bạn được giao nhiệm vụ: ${data.title}`;
        type = NotificationType.TASK;
        break;
      case 'course_enrolled':
        title = 'Đăng ký khóa học';
        content = `Bạn đã đăng ký khóa học: ${data.title}`;
        type = NotificationType.TRAINING;
        break;
      case 'assignment_due':
        title = 'Bài tập sắp đến hạn';
        content = `Bài tập ${data.title} sẽ đến hạn vào ${new Date(data.deadline).toLocaleString()}`;
        type = NotificationType.ASSIGNMENT;
        break;
      default:
        title = 'Thông báo';
        content = data.message || 'Bạn có thông báo mới';
        type = NotificationType.GENERAL;
    }
    
    // Tạo và lưu thông báo
    return this.create({
      userId,
      title,
      content,
      type: type.toString(),
    });
  }

  // Thêm phương thức mới
  async sendBulkNotification(
    userIds: number[],
    title: string,
    content: string,
    type: string,
    metadata?: any
  ): Promise<Notification[]> {
    const notifications: Notification[] = [];
    
    for (const userId of userIds) {
      try {
        const notification = await this.create({
          userId,
          title,
          content,
          type
        });
        
        if (metadata) {
          notification['metadata'] = metadata;
        }
        
        notifications.push(notification);
      } catch (error) {
        this.logger.error(`Failed to create notification for user ${userId}: ${error.message}`);
      }
    }
    
    return notifications;
  }

  // Phương thức gửi thông báo đến tất cả người dùng trong phòng ban
  async notifyDepartment(
    departmentId: number,
    title: string,
    content: string,
    type: string,
    excludeUserIds: number[] = []
  ): Promise<Notification[]> {
    // Lấy tất cả người dùng trong phòng ban
    const users = await this.userRepository.find({
      where: { department_id: departmentId }
    });
    
    // Lọc ra những người dùng không bị loại trừ
    const userIds = users
      .map(user => user.user_id)
      .filter(id => !excludeUserIds.includes(id));
    
    return this.sendBulkNotification(userIds, title, content, type);
  }

  // Phương thức "Gọi ý" thông báo dựa trên người dùng và tài nguyên
  async suggestNotifications(userId: number, resourceType: string, resourceId: number): Promise<void> {
    // Đây là ví dụ về cách gợi ý thông báo thông minh dựa trên người dùng và tài nguyên
    switch (resourceType) {
      case 'task':
        // Ví dụ: Gợi ý nhiệm vụ liên quan
        const relatedTasks = await this.findRelatedItems('task', resourceId, userId);
        if (relatedTasks.length > 0) {
          await this.create({
            userId,
            title: "Gợi ý nhiệm vụ liên quan",
            content: `Có ${relatedTasks.length} nhiệm vụ liên quan đến nhiệm vụ hiện tại của bạn`,
            type: "Task"
          });
        }
        break;
        
      case 'course':
        // Ví dụ: Gợi ý khóa học tiếp theo
        const recommendedCourses = await this.findRelatedItems('course', resourceId, userId);
        if (recommendedCourses.length > 0) {
          await this.create({
            userId,
            title: "Gợi ý khóa học",
            content: `Có ${recommendedCourses.length} khóa học bạn có thể quan tâm`,
            type: "Training"
          });
        }
        break;
    }
  }

  // Phương thức ví dụ cho findRelatedItems (bạn cần phát triển theo logic thực tế)
  private async findRelatedItems(itemType: string, itemId: number, userId: number): Promise<any[]> {
    // Đây chỉ là stub, bạn cần thực hiện logic thực tế để tìm các tài nguyên liên quan
    return [];
  }
}