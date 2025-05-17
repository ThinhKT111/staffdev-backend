import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../app.module';
import { AuthService } from '../auth/auth.service';
import { UsersService } from '../users/users.service';

describe('Authentication (e2e)', () => {
  let app: INestApplication;
  let authService: AuthService;
  let usersService: UsersService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    authService = moduleFixture.get<AuthService>(AuthService);
    usersService = moduleFixture.get<UsersService>(UsersService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Login', () => {
    it('should login successfully with valid credentials', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'admin@example.com',
          password: 'password'
        })
        .expect(200)
        .expect(res => {
          expect(res.body).toHaveProperty('access_token');
          expect(res.body).toHaveProperty('user');
          expect(res.body.user.email).toBe('admin@example.com');
          expect(res.body.user.role).toBe('Admin');
        });
    });

    it('should fail with invalid credentials', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'admin@example.com',
          password: 'wrongpassword'
        })
        .expect(401);
    });
  });

  describe('Register', () => {
    it('should register a new user successfully', () => {
      const newUser = {
        cccd: 'CCCD0000009999',
        email: 'newuser@example.com',
        password: 'password123',
        phone: '0900009999',
        full_name: 'New User',
        role: 'Employee',
        department_id: 1
      };

      return request(app.getHttpServer())
        .post('/auth/register')
        .send(newUser)
        .expect(201)
        .expect(res => {
          expect(res.body).toHaveProperty('user_id');
          expect(res.body.email).toBe(newUser.email);
          expect(res.body.role).toBe(newUser.role);
        });
    });

    it('should fail to register with existing email', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          cccd: 'CCCD0000009998',
          email: 'admin@example.com', // Existing email
          password: 'password123',
          phone: '0900009998',
          full_name: 'Duplicate User',
          role: 'Employee',
          department_id: 1
        })
        .expect(400);
    });
  });

  describe('Profile Management', () => {
    let authToken: string;
    let userId: number;

    beforeAll(async () => {
      // Login to get token
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'employee1@example.com',
          password: 'password'
        });
      
      authToken = loginResponse.body.access_token;
      userId = loginResponse.body.user.user_id;
    });

    it('should get user profile', () => {
      return request(app.getHttpServer())
        .get(`/users/profile/${userId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect(res => {
          expect(res.body).toHaveProperty('profile_id');
          expect(res.body).toHaveProperty('date_of_birth');
          expect(res.body).toHaveProperty('skills');
        });
    });

    it('should update user profile', () => {
      const updateData = {
        date_of_birth: '1995-01-01',
        address: 'New Address',
        skills: 'JavaScript, React, Node.js'
      };

      return request(app.getHttpServer())
        .patch(`/users/profile/${userId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200)
        .expect(res => {
          expect(res.body.address).toBe(updateData.address);
          expect(res.body.skills).toBe(updateData.skills);
        });
    });
  });

  describe('Attendance Management', () => {
    let authToken: string;
    let userId: number;

    beforeAll(async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'employee1@example.com',
          password: 'password'
        });
      
      authToken = loginResponse.body.access_token;
      userId = loginResponse.body.user.user_id;
    });

    it('should record check-in', () => {
      return request(app.getHttpServer())
        .post('/attendance/check-in')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201)
        .expect(res => {
          expect(res.body).toHaveProperty('attendance_id');
          expect(res.body.check_in).toBeDefined();
        });
    });

    it('should record check-out', () => {
      return request(app.getHttpServer())
        .post('/attendance/check-out')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect(res => {
          expect(res.body.check_out).toBeDefined();
        });
    });

    it('should request leave', () => {
      const leaveRequest = {
        leave_type: 'Annual',
        leave_date: '2025-05-01',
        note: 'Personal leave'
      };

      return request(app.getHttpServer())
        .post('/attendance/leave-request')
        .set('Authorization', `Bearer ${authToken}`)
        .send(leaveRequest)
        .expect(201)
        .expect(res => {
          expect(res.body.leave_type).toBe(leaveRequest.leave_type);
          expect(res.body.status).toBe('pending');
        });
    });
  });

  describe('Training Management', () => {
    let authToken: string;
    let userId: number;

    beforeAll(async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'employee1@example.com',
          password: 'password'
        });
      
      authToken = loginResponse.body.access_token;
      userId = loginResponse.body.user.user_id;
    });

    it('should get available courses', () => {
      return request(app.getHttpServer())
        .get('/training/courses')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect(res => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(0);
        });
    });

    it('should enroll in a course', () => {
      return request(app.getHttpServer())
        .post('/training/enroll/1') // Enroll in course with ID 1
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201)
        .expect(res => {
          expect(res.body.status).toBe('NotStarted');
          expect(res.body.user_id).toBe(userId);
        });
    });

    it('should get enrolled courses', () => {
      return request(app.getHttpServer())
        .get('/training/enrolled-courses')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect(res => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });
  });

  describe('Task Management', () => {
    let authToken: string;
    let userId: number;

    beforeAll(async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'teamleader@example.com',
          password: 'password'
        });
      
      authToken = loginResponse.body.access_token;
      userId = loginResponse.body.user.user_id;
    });

    it('should create a new task', () => {
      const newTask = {
        title: 'Test Task',
        description: 'Test Description',
        assigned_to: 4, // employee1
        deadline: '2025-05-30T00:00:00Z'
      };

      return request(app.getHttpServer())
        .post('/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newTask)
        .expect(201)
        .expect(res => {
          expect(res.body.title).toBe(newTask.title);
          expect(res.body.status).toBe('Pending');
        });
    });

    it('should get assigned tasks', () => {
      return request(app.getHttpServer())
        .get('/tasks/assigned')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect(res => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });

    it('should update task status', () => {
      return request(app.getHttpServer())
        .patch('/tasks/1/status')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'InProgress' })
        .expect(200)
        .expect(res => {
          expect(res.body.status).toBe('InProgress');
        });
    });
  });
}); 