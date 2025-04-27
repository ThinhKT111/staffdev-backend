// src/search/search.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, Between } from 'typeorm';
import { User } from '../entities/user.entity';
import { Course } from '../entities/course.entity';
import { Document } from '../entities/document.entity';
import { ForumPost } from '../entities/forum-post.entity';
import { ForumComment } from '../entities/forum-comment.entity';
import { Task } from '../entities/task.entity';

@Injectable()
export class SearchService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
    
    @InjectRepository(Document)
    private documentRepository: Repository<Document>,
    
    @InjectRepository(ForumPost)
    private forumPostRepository: Repository<ForumPost>,
    
    @InjectRepository(ForumComment)
    private forumCommentRepository: Repository<ForumComment>,
    
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
  ) {}

  async search(
    query: string,
    type?: string,
    departmentId?: number,
    startDate?: string,
    endDate?: string
  ): Promise<any> {
    const results: any = {};
    const searchTerm = `%${query}%`;
    
    // Xây dựng các điều kiện tìm kiếm
    const dateCondition = {};
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59);
      dateCondition['created_at'] = Between(start, end);
    }
    
    // Tìm kiếm theo loại nếu được chỉ định
    if (!type || type === 'users') {
      const usersCondition: any = { 
        full_name: Like(searchTerm)
      };
      
      if (departmentId) {
        usersCondition.department_id = departmentId;
      }
      
      results.users = await this.userRepository.find({
        where: usersCondition,
        relations: ['department'],
        take: 10,
      });
    }
    
    if (!type || type === 'courses') {
      results.courses = await this.courseRepository.find({
        where: {
          title: Like(searchTerm),
          ...dateCondition,
        },
        relations: ['trainingPath'],
        take: 10,
      });
    }
    
    if (!type || type === 'documents') {
      const documentsCondition: any = { 
        title: Like(searchTerm),
        ...dateCondition
      };
      
      results.documents = await this.documentRepository.find({
        where: documentsCondition,
        relations: ['uploader'],
        take: 10,
      });
    }
    
    if (!type || type === 'forum') {
      results.forumPosts = await this.forumPostRepository.find({
        where: {
          title: Like(searchTerm),
          ...dateCondition,
        },
        relations: ['user'],
        take: 10,
      });
    }
    
    if (!type || type === 'tasks') {
      const tasksCondition: any = { 
        title: Like(searchTerm),
        ...dateCondition
      };
      
      results.tasks = await this.taskRepository.find({
        where: tasksCondition,
        relations: ['assignedToUser', 'assignedByUser'],
        take: 10,
      });
    }
    
    return {
      query,
      type,
      departmentId,
      dateRange: startDate && endDate ? { startDate, endDate } : null,
      results
    };
  }

  // Các phương thức tìm kiếm cụ thể cho từng loại
  async searchUsers(query: string): Promise<User[]> {
    return this.userRepository.find({
      where: [
        { full_name: Like(`%${query}%`) },
        { email: Like(`%${query}%`) },
        { phone: Like(`%${query}%`) }
      ],
      relations: ['department'],
      take: 20,
    });
  }

  async searchCourses(query: string): Promise<Course[]> {
    return this.courseRepository.find({
      where: [
        { title: Like(`%${query}%`) },
        { description: Like(`%${query}%`) }
      ],
      relations: ['trainingPath'],
      take: 20,
    });
  }

  async searchDocuments(query: string, category?: string): Promise<Document[]> {
    const condition: any = [
      { title: Like(`%${query}%`) }
    ];
    
    if (category) {
      condition.push({ category });
    }
    
    return this.documentRepository.find({
      where: condition,
      relations: ['uploader'],
      take: 20,
    });
  }

  async searchForum(query: string): Promise<any> {
    const posts = await this.forumPostRepository.find({
      where: [
        { title: Like(`%${query}%`) },
        { content: Like(`%${query}%`) }
      ],
      relations: ['user'],
      take: 10,
    });
    
    const comments = await this.forumCommentRepository.find({
      where: { content: Like(`%${query}%`) },
      relations: ['user', 'post'],
      take: 10,
    });
    
    return { posts, comments };
  }
}