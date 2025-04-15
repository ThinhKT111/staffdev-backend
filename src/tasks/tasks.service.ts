// src/tasks/tasks.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task, TaskStatus } from '../entities/task.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { FeedbackTaskDto } from './dto/feedback-task.dto';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private tasksRepository: Repository<Task>,
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
    
    return this.tasksRepository.save(task);
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
    
    // Update task
    Object.assign(task, {
      title: updateTaskDto.title || task.title,
      description: updateTaskDto.description || task.description,
      assigned_to: updateTaskDto.assignedTo || task.assigned_to,
      assigned_by: updateTaskDto.assignedBy || task.assigned_by,
      deadline: updateTaskDto.deadline ? new Date(updateTaskDto.deadline) : task.deadline,
      status: status,
      score: updateTaskDto.score !== undefined ? updateTaskDto.score : task.score,
      feedback: updateTaskDto.feedback || task.feedback,
      updated_at: new Date(),
    });
    
    return this.tasksRepository.save(task);
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
    
    task.status = taskStatus;
    task.updated_at = new Date();
    
    return this.tasksRepository.save(task);
  }

  async provideFeedback(id: number, feedbackDto: FeedbackTaskDto): Promise<Task> {
    const task = await this.findOne(id);
    
    task.status = TaskStatus.COMPLETED;
    task.score = feedbackDto.score;
    task.feedback = feedbackDto.feedback;
    task.updated_at = new Date();
    
    return this.tasksRepository.save(task);
  }

  async remove(id: number): Promise<void> {
    const task = await this.findOne(id);
    await this.tasksRepository.remove(task);
  }
}