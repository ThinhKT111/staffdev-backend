// src/profiles/profiles.controller.ts
import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, UseInterceptors, UploadedFile } from '@nestjs/common';
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

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.profilesService.findOne(+id);
  }

  @Get('user/:userId')
  findByUser(@Param('userId') userId: string) {
    return this.profilesService.findByUser(+userId);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  findMyProfile(@Request() req) {
    const userId = req.user.userId;
    return this.profilesService.findByUser(userId);
  }

  @Post()
  create(@Body() createProfileDto: CreateProfileDto, @Request() req) {
    // Use current user if userId not provided
    if (!createProfileDto.userId) {
      createProfileDto.userId = req.user.userId;
    }
    
    return this.profilesService.create(createProfileDto);
  }

  @Post('me/avatar')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('avatar'))
  updateAvatar(
    @Request() req,
    @UploadedFile() file: Express.Multer.File
  ) {
    const userId = req.user.userId;
    return this.profilesService.updateAvatar(userId, file);
  }

  @Post('me/2fa/enable')
  @UseGuards(JwtAuthGuard)
  enable2FA(@Request() req) {
    return this.profilesService.enable2FA(req.user.userId);
  }

  @Post('me/2fa/verify')
  @UseGuards(JwtAuthGuard)
  verify2FA(@Request() req, @Body('token') token: string) {
    return this.profilesService.verify2FA(req.user.userId, token);
  }

  @Post('me/2fa/disable')
  @UseGuards(JwtAuthGuard)
  disable2FA(@Request() req, @Body('token') token: string) {
    return this.profilesService.disable2FA(req.user.userId, token);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateProfileDto: UpdateProfileDto) {
    return this.profilesService.update(+id, updateProfileDto);
  }

  @Patch('user/:userId')
  updateByUser(@Param('userId') userId: string, @Body() updateProfileDto: UpdateProfileDto) {
    return this.profilesService.updateByUserId(+userId, updateProfileDto);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  updateMyProfile(@Request() req, @Body() updateProfileDto: UpdateProfileDto) {
    const userId = req.user.userId;
    return this.profilesService.updateByUserId(userId, updateProfileDto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  remove(@Param('id') id: string) {
    return this.profilesService.remove(+id);
  }
}