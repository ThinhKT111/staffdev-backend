// src/tasks/task-reminder.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThan, Not, Between, LessThan, In } from 'typeorm';
import { Task, TaskStatus } from '../entities/task.entity';
import { Notification, NotificationType } from '../entities/notification.entity';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class TaskReminderService {
  private readonly logger = new Logger(TaskReminderService.name);

  constructor(
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    private notificationsService: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async sendTaskReminders() {
    // Lấy danh sách nhiệm vụ sắp đến hạn (trong 2 ngày)
    const now = new Date();
    const twoDaysLater = new Date();
    twoDaysLater.setDate(now.getDate() + 2);
    
    const upcomingTasks = await this.taskRepository.find({
      where: {
        deadline: Between(now, twoDaysLater),
        status: Not(In([TaskStatus.COMPLETED, TaskStatus.REJECTED]))
      },
      relations: ['assignedToUser'],
    });
    
    this.logger.log(`Found ${upcomingTasks.length} upcoming tasks to remind users about`);
    
    // Gửi thông báo cho từng người dùng
    for (const task of upcomingTasks) {
      // Định dạng ngày deadline
      const deadlineFormatted = task.deadline.toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      await this.notificationsService.create({
        userId: task.assigned_to,
        title: 'Nhắc nhở nhiệm vụ sắp đến hạn',
        content: `Nhiệm vụ "${task.title}" sẽ đến hạn vào ${deadlineFormatted}`,
        type: NotificationType.TASK
      });
      
      this.logger.debug(`Sent deadline reminder for task ${task.task_id} to user ${task.assigned_to}`);
    }
    
    return upcomingTasks.length;
  }
  
  @Cron('0 9 * * 1') // Chạy vào 9h sáng mỗi thứ 2
  async sendWeeklySummary() {
    this.logger.log('Starting weekly task summary job');
    
    // Lấy tất cả người dùng có nhiệm vụ
    const users = await this.taskRepository
      .createQueryBuilder('task')
      .select('DISTINCT task.assigned_to', 'userId')
      .getRawMany();
    
    const userIds = users.map(u => u.userId);
    this.logger.log(`Found ${userIds.length} users with tasks to send summaries`);
    
    // Gửi báo cáo tổng hợp cho từng người dùng
    for (const userId of userIds) {
      try {
        // Đếm số lượng nhiệm vụ theo trạng thái
        const pendingTasks = await this.taskRepository.count({
          where: {
            assigned_to: userId,
            status: TaskStatus.PENDING
          }
        });
        
        const inProgressTasks = await this.taskRepository.count({
          where: {
            assigned_to: userId,
            status: TaskStatus.IN_PROGRESS
          }
        });
        
        const completedLastWeek = await this.taskRepository.count({
          where: {
            assigned_to: userId,
            status: TaskStatus.COMPLETED,
            updated_at: Between(
              new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
              new Date()
            )
          }
        });
        
        // Gửi thông báo tổng hợp hàng tuần
        await this.notificationsService.create({
          userId,
          title: 'Báo cáo nhiệm vụ hàng tuần',
          content: `Tổng quan nhiệm vụ: ${pendingTasks} chưa bắt đầu, ${inProgressTasks} đang thực hiện. Bạn đã hoàn thành ${completedLastWeek} nhiệm vụ trong tuần qua.`,
          type: NotificationType.TASK
        });
        
        this.logger.debug(`Sent weekly summary to user ${userId}`);
      } catch (error) {
        this.logger.error(`Error sending weekly summary to user ${userId}: ${error.message}`);
      }
    }
  }
  
  @Cron(CronExpression.EVERY_DAY_AT_NOON)
  async checkOverdueTasks() {
    this.logger.log('Checking for overdue tasks');
    
    const now = new Date();
    
    // Tìm các nhiệm vụ đã quá hạn nhưng chưa hoàn thành
    const overdueTasks = await this.taskRepository.find({
      where: {
        deadline: LessThan(now),
        status: In([TaskStatus.PENDING, TaskStatus.IN_PROGRESS])
      },
      relations: ['assignedToUser', 'assignedByUser']
    });
    
    this.logger.log(`Found ${overdueTasks.length} overdue tasks`);
    
    // Gửi thông báo cho người được giao nhiệm vụ và người giao nhiệm vụ
    for (const task of overdueTasks) {
      // Tính số ngày quá hạn
      const daysOverdue = Math.floor((now.getTime() - task.deadline.getTime()) / (24 * 60 * 60 * 1000));
      
      // Thông báo cho người được giao nhiệm vụ
      await this.notificationsService.create({
        userId: task.assigned_to,
        title: 'Nhiệm vụ quá hạn',
        content: `Nhiệm vụ "${task.title}" đã quá hạn ${daysOverdue} ngày. Vui lòng hoàn thành hoặc cập nhật trạng thái.`,
        type: NotificationType.TASK
      });
      
      // Thông báo cho người giao nhiệm vụ (nếu khác người được giao)
      if (task.assigned_by !== task.assigned_to) {
        await this.notificationsService.create({
          userId: task.assigned_by,
          title: 'Nhiệm vụ quá hạn',
          content: `Nhiệm vụ "${task.title}" được giao cho ${task.assignedToUser.full_name} đã quá hạn ${daysOverdue} ngày.`,
          type: NotificationType.TASK
        });
      }
      
      this.logger.debug(`Sent overdue notification for task ${task.task_id}`);
    }
  }
}