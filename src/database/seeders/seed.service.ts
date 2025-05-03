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

  async seed(forceReseed: boolean = false) {
    try {
      console.log('Checking existing data...');
      
      // Kiểm tra dữ liệu hiện có
      const userCount = await this.usersRepository.count();
      console.log(`Found ${userCount} users in database`);
      
      // Nếu đã có dữ liệu và không yêu cầu forceReseed, không cần seed thêm
      if (userCount > 0 && !forceReseed) {
        console.log('Database already has data. Skipping seed process.');
        return;
      }
      
      // Nếu forceReseed = true, xóa dữ liệu cũ
      if (forceReseed && userCount > 0) {
        console.log('Force reseed option enabled. Cleaning existing data...');
        try {
          // Xóa dữ liệu theo thứ tự để tránh vi phạm ràng buộc khóa ngoại
          // Lưu ý: Trong thực tế, cần xóa dữ liệu của tất cả các bảng liên quan
          await this.usersRepository.query('TRUNCATE users CASCADE');
          await this.departmentsRepository.query('TRUNCATE departments CASCADE');
          console.log('Existing data cleared successfully');
        } catch (error) {
          console.error('Error clearing existing data:', error.message);
          console.log('Continuing with seed process...');
        }
      }
      
      // Bắt đầu seed dữ liệu
      console.log('Starting seed process...');
      
      // Seed departments
      const departments = [
        { department_name: 'IT' },
        { department_name: 'HR' },
        { department_name: 'Finance' },
        { department_name: 'Marketing' },
        { department_name: 'Sales' }
      ];
      
      const createdDepartments = [];
      for (const dept of departments) {
        const exists = await this.departmentsRepository.findOne({
          where: { department_name: dept.department_name }
        });
        
        if (!exists) {
          const createdDept = await this.departmentsRepository.save(dept);
          createdDepartments.push(createdDept);
          console.log(`Created department: ${dept.department_name}`);
        } else {
          createdDepartments.push(exists);
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
          department_id: createdDepartments[0]?.department_id || 1,
        });
        
        const savedAdmin = await this.usersRepository.save(admin);
        console.log('Created admin user');
        
        // Update department manager to admin
        if (createdDepartments[0]) {
          createdDepartments[0].manager_id = savedAdmin.user_id;
          await this.departmentsRepository.save(createdDepartments[0]);
        }
        
        // Create sample users
        const users = [
          {
            cccd: '034095000124',
            password: hashedPassword,
            email: 'employee@example.com',
            phone: '0912345679',
            full_name: 'Sample Employee',
            role: UserRole.EMPLOYEE,
            department_id: createdDepartments[1]?.department_id || 2,
          },
          {
            cccd: '034095000125',
            password: hashedPassword,
            email: 'manager@example.com',
            phone: '0912345680',
            full_name: 'Sample Manager',
            role: UserRole.TEAM_LEADER,
            department_id: createdDepartments[2]?.department_id || 3,
          }
        ];
        
        for (const userData of users) {
          const user = this.usersRepository.create(userData);
          const savedUser = await this.usersRepository.save(user);
          console.log(`Created user: ${userData.full_name}`);
          
          // Update department manager nếu là TeamLeader
          if (userData.role === UserRole.TEAM_LEADER) {
            const deptIndex = userData.department_id - 1;
            if (createdDepartments[deptIndex]) {
              createdDepartments[deptIndex].manager_id = savedUser.user_id;
              await this.departmentsRepository.save(createdDepartments[deptIndex]);
            }
          }
        }
      }

      console.log('Seed completed successfully!');
      return { success: true, message: 'Database seeded successfully' };
    } catch (error) {
      console.error('Seed error:', error);
      throw error;
    }
  }
}