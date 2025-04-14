// src/entities/course.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { TrainingPath } from './training-path.entity';
import { UserCourse } from './user-course.entity';
import { Assignment } from './assignment.entity';

export enum CourseType {
  ONLINE = 'Online',
  OFFLINE = 'Offline',
  VIDEO = 'Video',
  DOCUMENT = 'Document',
}

export enum CourseLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
}

@Entity('training_courses')
export class Course {
  @PrimaryGeneratedColumn('increment')
  course_id: number;

  @Column()
  training_path_id: number;

  @ManyToOne(() => TrainingPath)
  @JoinColumn({ name: 'training_path_id' })
  trainingPath: TrainingPath;

  @Column()
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({
    type: 'enum',
    enum: CourseType,
    default: CourseType.ONLINE,
  })
  type: CourseType;

  @Column()
  duration_hours: number;

  @Column({
    type: 'enum',
    enum: CourseLevel,
    nullable: true,
  })
  level: CourseLevel;

  @Column({ default: 0 })
  total_lessons: number;

  @Column({ default: true })
  is_active: boolean;

  @OneToMany(() => UserCourse, userCourse => userCourse.course)
  userCourses: UserCourse[];

  @OneToMany(() => Assignment, assignment => assignment.course)
  assignments: Assignment[];

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;
}