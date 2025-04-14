// src/entities/user-course.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { Course } from './course.entity';

export enum CourseStatus {
  NOT_STARTED = 'NotStarted',
  IN_PROGRESS = 'InProgress',
  COMPLETED = 'Completed',
}

@Entity('user_courses')
export class UserCourse {
  @PrimaryGeneratedColumn('increment')
  user_course_id: number;

  @Column()
  user_id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  course_id: number;

  @ManyToOne(() => Course)
  @JoinColumn({ name: 'course_id' })
  course: Course;

  @Column({
    type: 'enum',
    enum: CourseStatus,
    default: CourseStatus.NOT_STARTED,
  })
  status: CourseStatus;

  @Column({ type: 'timestamp', nullable: true })
  completion_date: Date;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  score: number;
}