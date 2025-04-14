// src/entities/user.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToOne, OneToMany } from 'typeorm';
import { Department } from './department.entity';
import { Profile } from './profile.entity';
import { Task } from './task.entity';
import { Document } from './document.entity';
import { ForumPost } from './forum-post.entity';
import { ForumComment } from './forum-comment.entity';
import { Attendance } from './attendance.entity';

export enum UserRole {
  ADMIN = 'Admin',
  EMPLOYEE = 'Employee',
  TEAM_LEADER = 'TeamLeader',
  SENIOR_MANAGER = 'SeniorManager',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('increment')
  user_id: number;

  @Column({ unique: true })
  cccd: string;

  @Column()
  password: string;

  @Column({ unique: true })
  email: string;

  @Column({ unique: true })
  phone: string;

  @Column()
  full_name: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.EMPLOYEE,
  })
  role: UserRole;

  @Column()
  department_id: number;

  @ManyToOne(() => Department)
  @JoinColumn({ name: 'department_id' })
  department: Department;

  @OneToOne(() => Profile, profile => profile.user)
  profile: Profile;

  @OneToMany(() => Task, task => task.assignedToUser)
  assignedTasks: Task[];

  @OneToMany(() => Task, task => task.assignedByUser)
  createdTasks: Task[];

  @OneToMany(() => Document, document => document.uploader)
  documents: Document[];

  @OneToMany(() => ForumPost, post => post.user)
  posts: ForumPost[];

  @OneToMany(() => ForumComment, comment => comment.user)
  comments: ForumComment[];

  @OneToMany(() => Attendance, attendance => attendance.user)
  attendances: Attendance[];

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updated_at: Date;
}