// src/profiles/profiles.controller.ts
import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { ProfilesService } from './profiles.service';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../entities/user.entity';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('profiles')
@UseGuards(JwtAuthGuard)
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  findAll() {
    return this.profilesService.findAll(); // Đảm bảo kiểu trả về được hiểu là Profile[]
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  findMyProfile(@Request() req) {
    // Lấy userId từ JWT payload và chuyển đổi thành số nguyên
    const userId = req.user.userId || req.user.sub;
    
    // Chắc chắn rằng userId là số nguyên hợp lệ
    if (!userId) {
      throw new BadRequestException('User ID không hợp lệ');
    }
    
    const userIdNumber = Number(userId);
    if (isNaN(userIdNumber)) {
      throw new BadRequestException('User ID không phải là số hợp lệ');
    }
    
    return this.profilesService.findByUser(userIdNumber);
  }

  @Get('user/:userId')
  findByUser(@Param('userId') userId: string) {
    const userIdNumber = Number(userId);
    if (isNaN(userIdNumber)) {
      throw new BadRequestException(`User ID không phải là số hợp lệ: ${userId}`);
    }
    return this.profilesService.findByUser(userIdNumber);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  updateMyProfile(@Request() req, @Body() updateProfileDto: UpdateProfileDto) {
    const userId = req.user.userId || req.user.sub;
    
    if (!userId) {
      throw new BadRequestException('User ID không tồn tại trong token');
    }
    
    const userIdNumber = Number(userId);
    if (isNaN(userIdNumber)) {
      throw new BadRequestException(`User ID không phải là số hợp lệ: ${userId}`);
    }
    
    // In user ID for debugging
    console.log(`Updating profile for user ID: ${userIdNumber} (type: ${typeof userIdNumber})`);
    
    return this.profilesService.updateByUserId(userIdNumber, updateProfileDto);
  }

  @Patch('user/:userId')
  updateByUser(@Param('userId') userId: string, @Body() updateProfileDto: UpdateProfileDto) {
    const userIdNumber = Number(userId);
    if (isNaN(userIdNumber)) {
      throw new BadRequestException(`User ID không phải là số hợp lệ: ${userId}`);
    }
    return this.profilesService.updateByUserId(userIdNumber, updateProfileDto);
  }

  @Post('me/avatar')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('avatar'))
  updateAvatar(
    @Request() req,
    @UploadedFile() file: Express.Multer.File
  ) {
    const userId = req.user.userId || req.user.sub;
    
    if (!userId) {
      throw new BadRequestException('User ID không hợp lệ');
    }
    
    const userIdNumber = Number(userId);
    if (isNaN(userIdNumber)) {
      throw new BadRequestException(`User ID không phải là số hợp lệ: ${userId}`);
    }
    
    return this.profilesService.updateAvatar(userIdNumber, file);
  }

  @Post('me/2fa/enable')
  @UseGuards(JwtAuthGuard)
  enable2FA(@Request() req) {
    const userId = req.user.userId || req.user.sub;
    
    if (!userId) {
      throw new BadRequestException('User ID không hợp lệ');
    }
    
    const userIdNumber = Number(userId);
    if (isNaN(userIdNumber)) {
      throw new BadRequestException(`User ID không phải là số hợp lệ: ${userId}`);
    }
    
    return this.profilesService.enable2FA(userIdNumber);
  }

  @Post('me/2fa/verify')
  @UseGuards(JwtAuthGuard)
  verify2FA(@Request() req, @Body('token') token: string) {
    const userId = req.user.userId || req.user.sub;
    
    if (!userId) {
      throw new BadRequestException('User ID không hợp lệ');
    }
    
    const userIdNumber = Number(userId);
    if (isNaN(userIdNumber)) {
      throw new BadRequestException(`User ID không phải là số hợp lệ: ${userId}`);
    }
    
    return this.profilesService.verify2FA(userIdNumber, token);
  }

  @Post('me/2fa/disable')
  @UseGuards(JwtAuthGuard)
  disable2FA(@Request() req, @Body('token') token: string) {
    const userId = req.user.userId || req.user.sub;
    
    if (!userId) {
      throw new BadRequestException('User ID không hợp lệ');
    }
    
    const userIdNumber = Number(userId);
    if (isNaN(userIdNumber)) {
      throw new BadRequestException(`User ID không phải là số hợp lệ: ${userId}`);
    }
    
    return this.profilesService.disable2FA(userIdNumber, token);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    const idNumber = Number(id);
    if (isNaN(idNumber)) {
      throw new BadRequestException(`ID không phải là số hợp lệ: ${id}`);
    }
    return this.profilesService.findOne(idNumber);
  }

  @Post()
  create(@Body() createProfileDto: CreateProfileDto, @Request() req) {
    // Use current user if userId not provided
    if (!createProfileDto.userId) {
      const userId = req.user.userId || req.user.sub;
      
      if (!userId) {
        throw new BadRequestException('User ID không hợp lệ');
      }
      
      const userIdNumber = Number(userId);
      if (isNaN(userIdNumber)) {
        throw new BadRequestException(`User ID không phải là số hợp lệ: ${userId}`);
      }
      
      createProfileDto.userId = userIdNumber;
    }
    
    return this.profilesService.create(createProfileDto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateProfileDto: UpdateProfileDto) {
    const idNumber = Number(id);
    if (isNaN(idNumber)) {
      throw new BadRequestException(`ID không phải là số hợp lệ: ${id}`);
    }
    return this.profilesService.update(idNumber, updateProfileDto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  remove(@Param('id') id: string) {
    const idNumber = Number(id);
    if (isNaN(idNumber)) {
      throw new BadRequestException(`ID không phải là số hợp lệ: ${id}`);
    }
    return this.profilesService.remove(idNumber);
  }
}