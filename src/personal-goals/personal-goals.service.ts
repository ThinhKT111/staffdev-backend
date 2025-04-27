// src/personal-goals/personal-goals.service.ts
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task, TaskStatus } from '../entities/task.entity';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';

@Injectable()
export class PersonalGoalsService {
  constructor(
    @InjectRepository(Task)
    private tasksRepository: Repository<Task>,
  ) {}

  async findAllByUser(userId: number): Promise<Task[]> {
    return this.tasksRepository.find({
      where: {
        assigned_to: userId,
        assigned_by: userId,
      },
      order: {
        created_at: 'DESC',
      },
    });
  }

  async findOne(id: number, userId: number): Promise<Task> {
    const task = await this.tasksRepository.findOne({
      where: {
        task_id: id,
        assigned_to: userId,
        assigned_by: userId,
      },
    });
    
    if (!task) {
      throw new NotFoundException('Mục tiêu cá nhân không tồn tại');
    }
    
    return task;
  }

  async create(createGoalDto: CreateGoalDto, userId: number): Promise<Task> {
    // Tạo mục tiêu cá nhân (sử dụng bảng Task)
    const goal = this.tasksRepository.create({
      title: createGoalDto.title,
      description: createGoalDto.description,
      assigned_to: userId, // Gán cho chính người dùng đó
      assigned_by: userId, // Người tạo cũng là người dùng đó
      deadline: new Date(createGoalDto.deadline),
      status: TaskStatus.PENDING,
      created_at: new Date(),
      updated_at: new Date(),
    });
    
    return this.tasksRepository.save(goal);
  }

  async update(id: number, updateGoalDto: UpdateGoalDto, userId: number): Promise<Task> {
    const goal = await this.findOne(id, userId);
    
    // Cập nhật mục tiêu
    if (updateGoalDto.title) goal.title = updateGoalDto.title;
    if (updateGoalDto.description) goal.description = updateGoalDto.description;
    if (updateGoalDto.deadline) goal.deadline = new Date(updateGoalDto.deadline);
    if (updateGoalDto.status) {
      switch (updateGoalDto.status) {
        case 'Pending':
          goal.status = TaskStatus.PENDING;
          break;
        case 'InProgress':
          goal.status = TaskStatus.IN_PROGRESS;
          break;
        case 'Completed':
          goal.status = TaskStatus.COMPLETED;
          break;
        case 'Rejected':
          goal.status = TaskStatus.REJECTED;
          break;
      }
    }
   
    goal.updated_at = new Date();
   
    return this.tasksRepository.save(goal);
  }

  async remove(id: number, userId: number): Promise<void> {
    const goal = await this.findOne(id, userId);
    await this.tasksRepository.remove(goal);
  }
}