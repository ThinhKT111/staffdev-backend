// src/auth/auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async validateUser(cccd: string, password: string): Promise<any> {
    const user = await this.usersRepository.findOne({ 
      where: { cccd } 
    });
    
    if (!user) {
      return null;
    }
    
    // Kiểm tra cả hai loại mật khẩu: MD5 (từ SQL script) và bcrypt
    
    // Kiểm tra mật khẩu dạng MD5
    const md5Hash = crypto.createHash('md5').update(password).digest('hex');
    const isValidMd5 = user.password === md5Hash;
    
    // Kiểm tra mật khẩu dạng bcrypt
    let isValidBcrypt = false;
    try {
      isValidBcrypt = await bcrypt.compare(password, user.password);
    } catch (e) {
      // Nếu lỗi khi so sánh bcrypt, bỏ qua (có thể mật khẩu không phải dạng bcrypt)
      isValidBcrypt = false;
    }
    
    if (isValidMd5 || isValidBcrypt) {
      const { password, ...result } = user;
      return result;
    }
    
    return null;
  }

  async login(user: any) {
    const payload = { 
      sub: user.user_id, 
      cccd: user.cccd,
      role: user.role 
    };
    
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.user_id,
        cccd: user.cccd,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        departmentId: user.department_id
      }
    };
  }
}