// src/users/users.service.ts
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';

import { Not, Equal } from 'typeorm';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async findAll(): Promise<User[]> {
    return this.usersRepository.find({
      select: ['user_id', 'cccd', 'email', 'phone', 'full_name', 'role', 'department_id', 'created_at', 'updated_at'],
      relations: ['department'],
    });
  }

  async findOne(id: number): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { user_id: id },
      select: ['user_id', 'cccd', 'email', 'phone', 'full_name', 'role', 'department_id', 'created_at', 'updated_at'],
      relations: ['department'],
    });
    
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    
    return user;
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    // Check if user with same cccd, email or phone already exists
    const existingUser = await this.usersRepository.findOne({
      where: [
        { cccd: createUserDto.cccd },
        { email: createUserDto.email },
        { phone: createUserDto.phone },
      ],
    });
    
    if (existingUser) {
      throw new ConflictException('User with the same CCCD, email or phone already exists');
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    
    // Create new user
    const user = this.usersRepository.create({
      cccd: createUserDto.cccd,
      password: hashedPassword,
      email: createUserDto.email,
      phone: createUserDto.phone,
      full_name: createUserDto.fullName,
      role: createUserDto.role || UserRole.EMPLOYEE,
      department_id: createUserDto.departmentId,
    });
    
    await this.usersRepository.save(user);
    
    // Remove password from response
    const { password, ...result } = user;
    return result as User;
  }

  async update(id: number, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);
    
    // Check if email or phone is being updated and already exists for another user
    if (updateUserDto.email || updateUserDto.phone) {
      const existingUser = await this.usersRepository.findOne({
        where: [
          { email: updateUserDto.email, user_id: Not(Equal(id)) },
          { phone: updateUserDto.phone, user_id: Not(id) },
        ],
      });
      
      if (existingUser) {
        throw new ConflictException('Email or phone already in use by another user');
      }
    }
    
    // Update password if provided
    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }
    
    // Update user
    const updatedUser = {
      ...user,
      email: updateUserDto.email || user.email,
      phone: updateUserDto.phone || user.phone,
      full_name: updateUserDto.fullName || user.full_name,
      role: updateUserDto.role || user.role,
      department_id: updateUserDto.departmentId || user.department_id,
      password: updateUserDto.password || user.password,
      updated_at: new Date(),
    };
    
    await this.usersRepository.save(updatedUser);
    
    // Remove password from response
    const { password, ...result } = updatedUser;
    return result as User;
  }

  async remove(id: number): Promise<void> {
    const user = await this.findOne(id);
    await this.usersRepository.remove(user);
  }
}