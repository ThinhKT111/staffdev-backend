// src/entities/submission.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Assignment } from './assignment.entity';
import { User } from './user.entity';

@Entity('submissions')
export class Submission {
  @PrimaryGeneratedColumn('increment')
  submission_id: number;

  @Column()
  assignment_id: number;

  @ManyToOne(() => Assignment)
  @JoinColumn({ name: 'assignment_id' })
  assignment: Assignment;

  @Column()
  user_id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'text' })
  submission_content: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  submitted_at: Date;

  @Column({ nullable: true })
  testcase_passed: number;

  @Column({ nullable: true })
  total_testcases: number;
}