// src/profiles/profiles.service.ts
import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Profile } from '../entities/profile.entity';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';
import { User } from '../entities/user.entity';
import { FileUploadService } from '../shared/file-upload.service';

@Injectable()
export class ProfilesService {
  constructor(
    @InjectRepository(Profile)
    private profilesRepository: Repository<Profile>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private fileUploadService: FileUploadService
  ) {}

  async findAll(): Promise<Profile[]> {
    // Sử dụng QueryBuilder có thể giúp TypeScript hiểu rõ hơn về kiểu trả về
    const profiles = await this.profilesRepository
      .createQueryBuilder('profile')
      .leftJoinAndSelect('profile.user', 'user')
      .getMany();
    
    return profiles;
  }

  async findOne(id: number): Promise<Profile> {
    const profile = await this.profilesRepository.findOne({
      where: { profile_id: id },
      relations: ['user'],
    });
    
    if (!profile) {
      throw new NotFoundException(`Profile with ID ${id} not found`);
    }
    
    return profile;
  }

  async findByUser(userId: number): Promise<Profile> {
    // Đảm bảo userId là số nguyên hợp lệ
    if (userId === undefined || userId === null || isNaN(userId)) {
      throw new BadRequestException(`Invalid user ID: ${userId}`);
    }
    
    const profile = await this.profilesRepository.findOne({
      where: { user_id: userId },
      relations: ['user'],
    });
    
    if (!profile) {
      throw new NotFoundException(`Profile for user ID ${userId} not found`);
    }
    
    return profile;
  }

  async create(createProfileDto: CreateProfileDto): Promise<Profile> {
    // Đảm bảo userId là số nguyên hợp lệ
    const userId = Number(createProfileDto.userId);
    if (isNaN(userId)) {
      throw new BadRequestException(`Invalid user ID: ${createProfileDto.userId}`);
    }
    
    // Sử dụng kiểu any để tránh lỗi DeepPartial
    const profileData: any = {
      user_id: userId,
      date_of_birth: createProfileDto.dateOfBirth ? new Date(createProfileDto.dateOfBirth) : undefined,
      address: createProfileDto.address,
      experience: createProfileDto.experience,
      skills: createProfileDto.skills,
      avatar_url: createProfileDto.avatarUrl,
      updated_at: new Date()
    };
    
    // Loại bỏ các trường undefined
    Object.keys(profileData).forEach(key => {
      if (profileData[key] === undefined) {
        delete profileData[key];
      }
    });
    
    const profile = this.profilesRepository.create(profileData);
    
    // Sử dụng as để ép kiểu trả về
    return this.profilesRepository.save(profile) as unknown as Profile;
  }

  async update(id: number, updateProfileDto: UpdateProfileDto): Promise<Profile> {
    const profile = await this.findOne(id);
    
    Object.assign(profile, {
      date_of_birth: updateProfileDto.dateOfBirth ? new Date(updateProfileDto.dateOfBirth) : profile.date_of_birth,
      address: updateProfileDto.address !== undefined ? updateProfileDto.address : profile.address,
      experience: updateProfileDto.experience !== undefined ? updateProfileDto.experience : profile.experience,
      skills: updateProfileDto.skills !== undefined ? updateProfileDto.skills : profile.skills,
      avatar_url: updateProfileDto.avatarUrl !== undefined ? updateProfileDto.avatarUrl : profile.avatar_url,
      updated_at: new Date(),
    });
    
    return this.profilesRepository.save(profile);
  }

  async updateByUserId(userId: number, updateProfileDto: UpdateProfileDto): Promise<Profile> {
    // Đảm bảo userId là số nguyên hợp lệ
    if (userId === undefined || userId === null) {
      throw new BadRequestException('User ID không được để trống');
    }
    
    const userIdNumber = Number(userId);
    if (isNaN(userIdNumber)) {
      throw new BadRequestException(`User ID không phải là số hợp lệ: ${userId}`);
    }
    
    const profile = await this.findByUser(userIdNumber);
    return this.update(profile.profile_id, updateProfileDto);
  }

  async updateAvatar(userId: number, file: Express.Multer.File): Promise<Profile> {
    // Đảm bảo userId là số nguyên hợp lệ
    if (userId === undefined || userId === null || isNaN(userId)) {
      throw new BadRequestException(`Invalid user ID: ${userId}`);
    }
    
    const profile = await this.findByUser(userId);
    
    // Xóa avatar cũ nếu có
    if (profile.avatar_url) {
      try {
        await this.fileUploadService.removeFile(profile.avatar_url);
      } catch (error) {
        console.error('Không thể xóa avatar cũ:', error);
      }
    }
    
    // Upload avatar mới
    const avatarPath = await this.fileUploadService.saveFile(file, 'avatars');
    
    // Cập nhật đường dẫn avatar trong database
    profile.avatar_url = avatarPath;
    profile.updated_at = new Date();
    
    return this.profilesRepository.save(profile);
  }

