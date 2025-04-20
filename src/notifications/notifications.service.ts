// src/notifications/notifications.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType } from '../entities/notification.entity';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { MarkAsReadDto } from './dto/mark-as-read.dto';
import { NotificationsGateway } from './notifications.gateway';

@Injectable()
export class NotificationsService {
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
}