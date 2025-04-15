// src/assignments/assignments.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Assignment } from '../entities/assignment.entity';
import { Submission } from '../entities/submission.entity';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';
import { CreateSubmissionDto } from './dto/create-submission.dto';

@Injectable()
export class AssignmentsService {
  constructor(
    @InjectRepository(Assignment)
    private assignmentRepository: Repository<Assignment>,
    
    @InjectRepository(Submission)
    private submissionRepository: Repository<Submission>,
  ) {}

  async findAll(): Promise<Assignment[]> {
    return this.assignmentRepository.find({
      relations: ['course'],
      order: { deadline: 'ASC' },
    });
  }

  async findByCourse(courseId: number): Promise<Assignment[]> {
    return this.assignmentRepository.find({
      where: { course_id: courseId },
      relations: ['course'],
      order: { deadline: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Assignment> {
    const assignment = await this.assignmentRepository.findOne({
      where: { assignment_id: id },
      relations: ['course'],
    });
    
    if (!assignment) {
      throw new NotFoundException(`Assignment with ID ${id} not found`);
    }
    
    return assignment;
  }

  async create(createAssignmentDto: CreateAssignmentDto): Promise<Assignment> {
    const assignment = this.assignmentRepository.create({
      title: createAssignmentDto.title,
      description: createAssignmentDto.description,
      course_id: createAssignmentDto.courseId,
      max_submissions: createAssignmentDto.maxSubmissions,
      deadline: new Date(createAssignmentDto.deadline),
      created_at: new Date(),
    });
    
    return this.assignmentRepository.save(assignment);
  }

  async update(id: number, updateAssignmentDto: UpdateAssignmentDto): Promise<Assignment> {
    const assignment = await this.findOne(id);
    
    // Update assignment
    Object.assign(assignment, {
      title: updateAssignmentDto.title || assignment.title,
      description: updateAssignmentDto.description || assignment.description,
      course_id: updateAssignmentDto.courseId || assignment.course_id,
      max_submissions: updateAssignmentDto.maxSubmissions !== undefined ? updateAssignmentDto.maxSubmissions : assignment.max_submissions,
      deadline: updateAssignmentDto.deadline ? new Date(updateAssignmentDto.deadline) : assignment.deadline,
    });
    
    return this.assignmentRepository.save(assignment);
  }

  async remove(id: number): Promise<void> {
    const assignment = await this.findOne(id);
    await this.assignmentRepository.remove(assignment);
  }

  // Submissions
  async getSubmissions(assignmentId: number): Promise<Submission[]> {
    // Check if assignment exists
    await this.findOne(assignmentId);
    
    return this.submissionRepository.find({
      where: { assignment_id: assignmentId },
      relations: ['user'],
      order: { submitted_at: 'DESC' },
    });
  }

  async getUserSubmission(assignmentId: number, userId: number): Promise<Submission> {
    const submission = await this.submissionRepository.findOne({
      where: { assignment_id: assignmentId, user_id: userId },
      relations: ['assignment', 'user'],
    });
    
    if (!submission) {
      throw new NotFoundException(`Submission not found for this user and assignment`);
    }
    
    return submission;
  }

  async submitAssignment(createSubmissionDto: CreateSubmissionDto): Promise<Submission> {
    // Check if assignment exists
    const assignment = await this.findOne(createSubmissionDto.assignmentId);
    
    // Check if deadline has passed
    if (new Date() > assignment.deadline) {
      throw new BadRequestException('Deadline has passed for this assignment');
    }
    
    // Check if max submissions reached
    const submissionCount = await this.submissionRepository.count({
      where: { 
        assignment_id: createSubmissionDto.assignmentId,
        user_id: createSubmissionDto.userId 
      },
    });
    
    if (submissionCount >= assignment.max_submissions) {
      throw new BadRequestException(`Maximum submission count (${assignment.max_submissions}) reached`);
    }
    
    // Create submission
    const submission = this.submissionRepository.create({
      assignment_id: createSubmissionDto.assignmentId,
      user_id: createSubmissionDto.userId,
      submission_content: createSubmissionDto.submissionContent,
      testcase_passed: createSubmissionDto.testcasePassed,
      total_testcases: createSubmissionDto.totalTestcases,
      submitted_at: new Date(),
    });
    
    return this.submissionRepository.save(submission);
  }
}