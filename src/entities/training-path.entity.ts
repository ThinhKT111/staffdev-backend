// src/entities/training-path.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Department } from './department.entity';
import { User } from './user.entity';
import { Course } from './course.entity';

export enum DurationType {
  SHORT_TERM = 'ShortTerm',
  LONG_TERM = 'LongTerm',
}

@Entity('training_paths')
export class TrainingPath {
  @PrimaryGeneratedColumn('increment')
  training_path_id: number;

  @Column()
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ nullable: true })
  department_id: number;

  @ManyToOne(() => Department)
  @JoinColumn({ name: 'department_id' })
  department: Department;

  @Column({
    type: 'enum',
    enum: DurationType,
    default: DurationType.SHORT_TERM,
  })
  duration: DurationType;

  @Column()
  created_by: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @Column({ default: 0 })
  total_courses: number;

  @Column({ nullable: true })
  duration_in_weeks: number;

  @Column({ default: true })
  is_active: boolean;

  @OneToMany(() => Course, course => course.trainingPath)
  courses: Course[];

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;
}