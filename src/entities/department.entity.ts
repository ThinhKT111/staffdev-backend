// src/entities/department.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { User } from './user.entity';
import { TrainingPath } from './training-path.entity';

@Entity('departments')
export class Department {
  @PrimaryGeneratedColumn('increment')
  department_id: number;

  @Column()
  department_name: string;

  @Column({ nullable: true })
  manager_id: number;

  @OneToMany(() => User, user => user.department)
  users: User[];

  @OneToMany(() => TrainingPath, trainingPath => trainingPath.department)
  trainingPaths: TrainingPath[];
}