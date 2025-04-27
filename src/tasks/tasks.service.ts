// src/tasks/tasks.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThan, Not, Between, LessThan, In } from 'typeorm';
import { Task, TaskStatus } from '../entities/task.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { FeedbackTaskDto } from './dto/feedback-task.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../entities/notification.entity';


@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private tasksRepository: Repository<Task>,
    private notificationsService: NotificationsService
  ) {}

  async findAll(): Promise<Task[]> {
    return this.tasksRepository.find({
      relations: ['assignedToUser', 'assignedByUser'],
    });
  }

  async findByAssignedTo(userId: number): Promise<Task[]> {
    return this.tasksRepository.find({
      where: { assigned_to: userId },
      relations: ['assignedToUser', 'assignedByUser'],
    });
  }

  async findByAssignedBy(userId: number): Promise<Task[]> {
    return this.tasksRepository.find({
      where: { assigned_by: userId },
      relations: ['assignedToUser', 'assignedByUser'],
    });
  }

  async findOne(id: number): Promise<Task> {
    const task = await this.tasksRepository.findOne({
      where: { task_id: id },
      relations: ['assignedToUser', 'assignedByUser'],
    });
    
    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }
    
    return task;
  }

  async create(createTaskDto: CreateTaskDto): Promise<Task> {
    // Map status string to enum
    let status: TaskStatus;
    switch (createTaskDto.status) {
      case 'Pending':
        status = TaskStatus.PENDING;
        break;
      case 'InProgress':
        status = TaskStatus.IN_PROGRESS;
        break;
      case 'Completed':
        status = TaskStatus.COMPLETED;
        break;
      case 'Rejected':
        status = TaskStatus.REJECTED;
        break;
      default:
        status = TaskStatus.PENDING;
    }

    // Create new task
    const task = this.tasksRepository.create({
      title: createTaskDto.title,
      description: createTaskDto.description,
      assigned_to: createTaskDto.assignedTo,
      assigned_by: createTaskDto.assignedBy,
      deadline: new Date(createTaskDto.deadline),
      status: status,
      created_at: new Date(),
      updated_at: new Date(),
    });
    
    const savedTask = await this.tasksRepository.save(task);
    
    // Gửi thông báo cho người được giao nhiệm vụ
    if (savedTask.assigned_to !== savedTask.assigned_by) {
      await this.notificationsService.create({
        userId: savedTask.assigned_to,
        title: 'Nhiệm vụ mới',
        content: `Bạn được giao nhiệm vụ mới: ${savedTask.title}`,
        type: NotificationType.TASK
      });
    }
    
    return savedTask;
  }

  async update(id: number, updateTaskDto: UpdateTaskDto): Promise<Task> {
    const task = await this.findOne(id);
    
    // Map status string to enum if provided
    let status = task.status;
    if (updateTaskDto.status) {
      switch (updateTaskDto.status) {
        case 'Pending':
          status = TaskStatus.PENDING;
          break;
        case 'InProgress':
          status = TaskStatus.IN_PROGRESS;
          break;
        case 'Completed':
          status = TaskStatus.COMPLETED;
          break;
        case 'Rejected':
          status = TaskStatus.REJECTED;
          break;
      }
    }
    
    // Create object with updates
    const updatedFields: any = {
      title: updateTaskDto.title || task.title,
      description: updateTaskDto.description || task.description,
      assigned_to: updateTaskDto.assignedTo || task.assigned_to,
      assigned_by: updateTaskDto.assignedBy || task.assigned_by,
      deadline: updateTaskDto.deadline ? new Date(updateTaskDto.deadline) : task.deadline,
      status: status,
      score: updateTaskDto.score !== undefined ? updateTaskDto.score : task.score,
      feedback: updateTaskDto.feedback || task.feedback,
      updated_at: new Date(),
    };
    
    // Kiểm tra xem người được giao nhiệm vụ có thay đổi không
    const isAssigneeChanged = task.assigned_to !== updatedFields.assigned_to;
    
    // Update task
    Object.assign(task, updatedFields);
    const updatedTask = await this.tasksRepository.save(task);
    
    // Gửi thông báo khi người được giao nhiệm vụ thay đổi
    if (isAssigneeChanged) {
      await this.notificationsService.create({
        userId: updatedTask.assigned_to,
        title: 'Nhiệm vụ mới được giao',
        content: `Bạn được giao nhiệm vụ: ${updatedTask.title}`,
        type: NotificationType.TASK
      });
    }
    
    // Gửi thông báo khi trạng thái thay đổi
    if (updateTaskDto.status && task.assigned_to !== task.assigned_by) {
      // Thông báo cho người giao nhiệm vụ khi trạng thái thay đổi
      await this.notificationsService.create({
        userId: updatedTask.assigned_by,
        title: 'Cập nhật trạng thái nhiệm vụ',
        content: `Nhiệm vụ "${updatedTask.title}" đã được chuyển sang trạng thái ${updateTaskDto.status}`,
        type: NotificationType.TASK
      });
    }
    
    return updatedTask;
  }

  async updateStatus(id: number, status: string): Promise<Task> {
    const task = await this.findOne(id);
    
    // Map status string to enum
    let taskStatus: TaskStatus;
    switch (status) {
      case 'Pending':
        taskStatus = TaskStatus.PENDING;
        break;
      case 'InProgress':
        taskStatus = TaskStatus.IN_PROGRESS;
        break;
      case 'Completed':
        taskStatus = TaskStatus.COMPLETED;
        break;
      case 'Rejected':
        taskStatus = TaskStatus.REJECTED;
        break;
      default:
        throw new Error(`Invalid status: ${status}`);
    }
    
    // Lưu trạng thái cũ để so sánh
    const oldStatus = task.status;
    
    // Cập nhật task
    task.status = taskStatus;
    task.updated_at = new Date();
    
    const updatedTask = await this.tasksRepository.save(task);
    
    // Gửi thông báo cho người giao nhiệm vụ khi trạng thái thay đổi
    if (oldStatus !== taskStatus && task.assigned_to !== task.assigned_by) {
      await this.notificationsService.create({
        userId: task.assigned_by,
        title: 'Trạng thái nhiệm vụ đã thay đổi',
        content: `Nhiệm vụ "${task.title}" đã được chuyển sang trạng thái ${status}`,
        type: NotificationType.TASK
      });
    }
    
    // Nếu nhiệm vụ hoàn thành, gửi thông báo chúc mừng cho người thực hiện
    if (taskStatus === TaskStatus.COMPLETED) {
      await this.notificationsService.create({
        userId: task.assigned_to,
        title: 'Nhiệm vụ hoàn thành',
        content: `Chúc mừng! Bạn đã hoàn thành nhiệm vụ "${task.title}"`,
        type: NotificationType.TASK
      });
    }
    
    return updatedTask;
  }

  async provideFeedback(id: number, feedbackDto: FeedbackTaskDto): Promise<Task> {
    const task = await this.findOne(id);
    
    task.status = TaskStatus.COMPLETED;
    task.score = feedbackDto.score;
    task.feedback = feedbackDto.feedback;
    task.updated_at = new Date();
    
    const updatedTask = await this.tasksRepository.save(task);
    
    // Gửi thông báo về phản hồi nhiệm vụ cho người thực hiện
    await this.notificationsService.create({
      userId: task.assigned_to,
      title: 'Phản hồi nhiệm vụ',
      content: `Nhiệm vụ "${task.title}" đã nhận được phản hồi với điểm số ${feedbackDto.score}/100`,
      type: NotificationType.TASK
    });
    
    return updatedTask;
  }

  async remove(id: number): Promise<void> {
    const task = await this.findOne(id);
    
    // Thông báo cho người được giao nhiệm vụ rằng nhiệm vụ đã bị xóa
    if (task.assigned_to !== task.assigned_by) {
      await this.notificationsService.create({
        userId: task.assigned_to,
        title: 'Nhiệm vụ đã bị xóa',
        content: `Nhiệm vụ "${task.title}" đã bị xóa bởi người giao nhiệm vụ`,
        type: NotificationType.TASK
      });
    }
    
    await this.tasksRepository.remove(task);
  }
  
  // Phương thức mới: Thông báo deadline sắp đến hạn
  async notifyUpcomingDeadlines(hoursThreshold: number = 24): Promise<void> {
    const now = new Date();
    const thresholdDate = new Date(now.getTime() + hoursThreshold * 60 * 60 * 1000);
    
    // Tìm các nhiệm vụ chưa hoàn thành và sắp đến hạn
    const upcomingTasks = await this.tasksRepository.find({
      where: [
        { 
          deadline: Between(now, thresholdDate),
          status: Not(TaskStatus.COMPLETED),
          status: Not(TaskStatus.REJECTED)
        }
      ],
      relations: ['assignedToUser', 'assignedByUser']
    });
    
    // Gửi thông báo cho từng người được giao nhiệm vụ
    for (const task of upcomingTasks) {
      const hoursLeft = Math.round((task.deadline.getTime() - now.getTime()) / (60 * 60 * 1000));
      
      await this.notificationsService.create({
        userId: task.assigned_to,
        title: 'Nhiệm vụ sắp đến hạn',
        content: `Nhiệm vụ "${task.title}" sẽ đến hạn trong ${hoursLeft} giờ nữa`,
        type: NotificationType.TASK
      });
    }
  }
  
  // Phương thức mới: Gửi báo cáo tổng hợp nhiệm vụ
  async sendTaskSummary(userId: number): Promise<void> {
    // Lấy danh sách nhiệm vụ của người dùng
    const assignedTasks = await this.findByAssignedTo(userId);
    
    // Tính toán số lượng nhiệm vụ theo trạng thái
    const pendingTasks = assignedTasks.filter(task => task.status === TaskStatus.PENDING).length;
    const inProgressTasks = assignedTasks.filter(task => task.status === TaskStatus.IN_PROGRESS).length;
    const completedTasks = assignedTasks.filter(task => task.status === TaskStatus.COMPLETED).length;
    const totalTasks = assignedTasks.length;
    
    // Nếu có nhiệm vụ, gửi báo cáo tổng hợp
    if (totalTasks > 0) {
      await this.notificationsService.create({
        userId,
        title: 'Báo cáo nhiệm vụ',
        content: `Tổng quan nhiệm vụ của bạn: ${pendingTasks} chưa bắt đầu, ${inProgressTasks} đang thực hiện, ${completedTasks} đã hoàn thành (tổng ${totalTasks} nhiệm vụ)`,
        type: NotificationType.TASK
      });
    }
  }
  
  // Phương thức mới: Gửi lời nhắc về nhiệm vụ đang bị trễ
  async notifyOverdueTasks(): Promise<void> {
    const now = new Date();
    
    // Tìm các nhiệm vụ đã quá hạn nhưng chưa hoàn thành
    const overdueTasks = await this.tasksRepository.find({
      where: [
        { 
          deadline: LessThan(now),
          status: Not(TaskStatus.COMPLETED),
          status: Not(TaskStatus.REJECTED)
        }
      ],
      relations: ['assignedToUser', 'assignedByUser']
    });
    
    // Gửi thông báo cho người được giao nhiệm vụ và người giao nhiệm vụ
    for (const task of overdueTasks) {
      // Thông báo cho người được giao nhiệm vụ
      await this.notificationsService.create({
        userId: task.assigned_to,
        title: 'Nhiệm vụ quá hạn',
        content: `Nhiệm vụ "${task.title}" đã quá hạn. Vui lòng hoàn thành hoặc liên hệ người giao nhiệm vụ.`,
        type: NotificationType.TASK
      });
      
      // Thông báo cho người giao nhiệm vụ (nếu khác người được giao)
      if (task.assigned_by !== task.assigned_to) {
        await this.notificationsService.create({
          userId: task.assigned_by,
          title: 'Nhiệm vụ quá hạn',
          content: `Nhiệm vụ "${task.title}" được giao cho ${task.assignedToUser.full_name} đã quá hạn.`,
          type: NotificationType.TASK
        });
      }
    }
  }
}