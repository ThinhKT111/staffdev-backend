import { Controller, Get } from '@nestjs/common';
import { InjectConnection } from '@nestjs/typeorm';
import { Connection } from 'typeorm';

@Controller('database')
export class DatabaseController {
  constructor(@InjectConnection() private connection: Connection) {}

  @Get('test')
  async testConnection() {
    try {
      const result = await this.connection.query('SELECT NOW()');
      return {
        status: 'success',
        message: 'Database connection successful',
        timestamp: result[0].now,
      };
    } catch (error) {
      return {
        status: 'error',
        message: 'Database connection failed',
        error: error.message,
      };
    }
  }
}