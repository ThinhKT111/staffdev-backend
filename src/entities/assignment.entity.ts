// src/entities/assignment.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Course } from './course.entity';
import { Submission } from './submission.entity';

@Entity('assignments')
export class Assignment {
  @PrimaryGeneratedColumn('increment')
  assignment_id: number;

  @Column()
  course_id: number;

  @ManyToOne(() => Course)
  @JoinColumn({ name: 'course_id' })
  course: Course;

  @Column()
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column()
  max_submissions: number;

  @Column({ type: 'timestamp' })
  deadline: Date;

  @OneToMany(() => Submission, submission => submission.assignment)
  submissions: Submission[];

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;
}