  async remove(id: number): Promise<void> {
    const profile = await this.findOne(id);
    await this.profilesRepository.remove(profile);
  }

  async enable2FA(userId: number): Promise<any> {
    // Đảm bảo userId là số nguyên hợp lệ
    if (userId === undefined || userId === null || isNaN(userId)) {
      throw new BadRequestException(`Invalid user ID: ${userId}`);
    }
    
    const profile = await this.findByUser(userId);
    
    // Tạo secret key
    const secret = authenticator.generateSecret();
    
    // Lưu secret key vào profile (sử dụng trường skills để lưu)
    const twoFAData = JSON.stringify({
      secret,
      enabled: false, // Chưa bật cho đến khi người dùng xác nhận
    });
    
    profile.skills = `2FA:${twoFAData}|${profile.skills || ''}`;
    await this.profilesRepository.save(profile);
    
    // Lấy thông tin người dùng
    const user = await this.userRepository.findOne({ where: { user_id: userId } });
    const email = user?.email || `user${userId}`;
    
    // Tạo URL cho QR code
    const otpauth = authenticator.keyuri(email, 'StaffDev', secret);
    
    // Tạo QR code
    const qrCodeImage = await QRCode.toDataURL(otpauth);
    
    return {
      secret,
      qrCodeImage,
      message: 'Quét mã QR này với ứng dụng Google Authenticator hoặc Authy'
    };
  }
  
  async verify2FA(userId: number, token: string): Promise<boolean> {
    // Đảm bảo userId là số nguyên hợp lệ
    if (userId === undefined || userId === null || isNaN(userId)) {
      throw new BadRequestException(`Invalid user ID: ${userId}`);
    }
    
    const profile = await this.findByUser(userId);
    
    // Lấy secret key từ profile
    if (!profile.skills || !profile.skills.includes('2FA:')) {
      throw new BadRequestException('Tính năng 2FA chưa được thiết lập');
    }
    
    // Cải thiện regex để bắt đúng định dạng JSON trong chuỗi skills
    const match = profile.skills.match(/2FA:({.*?})/);
    if (!match || !match[1]) {
      throw new BadRequestException('Dữ liệu 2FA không hợp lệ');
    }
    
    try {
      // Xử lý chuỗi JSON an toàn hơn
      let twoFAData;
      try {
        twoFAData = JSON.parse(match[1]);
      } catch (e) {
        throw new BadRequestException('Dữ liệu 2FA không phải định dạng JSON hợp lệ');
      }
      
      if (!twoFAData.secret) {
        throw new BadRequestException('Secret key không tồn tại trong dữ liệu 2FA');
      }
      
      const { secret } = twoFAData;
      
      // Đảm bảo token là chuỗi và chỉ chứa số
      if (!token || typeof token !== 'string' || !/^\d+$/.test(token)) {
        throw new BadRequestException('Token không hợp lệ');
      }
      
      // Xác thực token
      const isValid = authenticator.verify({ token, secret });
      
      // Nếu đây là lần xác thực đầu tiên, bật 2FA
      if (isValid && !twoFAData.enabled) {
        twoFAData.enabled = true;
        const updatedSkills = profile.skills.replace(match[0], `2FA:${JSON.stringify(twoFAData)}`);
        profile.skills = updatedSkills;
        await this.profilesRepository.save(profile);
      }
      
      return isValid;
    } catch (error) {
      // Ghi log lỗi
      console.error('Lỗi xác thực 2FA:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Lỗi xác thực token');
    }
  }
  
  async disable2FA(userId: number, token: string): Promise<any> {
    // Đảm bảo userId là số nguyên hợp lệ
    if (userId === undefined || userId === null || isNaN(userId)) {
      throw new BadRequestException(`Invalid user ID: ${userId}`);
    }
    
    const profile = await this.findByUser(userId);
    
    // Xác thực token trước khi tắt 2FA
    const isValid = await this.verify2FA(userId, token);
    if (!isValid) {
      throw new UnauthorizedException('Mã xác thực không hợp lệ');
    }
    
    // Xóa dữ liệu 2FA
    profile.skills = profile.skills.replace(/2FA:({.*?})\|?/, '');
    await this.profilesRepository.save(profile);
    
    return { message: 'Đã tắt xác thực hai yếu tố' };
  }
}