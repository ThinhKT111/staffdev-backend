// src/tasks/task-reminder.service.ts
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThan, Not, Between, LessThan, In } from 'typeorm';
import { Task, TaskStatus } from '../entities/task.entity';
import { Notification, NotificationType } from '../entities/notification.entity';
import { Cron, CronExpression } from '@nestjs/schedule';
import { QueueService } from '../shared/services/queue.service';

@Injectable()
export class TaskReminderService implements OnModuleInit {
  private readonly logger = new Logger(TaskReminderService.name);

  constructor(
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    private queueService: QueueService,
  ) {}
  
  onModuleInit() {
    // Khởi động worker cho các nhiệm vụ nhắc nhở
    this.queueService.startWorker('task_reminder', this.processTaskReminder.bind(this));
  }

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async scheduleDailyReminders() {
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
    
    // Thêm nhiệm vụ vào hàng đợi để gửi thông báo nhắc nhở
    const reminderJobs = [];
    
    for (const task of upcomingTasks) {
      const jobId = await this.queueService.enqueue('task_reminder', {
        taskId: task.task_id,
        userId: task.assigned_to,
        title: task.title,
        deadline: task.deadline,
      });
      
      reminderJobs.push({ taskId: task.task_id, jobId } as any);
      
      this.logger.debug(`Queued reminder for task ${task.task_id}`);
    }
    
    return {
      message: `Scheduled reminders for ${upcomingTasks.length} tasks`,
      jobs: reminderJobs,
    };
  }
  
  // Xử lý nhắc nhở nhiệm vụ từ queue
  private async processTaskReminder(data: any): Promise<any> {
    const { taskId, userId, title, deadline } = data;
    
    // Định dạng deadline
    const deadlineDate = new Date(deadline);
    const formattedDeadline = deadlineDate.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    // Tạo thông báo nhắc nhở bằng cách thêm vào hàng đợi thông báo
    const notificationJobId = await this.queueService.enqueue('notification', {
      userId,
      title: 'Nhắc nhở nhiệm vụ sắp đến hạn',
      content: `Nhiệm vụ "${title}" sẽ đến hạn vào ${formattedDeadline}`,
      type: 'Task',
    });
    
    return {
      taskId,
      userId,
      notificationJobId,
      message: `Reminder for task ${taskId} has been sent to user ${userId}`
    };
  }
}