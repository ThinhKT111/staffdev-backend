// src/assignments/assignments.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssignmentsService } from './assignments.service';
import { AssignmentsController } from './assignments.controller';
import { Assignment } from '../entities/assignment.entity';
import { Submission } from '../entities/submission.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Assignment, Submission])],
  providers: [AssignmentsService],
  controllers: [AssignmentsController],
})
export class AssignmentsModule {}