// src/database/seeders/seed.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../../entities/user.entity';
import { Department } from '../../entities/department.entity';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class SeedService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Department)
    private departmentsRepository: Repository<Department>,
  ) {}

  async seed() {
    try {
      console.log('Checking existing data...');
      
      // Kiểm tra dữ liệu hiện có
      const userCount = await this.usersRepository.count();
      console.log(`Found ${userCount} users in database`);
      
      // Nếu đã có dữ liệu, không cần seed thêm
      if (userCount > 0) {
        console.log('Database already has data. Skipping seed process.');
        return;
      }
      
      // Nếu không có dữ liệu, thực hiện seed
      console.log('No existing data found. Starting seed process...');
      
      // Seed departments
      const departments = [
        { department_name: 'IT' },
        { department_name: 'HR' },
        { department_name: 'Finance' },
        { department_name: 'Marketing' },
        { department_name: 'Sales' }
      ];
      
      for (const dept of departments) {
        const exists = await this.departmentsRepository.findOne({
          where: { department_name: dept.department_name }
        });
        
        if (!exists) {
          await this.departmentsRepository.save(dept);
          console.log(`Created department: ${dept.department_name}`);
        }
      }
      
      // Seed admin user
      const adminExists = await this.usersRepository.findOne({
        where: { cccd: '034095000123' }
      });
      
      if (!adminExists) {
        // Hash password
        const hashedPassword = await bcrypt.hash('password', 10);
        
        // Create admin user
        const admin = this.usersRepository.create({
          cccd: '034095000123',
          password: hashedPassword,
          email: 'admin@example.com',
          phone: '0912345678',
          full_name: 'Administrator',
          role: UserRole.ADMIN,
          department_id: 1,
        });
        
        await this.usersRepository.save(admin);
        console.log('Created admin user');
        
        // Create sample users
        const users = [
          {
            cccd: '034095000124',
            password: hashedPassword,
            email: 'employee@example.com',
            phone: '0912345679',
            full_name: 'Sample Employee',
            role: UserRole.EMPLOYEE,
            department_id: 2,
          },
          {
            cccd: '034095000125',
            password: hashedPassword,
            email: 'manager@example.com',
            phone: '0912345680',
            full_name: 'Sample Manager',
            role: UserRole.TEAM_LEADER,
            department_id: 3,
          }
        ];
        
        for (const user of users) {
          await this.usersRepository.save(this.usersRepository.create(user));
        }
        console.log('Created sample users');
      }

      console.log('Seed completed successfully!');
    } catch (error) {
      console.error('Seed error:', error);
      throw error;
    }
  }
}