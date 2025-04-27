// src/tasks/task-reminder.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThan, IsNull } from 'typeorm';
import { Task } from '../entities/task.entity';
import { Notification } from '../entities/notification.entity';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class TaskReminderService {
  constructor(
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async sendTaskReminders() {
    // Lấy danh sách nhiệm vụ sắp đến hạn (trong 2 ngày)
    const now = new Date();
    const twoDaysLater = new Date();
    twoDaysLater.setDate(now.getDate() + 2);
    
    const upcomingTasks = await this.taskRepository.find({
      where: {
        deadline: LessThanOrEqual(twoDaysLater),
        deadline: MoreThan(now),
        status: 'InProgress',
      },
      relations: ['assignedToUser'],
    });
    
    // Gửi thông báo cho từng người dùng
    for (const task of upcomingTasks) {
      // Kiểm tra xem đã gửi thông báo chưa
      const existingNotification = await this.notificationRepository.findOne({
        where: {
          user_id: task.assigned_to,
          title: `Reminder: ${task.title}`,
          type: 'Task',
        },
      });
      
      if (!existingNotification) {
        // Tạo thông báo mới
        const notification = this.notificationRepository.create({
          user_id: task.assigned_to,
          title: `Reminder: ${task.title}`,
          content: `Nhiệm vụ "${task.title}" sẽ đến hạn vào ${task.deadline.toLocaleDateString()}.`,
          type: 'Task',
          is_read: false,
          created_at: new Date(),
        });
        
        await this.notificationRepository.save(notification);
      }
    }
    
    return upcomingTasks.length;
  }
}