// src/profiles/profiles.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Profile } from '../entities/profile.entity';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class ProfilesService {
  constructor(
    @InjectRepository(Profile)
    private profilesRepository: Repository<Profile>,
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
    // Sử dụng kiểu any để tránh lỗi DeepPartial
    const profileData: any = {
      user_id: createProfileDto.userId,
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
    const profile = await this.findByUser(userId);
    return this.update(profile.profile_id, updateProfileDto);
  }

  async remove(id: number): Promise<void> {
    const profile = await this.findOne(id);
    await this.profilesRepository.remove(profile);
  }
}