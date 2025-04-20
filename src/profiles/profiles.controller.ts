// src/profiles/profiles.controller.ts
import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { ProfilesService } from './profiles.service';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../entities/user.entity';

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

  @Post()
  create(@Body() createProfileDto: CreateProfileDto, @Request() req) {
    // Use current user if userId not provided
    if (!createProfileDto.userId) {
      createProfileDto.userId = req.user.userId;
    }
    
    return this.profilesService.create(createProfileDto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateProfileDto: UpdateProfileDto) {
    return this.profilesService.update(+id, updateProfileDto);
  }

  @Patch('user/:userId')
  updateByUser(@Param('userId') userId: string, @Body() updateProfileDto: UpdateProfileDto) {
    return this.profilesService.updateByUserId(+userId, updateProfileDto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  remove(@Param('id') id: string) {
    return this.profilesService.remove(+id);
  }
}