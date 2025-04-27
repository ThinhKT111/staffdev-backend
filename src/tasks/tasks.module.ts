// src/tasks/tasks.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { Task } from '../entities/task.entity';
import { TaskReminderService } from './task-reminder.service';
import { Notification } from '../entities/notification.entity';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Task, Notification]),
    ScheduleModule.forRoot(),
    NotificationsModule,
  ],
  providers: [TasksService, TaskReminderService],
  controllers: [TasksController]
})
export class TasksModule {}