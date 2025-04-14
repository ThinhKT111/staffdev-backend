// src/training/training-path/training-path.controller.ts
import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { TrainingPathService } from './training-path.service';
import { CreateTrainingPathDto } from './dto/create-training-path.dto';
import { UpdateTrainingPathDto } from './dto/update-training-path.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../entities/user.entity';

@Controller('training/paths')
@UseGuards(JwtAuthGuard)
export class TrainingPathController {
  constructor(private readonly trainingPathService: TrainingPathService) {}

  @Get()
  findAll() {
    return this.trainingPathService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.trainingPathService.findOne(+id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.TEAM_LEADER)
  create(@Body() createTrainingPathDto: CreateTrainingPathDto, @Request() req) {
    // Set creator to current user if not specified
    if (!createTrainingPathDto.createdBy) {
      createTrainingPathDto.createdBy = req.user.userId;
    }
    
    return this.trainingPathService.create(createTrainingPathDto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.TEAM_LEADER)
  update(@Param('id') id: string, @Body() updateTrainingPathDto: UpdateTrainingPathDto) {
    return this.trainingPathService.update(+id, updateTrainingPathDto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  remove(@Param('id') id: string) {
    return this.trainingPathService.remove(+id);
  }
}