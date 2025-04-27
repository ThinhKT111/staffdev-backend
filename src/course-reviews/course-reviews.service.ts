// src/course-reviews/course-reviews.service.ts
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ForumPost } from '../entities/forum-post.entity';
import { UserCourse } from '../entities/user-course.entity';
import { Course } from '../entities/course.entity';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class CourseReviewsService {
  constructor(
    @InjectRepository(ForumPost)
    private forumPostRepository: Repository<ForumPost>,
    
    @InjectRepository(UserCourse)
    private userCourseRepository: Repository<UserCourse>,
    
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
  ) {}

  async findByCourse(courseId: number): Promise<any> {
    // Kiểm tra khóa học tồn tại
    const course = await this.courseRepository.findOne({
      where: { course_id: courseId }
    });
    
    if (!course) {
      throw new NotFoundException('Khóa học không tồn tại');
    }
    
    // Tìm tất cả bài đánh giá (bài post trên forum có tiêu đề bắt đầu bằng "Review: [tên khóa học]")
    const reviewPosts = await this.forumPostRepository.find({
      where: { title: `Review: ${course.title}%` },
      relations: ['user'],
      order: { created_at: 'DESC' }
    });
    
    // Lấy điểm số từ UserCourses
    const userCourses = await this.userCourseRepository.find({
      where: {
        course_id: courseId,
        status: 'Completed'
      },
      relations: ['user']
    });
    
    // Tính điểm trung bình
    const totalScores = userCourses.reduce((sum, uc) => sum + (uc.score || 0), 0);
    const averageScore = userCourses.length > 0 ? totalScores / userCourses.length : 0;
    
    // Kết hợp đánh giá (từ posts) và điểm số (từ userCourses)
    const reviews = reviewPosts.map(post => {
      // Tìm điểm số tương ứng
      const userCourse = userCourses.find(uc => uc.user_id === post.user_id);
      
      return {
        id: post.post_id,
        courseId,
        userId: post.user_id,
        userName: post.user.full_name,
        title: post.title,
        review: post.content,
        score: userCourse?.score || null,
        date: post.created_at
      };
    });
    
    return {
      courseId,
      courseTitle: course.title,
      averageScore,
      reviewCount: reviews.length,
      completionCount: userCourses.length,
      reviews
    };
  }

  async create(createReviewDto: CreateReviewDto, userId: number): Promise<any> {
    // Kiểm tra người dùng đã hoàn thành khóa học chưa
    const userCourse = await this.userCourseRepository.findOne({
      where: {
        course_id: createReviewDto.courseId,
        user_id: userId
      },
      relations: ['course']
    });
    
    if (!userCourse) {
      throw new BadRequestException('Bạn chưa đăng ký khóa học này');
    }
    
    if (userCourse.status !== 'Completed') {
      throw new BadRequestException('Bạn chưa hoàn thành khóa học này');
    }
    
    // Kiểm tra đã đánh giá chưa
    const existingReview = await this.forumPostRepository.findOne({
      where: {
        title: `Review: ${userCourse.course.title}`,
        user_id: userId
      }
    });
    
    if (existingReview) {
      throw new BadRequestException('Bạn đã đánh giá khóa học này rồi');
    }
    
    // Tạo bài đánh giá (sử dụng ForumPost)
    const review = this.forumPostRepository.create({
      title: `Review: ${userCourse.course.title}`,
      content: createReviewDto.review,
      user_id: userId,
      created_at: new Date(),
      updated_at: new Date()
    });
    
    const savedReview = await this.forumPostRepository.save(review);
    
    // Cập nhật điểm số trong UserCourse nếu người dùng chưa có điểm
    if (!userCourse.score && createReviewDto.score) {
      userCourse.score = createReviewDto.score;
      await this.userCourseRepository.save(userCourse);
    }
    
    return {
      id: savedReview.post_id,
      courseId: createReviewDto.courseId,
      userId,
      review: savedReview.content,
      score: createReviewDto.score || userCourse.score,
      date: savedReview.created_at
    };
  }
}