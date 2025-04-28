// src/departments/departments.service.ts
import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Department } from '../entities/department.entity';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class DepartmentsService {
  constructor(
    @InjectRepository(Department)
    private departmentsRepository: Repository<Department>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async findAll(): Promise<Department[]> {
    // Kiểm tra cache trước
    const cachedDepartments = await this.cacheManager.get<Department[]>('all_departments');
    
    if (cachedDepartments) {
      return cachedDepartments;
    }

    // Nếu không có trong cache, truy vấn DB
    const departments = await this.departmentsRepository.find({
      relations: ['users'],
    });
    
    // Lưu vào cache với thời gian sống là 1 giờ
    await this.cacheManager.set('all_departments', departments, 3600);
    
    return departments;
  }

  async findOne(id: number): Promise<Department> {
    // Kiểm tra cache trước
    const cacheKey = `department_${id}`;
    const cachedDepartment = await this.cacheManager.get<Department>(cacheKey);
    
    if (cachedDepartment) {
      return cachedDepartment;
    }

    // Nếu không có trong cache, truy vấn DB
    const department = await this.departmentsRepository.findOne({
      where: { department_id: id },
      relations: ['users'],
    });
    
    if (!department) {
      throw new NotFoundException(`Department with ID ${id} not found`);
    }
    
    // Lưu vào cache
    await this.cacheManager.set(cacheKey, department, 3600);
    
    return department;
  }

  async create(createDepartmentDto: CreateDepartmentDto): Promise<Department> {
    const department = this.departmentsRepository.create({
      department_name: createDepartmentDto.departmentName,
      manager_id: createDepartmentDto.managerId,
    });
    
    const savedDepartment = await this.departmentsRepository.save(department);
    
    // Xóa cache danh sách departments khi có department mới
    await this.cacheManager.del('all_departments');
    
    return savedDepartment;
  }

  async update(id: number, updateDepartmentDto: UpdateDepartmentDto): Promise<Department> {
    const department = await this.findOne(id);
    
    // Update department
    const updatedDepartment = {
      ...department,
      department_name: updateDepartmentDto.departmentName || department.department_name,
      manager_id: updateDepartmentDto.managerId || department.manager_id,
    };
    
    const result = await this.departmentsRepository.save(updatedDepartment);
    
    // Xóa các cache liên quan
    await this.cacheManager.del(`department_${id}`);
    await this.cacheManager.del('all_departments');
    
    return result;
  }

  async remove(id: number): Promise<void> {
    const department = await this.findOne(id);
    await this.departmentsRepository.remove(department);
    
    // Xóa các cache liên quan
    await this.cacheManager.del(`department_${id}`);
    await this.cacheManager.del('all_departments');
  }
}