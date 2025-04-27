// src/personal-goals/personal-goals.controller.ts
import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { PersonalGoalsService } from './personal-goals.service';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('personal-goals')
@UseGuards(JwtAuthGuard)
export class PersonalGoalsController {
  constructor(private readonly personalGoalsService: PersonalGoalsService) {}

  @Get()
  findAll(@Request() req) {
    return this.personalGoalsService.findAllByUser(req.user.userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.personalGoalsService.findOne(+id, req.user.userId);
  }

  @Post()
  create(@Body() createGoalDto: CreateGoalDto, @Request() req) {
    return this.personalGoalsService.create(createGoalDto, req.user.userId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateGoalDto: UpdateGoalDto, @Request() req) {
    return this.personalGoalsService.update(+id, updateGoalDto, req.user.userId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.personalGoalsService.remove(+id, req.user.userId);
  }
}