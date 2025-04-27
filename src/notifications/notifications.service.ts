// src/notifications/notifications.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType } from '../entities/notification.entity';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { MarkAsReadDto } from './dto/mark-as-read.dto';
import { NotificationsGateway } from './notifications.gateway';
import { BulkCreateNotificationDto } from './dto/bulk-create-notification.dto';

@Injectable()
export class NotificationsService {
  userRepository: any;
  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    private notificationsGateway: NotificationsGateway,
  ) {}

  async findAll(): Promise<Notification[]> {
    return this.notificationRepository.find({
      relations: ['user'],
      order: { created_at: 'DESC' },
    });
  }

  async findByUser(userId: number): Promise<Notification[]> {
    return this.notificationRepository.find({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
    });
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
    
    // Send realtime notification
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
    const createdNotifications = [];
    
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
}