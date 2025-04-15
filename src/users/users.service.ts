// src/users/users.service.ts
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, Equal } from 'typeorm';
import { User, UserRole } from '../entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';

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

  async findByCccd(cccd: string): Promise<User | undefined> {
    return this.usersRepository.findOne({
      where: { cccd },
    });
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
    
    // Map role string to enum
    let role: UserRole;
    if (createUserDto.role) {
      role = createUserDto.role;
    } else {
      role = UserRole.EMPLOYEE; // Default role
    }
    
    // Create new user
    const user = this.usersRepository.create({
      cccd: createUserDto.cccd,
      password: hashedPassword,
      email: createUserDto.email,
      phone: createUserDto.phone,
      full_name: createUserDto.fullName,
      role: role,
      department_id: createUserDto.departmentId,
      created_at: new Date(),
      updated_at: new Date(),
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
          updateUserDto.email ? { email: updateUserDto.email, user_id: Not(Equal(id)) } : undefined,
          updateUserDto.phone ? { phone: updateUserDto.phone, user_id: Not(Equal(id)) } : undefined,
        ].filter(Boolean),
      });
      
      if (existingUser) {
        throw new ConflictException('Email or phone already in use by another user');
      }
    }
    
    // Update password if provided
    let password = user.password;
    if (updateUserDto.password) {
      password = await bcrypt.hash(updateUserDto.password, 10);
    }
    
    // Map role string to enum if provided
    let role = user.role;
    if (updateUserDto.role) {
      role = updateUserDto.role as UserRole;
    }
    
    // Update user
    Object.assign(user, {
      email: updateUserDto.email || user.email,
      phone: updateUserDto.phone || user.phone,
      full_name: updateUserDto.fullName || user.full_name,
      role: role,
      department_id: updateUserDto.departmentId || user.department_id,
      password: password,
      updated_at: new Date(),
    });
    
    await this.usersRepository.save(user);
    
    // Remove password from response
    const { password: _, ...result } = user;
    return result as User;
  }

  async remove(id: number): Promise<void> {
    const user = await this.findOne(id);
    await this.usersRepository.remove(user);
  }
}