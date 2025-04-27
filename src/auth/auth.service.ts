// src/auth/auth.service.ts
import { BadRequestException, ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../entities/user.entity';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { CreateUserDto } from './dto/create-user.dto';
import { Document } from '../entities/document.entity';
import { Profile } from '../entities/profile.entity';
import { ProfilesService } from '../profiles/profiles.service';
import { Notification } from '../entities/notification.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Document)
    private documentsRepository: Repository<Document>,
    @InjectRepository(Profile)
    private profileRepository: Repository<Profile>,
    @InjectRepository(Notification)
    private notificationsRepository: Repository<Notification>,
    private jwtService: JwtService,
    private profileService: ProfilesService,
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

  async changePassword(userId: number, currentPassword: string, newPassword: string) {
    const user = await this.usersRepository.findOne({ where: { user_id: userId } });
    
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }
    
    // Kiểm tra mật khẩu hiện tại
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Mật khẩu hiện tại không đúng');
    }
    
    // Hash mật khẩu mới
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    
    // Cập nhật mật khẩu
    user.password = hashedNewPassword;
    user.updated_at = new Date();
    
    await this.usersRepository.save(user);
    
    return { message: 'Mật khẩu đã được thay đổi thành công' };
  }

  async recordDeviceLogin(userId: number, deviceId: string, deviceName: string): Promise<void> {
    // Sử dụng bảng Notifications để lưu thông tin đăng nhập
    const content = `Đăng nhập từ thiết bị: ${deviceName} (${deviceId})`;
    
    await this.notificationsRepository.save({
      user_id: userId,
      title: 'Đăng nhập thành công',
      content,
      type: 'General',
      is_read: true,
      created_at: new Date()
    });
  }

  async forgotPassword(email: string) {
    // Tìm người dùng theo email
    const user = await this.usersRepository.findOne({ where: { email } });
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng với email này');
    }
    
    // Tạo token ngẫu nhiên
    const token = crypto.randomBytes(32).toString('hex');
    
    // Lưu token vào bảng Documents (category = 'reset_password')
    const document = this.documentsRepository.create({
      title: `Reset password token for user ${user.user_id}`,
      file_url: token, // Sử dụng file_url để lưu token
      category: 'reset_password',
      uploaded_by: user.user_id,
      uploaded_at: new Date(),
    });
    
    await this.documentsRepository.save(document);
    
    // TODO: Gửi email với link reset password (thay thế bằng trả về token cho demo)
    return { message: 'Yêu cầu đặt lại mật khẩu đã được gửi', token };
  }

  async resetPassword(token: string, newPassword: string) {
    // Tìm token trong bảng Documents
    const document = await this.documentsRepository.findOne({
      where: { 
        file_url: token,
        category: 'reset_password'
      },
      relations: ['uploader']
    });
    
    if (!document) {
      throw new NotFoundException('Token không hợp lệ');
    }
    
    // Kiểm tra token có quá hạn không (1 giờ)
    const tokenCreationTime = new Date(document.uploaded_at).getTime();
    const currentTime = new Date().getTime();
    const oneHourInMs = 60 * 60 * 1000;
    
    if (currentTime - tokenCreationTime > oneHourInMs) {
      await this.documentsRepository.remove(document);
      throw new BadRequestException('Token đã hết hạn');
    }
    
    // Lấy người dùng
    const user = document.uploader;
    
    // Cập nhật mật khẩu
    user.password = await bcrypt.hash(newPassword, 10);
    user.updated_at = new Date();
    
    await this.usersRepository.save(user);
    
    // Xóa token sau khi sử dụng
    await this.documentsRepository.remove(document);
    
    return { message: 'Mật khẩu đã được cập nhật thành công' };
  }

  async register(createUserDto: CreateUserDto) {
    // Kiểm tra xem đã tồn tại user có cccd, email hoặc phone này chưa
    const existingUser = await this.usersRepository.findOne({
      where: [
        { cccd: createUserDto.cccd },
        { email: createUserDto.email },
        { phone: createUserDto.phone },
      ],
    });
    
    if (existingUser) {
      throw new ConflictException('CCCD, email hoặc số điện thoại đã được sử dụng');
    }
    
    // Hash mật khẩu
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    
    // Tạo tài khoản người dùng mới (mặc định là Employee)
    const role = createUserDto.role || UserRole.EMPLOYEE;
    
    // Tạo người dùng mới
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
    
    const savedUser = await this.usersRepository.save(user);
    
    // Tạo profile cho người dùng
    const profile = this.profileRepository.create({
      user_id: savedUser.user_id,
      updated_at: new Date()
    });
    
    await this.profileRepository.save(profile);
    
    // Không trả về mật khẩu
    const { password, ...result } = savedUser;
    return result;
  }

  async login(user: any, token2FA?: string) {
    // Kiểm tra xem người dùng có bật 2FA không
    const profile = await this.profileRepository.findOne({
      where: { user_id: user.user_id }
    });
    
    const has2FA = profile?.skills && profile.skills.includes('2FA:') && 
      profile.skills.includes('"enabled":true');
    
    if (has2FA && !token2FA) {
      // Yêu cầu mã 2FA
      return {
        requires2FA: true,
        userId: user.user_id,
        message: 'Vui lòng nhập mã xác thực từ ứng dụng 2FA'
      };
    }
    
    if (has2FA && token2FA) {
      // Xác thực 2FA
      const isValid = await this.profileService.verify2FA(user.user_id, token2FA);
      if (!isValid) {
        throw new UnauthorizedException('Mã xác thực 2FA không hợp lệ');
      }
    }
    
    // Đăng nhập thành công, tạo JWT
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
        departmentId: user.department_id,
        has2FA
      }
    };
  }
}