// src/entities/attendance.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

export enum LeaveType {
  ANNUAL = 'Annual',
  SICK = 'Sick',
  UNPAID = 'Unpaid',
}

export enum AttendanceStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity('attendance')
export class Attendance {
  @PrimaryGeneratedColumn('increment')
  attendance_id: number;

  @Column()
  user_id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'timestamp', nullable: true })
  check_in: Date;

  @Column({ type: 'timestamp', nullable: true })
  check_out: Date;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  overtime_hours: number;

  @Column({ 
    type: 'enum', 
    enum: LeaveType,
    nullable: true 
  })
  leave_type: LeaveType;

  @Column({ type: 'date', nullable: true })
  leave_date: Date;

  @Column({ 
    type: 'enum', 
    enum: AttendanceStatus,
    nullable: true 
  })
  status: AttendanceStatus;

  @Column({ type: 'text', nullable: true })
  note: string;
}