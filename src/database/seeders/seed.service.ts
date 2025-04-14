// src/database/seeders/seed.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../../entities/user.entity';
import { Department } from '../../entities/department.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class SeedService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Department)
    private departmentsRepository: Repository<Department>,
  ) {}

  async seed() {
    // Seed departments
    const departmentsCount = await this.departmentsRepository.count();
    if (departmentsCount === 0) {
      const departments = [
        { department_name: 'IT' },
        { department_name: 'HR' },
        { department_name: 'Finance' },
        { department_name: 'Marketing' },
        { department_name: 'Sales' }
      ];
      
      await this.departmentsRepository.save(departments);
      console.log('Departments seeded successfully');
    }

    // Seed admin user
    const userCount = await this.usersRepository.count();
    if (userCount === 0) {
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
      
      await this.usersRepository.save(users);
      console.log('Users seeded successfully');
    }
  }
}