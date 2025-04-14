// src/departments/departments.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Department } from '../entities/department.entity';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

@Injectable()
export class DepartmentsService {
  constructor(
    @InjectRepository(Department)
    private departmentsRepository: Repository<Department>,
  ) {}

  async findAll(): Promise<Department[]> {
    return this.departmentsRepository.find({
      relations: ['users'],
    });
  }

  async findOne(id: number): Promise<Department> {
    const department = await this.departmentsRepository.findOne({
      where: { department_id: id },
      relations: ['users'],
    });
    
    if (!department) {
      throw new NotFoundException(`Department with ID ${id} not found`);
    }
    
    return department;
  }

  async create(createDepartmentDto: CreateDepartmentDto): Promise<Department> {
    const department = this.departmentsRepository.create({
      department_name: createDepartmentDto.departmentName,
      manager_id: createDepartmentDto.managerId,
    });
    
    return this.departmentsRepository.save(department);
  }

  async update(id: number, updateDepartmentDto: UpdateDepartmentDto): Promise<Department> {
    const department = await this.findOne(id);
    
    // Update department
    const updatedDepartment = {
      ...department,
      department_name: updateDepartmentDto.departmentName || department.department_name,
      manager_id: updateDepartmentDto.managerId || department.manager_id,
    };
    
    return this.departmentsRepository.save(updatedDepartment);
  }

  async remove(id: number): Promise<void> {
    const department = await this.findOne(id);
    await this.departmentsRepository.remove(department);
  }
}